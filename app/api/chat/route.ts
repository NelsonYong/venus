import { convertToModelMessages, stepCountIs, streamText, UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createModelAdapter, getDefaultModelConfig } from '@/lib/model-adapter';
import { buildTools } from '@/lib/chat/tools';
import { checkBillingLimit, recordBillingUsage } from '@/lib/chat/billing-checker';
import { saveMessages } from '@/lib/chat/message-saver';
import { compressContext, truncateMessages } from '@/lib/chat/context-compressor';
import { getCompressedContext } from '@/lib/redis';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;
const maxTokens = 32000;

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
      // User selected a specific model - find it in discovered models
      const discoveredModel = await prisma.discoveredModel.findFirst({
        where: {
          modelId: modelId,
          isEnabled: true,
          provider: {
            userId: userId,
            status: "ACTIVE",
          },
        },
        include: {
          provider: true,
        },
      });

      if (!discoveredModel) {
        return NextResponse.json(
          { error: 'Model not found or not accessible' },
          { status: 404 }
        );
      }

      modelConfig = {
        provider: discoveredModel.provider.provider,
        name: discoveredModel.modelName,
        apiKey: discoveredModel.provider.apiKey,
        apiEndpoint: discoveredModel.provider.apiEndpoint,
        isPreset: false,
      };
    } else {
      // Use default model
      modelConfig = getDefaultModelConfig();
    }

    const provider = modelConfig.provider;
    const modelName = modelConfig.name;
    const isPresetModel = modelConfig.isPreset;

    // Check billing for non-preset models
    if (!isPresetModel) {
      const usageCheck = await checkBillingLimit({
        userId,
        messages,
        provider,
        modelName,
      });

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

    // Context compression logic
    let processedMessages = messages;
    let systemPrompt = 'you are a helpful assistant that uses ReAct (Reasoning and Acting) decision-making pattern to solve problems systematically.';

    if (conversationId) {
      try {
        // Check if we already have compressed context from previous request
        const compressedContext = await getCompressedContext(conversationId);

        if (compressedContext) {
          // Inject compressed context into system prompt
          systemPrompt = `${systemPrompt}

Previous conversation summary:
${compressedContext}

Use this summary as context for the current conversation.`;

          // Truncate messages to keep only recent ones up to last user message
          processedMessages = truncateMessages(messages, 10);
        }
      } catch (error) {
        console.error('Error loading compressed context:', error);
        // Fall back to original messages if loading fails
      }
    }

    // Build tools
    const tools = buildTools({ webSearch });

    // Create model adapter based on configuration
    const model = createModelAdapter(modelConfig);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: convertToModelMessages(processedMessages),
      abortSignal: AbortSignal.timeout(60000),
      tools,
      // 确保工具调用被启用 - 设置为 'auto' 让模型自动决定何时使用工具
      toolChoice: 'auto',
      // ReAct 模式通常需要多个步骤：思考 -> 行动 -> 观察 -> 思考 -> 回答
      // 使用 stopWhen 控制最大步骤数，支持完整的 ReAct 循环
      stopWhen: stepCountIs(10),
      onFinish: async (result) => {
        // 调试：记录实际执行的步骤数
        // const stepCount = (result as any).steps?.length || 0;
        // const toolCalls = (result as any).toolCalls || [];
        // console.log('✅ ReAct 执行完成:', {
        //   steps: stepCount,
        //   toolCalls: toolCalls.length,
        //   finishReason: result.finishReason,
        // });

        // Check if compression is needed based on actual token usage
        if (conversationId && userId) {
          try {
            const usage = result.usage;
            const actualTotalTokens = usage?.totalTokens || 0;

            // If total tokens exceed threshold, compress context for next request
            if (actualTotalTokens > maxTokens) {
              await compressContext(messages, conversationId, userId);
            }
          } catch (error) {
            console.error('Error checking compression:', error);
          }
        }

        // Record billing usage for non-preset models
        if (!isPresetModel) {
          try {
            const usage = result.usage;
            const promptTokens = usage?.inputTokens || 0;
            const completionTokens = usage?.outputTokens || 0;

            await recordBillingUsage({
              userId,
              conversationId,
              provider,
              modelName,
              promptTokens,
              completionTokens,
              startTime,
              messageCount: messages.length,
              finishReason: result.finishReason,
              usage: {
                inputTokens: usage?.inputTokens || 0,
                outputTokens: usage?.outputTokens || 0,
                totalTokens: usage?.totalTokens || 0,
                cachedInputTokens: usage?.cachedInputTokens || 0,
                reasoningTokens: usage?.reasoningTokens || 0,
              },
            });
          } catch (error) {
            console.error('Error recording usage:', error);
          }
        }

        // Save messages to database
        if (conversationId && userId) {
          try {
            const lastUserMessage = messages[messages.length - 1];
            await saveMessages({
              conversationId,
              userId,
              lastUserMessage,
              assistantResponse: result.text,
            });
          } catch (error) {
            console.error('Error saving messages:', error);
          }
        }
      }
    });


    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      messageMetadata: ({ part }) => {
        // Send model info when streaming starts
        if (part.type === 'start') {
          return {
            createdAt: Date.now(),
            model: modelName,
            provider: provider,
          };
        }
        // Send token usage when streaming completes
        if (part.type === 'finish') {
          return {
            totalTokens: part.totalUsage.totalTokens,
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            reasoningTokens: part.totalUsage.reasoningTokens,
            cachedInputTokens: part.totalUsage.cachedInputTokens,
            maxTokens,
          };
        }
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}