import { createDeepSeek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from 'ai';
import { billingService } from '@/lib/billing';
import { NextResponse } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const deepSeek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});
const languageModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const { messages, userId, conversationId }: { 
      messages: UIMessage[]; 
      userId?: string;
      conversationId?: string;
    } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required for billing tracking' },
        { status: 401 }
      );
    }

    const provider = 'deepseek';
    const modelName = languageModel;

    const estimatedInputTokens = messages.reduce((acc, msg) => {
      const content = JSON.stringify(msg);
      return acc + (content.length / 4);
    }, 0);
    const estimatedOutputTokens = 1000;

    const estimatedCost = await billingService.calculateCost(
      provider,
      modelName,
      {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens
      }
    );

    const usageCheck = await billingService.checkUsageLimit(userId, estimatedCost.totalCost);
    if (!usageCheck.canProceed) {
      return NextResponse.json(
        { 
          error: 'Usage limit exceeded',
          reason: usageCheck.reason,
          billing: usageCheck.userBilling
        },
        { status: 429 }
      );
    }

    let actualInputTokens = 0;
    let actualOutputTokens = 0;

    const result = streamText({
      model: deepSeek(languageModel),
      system: 'You are a helpful assistant. output in markdown format.',
      messages: convertToModelMessages(messages),
      abortSignal: AbortSignal.timeout(30000),
      tools: {
        weather: tool({
          description: 'Get the weather in a location',
          inputSchema: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          }),
        }),
      },
      stopWhen: stepCountIs(5),
      onFinish: async (result) => {
        try {
          actualInputTokens = (result.usage as any)?.promptTokens || estimatedInputTokens;
          actualOutputTokens = (result.usage as any)?.completionTokens || estimatedOutputTokens;

          const actualUsage = {
            inputTokens: actualInputTokens,
            outputTokens: actualOutputTokens,
            totalTokens: actualInputTokens + actualOutputTokens
          };

          const actualCost = await billingService.calculateCost(
            provider,
            modelName,
            actualUsage
          );

          await billingService.recordUsage({
            userId,
            conversationId,
            modelName,
            provider,
            usage: actualUsage,
            cost: actualCost,
            endpoint: '/api/chat',
            requestDuration: Date.now() - startTime,
            requestMetadata: {
              messageCount: messages.length,
              hasTools: true,
              system: 'You are a helpful assistant. output in markdown format.'
            },
            responseMetadata: {
              finishReason: result.finishReason,
              usage: result.usage
            }
          });
        } catch (error) {
          console.error('Error recording usage:', error);
        }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}