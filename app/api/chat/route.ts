import { z } from 'zod';
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from 'ai';
import { billingService } from '@/lib/billing';
import { NextResponse } from 'next/server';
import { performWebSearch, formatSearchResults } from '@/lib/search-tool';
import { prisma } from '@/lib/prisma';
import { createModelAdapter, getDefaultModelConfig } from '@/lib/model-adapter';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { messages, userId, conversationId, webSearch, modelId }: {
      messages: UIMessage[];
      userId?: string;
      conversationId?: string;
      webSearch?: boolean;
      modelId?: string;
    } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required for billing tracking' },
        { status: 401 }
      );
    }

    // Get model configuration
    let modelConfig;
    if (modelId) {
      // User selected a specific model
      const dbModel = await prisma.aiModel.findFirst({
        where: {
          id: modelId,
          OR: [
            { isPreset: true },
            { createdBy: userId },
          ],
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          provider: true,
          apiKey: true,
          apiEndpoint: true,
          isPreset: true,
        }
      });

      if (!dbModel) {
        return NextResponse.json(
          { error: 'Model not found or not accessible' },
          { status: 404 }
        );
      }

      modelConfig = {
        provider: dbModel.provider,
        name: dbModel.name,
        apiKey: dbModel.apiKey,
        apiEndpoint: dbModel.apiEndpoint,
        isPreset: dbModel.isPreset,
      };
    } else {
      // Use default model
      modelConfig = getDefaultModelConfig();
    }

    const provider = modelConfig.provider;
    const modelName = modelConfig.name;
    const isPresetModel = modelConfig.isPreset;

    // Only check billing for non-preset models
    if (!isPresetModel) {
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
    }

    let actualInputTokens = 0;
    let actualOutputTokens = 0;

    // 构建工具集合
    const tools: any = {
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
    };

    // 如果启用了联网搜索，添加搜索工具
    if (webSearch) {
      tools.webSearch = tool({
        description: 'Search the web for current information, news, facts, or any information that requires up-to-date knowledge. Use this when you need to find recent information or verify facts.',
        inputSchema: z.object({
          query: z.string().describe('The search query to look up on the web'),
        }),
        execute: async ({ query }) => {
          try {
            const searchResults = await performWebSearch(query, 5);
            return formatSearchResults(searchResults);
          } catch (error) {
            return `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      });
    }

    // Create model adapter based on configuration
    const model = createModelAdapter(modelConfig);

    const result = streamText({
      model,
      system: webSearch
        ? 'You are a helpful assistant with web search capabilities. When users ask questions that require current information, use the webSearch tool to find up-to-date information. Always cite your sources when using web search results. Output in markdown format.'
        : 'You are a helpful assistant. output in markdown format.',
      messages: convertToModelMessages(messages),
      abortSignal: AbortSignal.timeout(30000),
      tools,
      stopWhen: stepCountIs(5),
      onFinish: async (result) => {
        // Skip billing for preset models
        if (isPresetModel) {
          return;
        }

        try {
          actualInputTokens = (result.usage as any)?.promptTokens || 0;
          actualOutputTokens = (result.usage as any)?.completionTokens || 0;

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