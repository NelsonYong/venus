import { UIMessage, convertToModelMessages, stepCountIs, streamText } from 'ai';
import { createModelAdapter } from '@/lib/model-adapter';
import { buildTools } from '@/lib/chat/tools';
import { recordBillingUsage } from '@/lib/chat/billing-checker';
import { saveMessages } from '@/lib/chat/message-saver';
import { compressContext } from '@/lib/chat/context-compressor';
import { type Citation } from '@/lib/search-tool';
import { UploadedAttachment } from '../utils/message-processor';

const MAX_TOKENS = 32000;

interface StreamHandlerParams {
  messages: UIMessage[];
  userId: string;
  conversationId?: string;
  modelConfig: any;
  systemPrompt: string;
  webSearch: boolean;
  startTime: number;
  uploadedAttachments?: UploadedAttachment[];
}

/**
 * Handle streaming text generation
 */
export async function handleStreamText({
  messages,
  userId,
  conversationId,
  modelConfig,
  systemPrompt,
  webSearch,
  startTime,
  uploadedAttachments,
}: StreamHandlerParams) {
  const provider = modelConfig.provider;
  const modelName = modelConfig.name;
  const isPresetModel = modelConfig.isPreset;

  // Build tools
  const tools = buildTools({ webSearch, enableThinking: true });

  // Create model adapter based on configuration
  const model = createModelAdapter(modelConfig);

  // Collect all citations
  const allCitations: Citation[] = [];

  const result = streamText({
    model,
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    abortSignal: AbortSignal.timeout(600000),
    tools,
    // Enable tool calling - set to 'auto' to let model decide when to use tools
    toolChoice: 'auto',
    // ReAct pattern needs multiple steps: Think -> Act -> Observe -> Think -> Answer
    // Use stopWhen to control max steps for complete ReAct loop
    stopWhen: stepCountIs(20),
    onStepFinish: async ({ toolResults }) => {
      // Collect citations when tool calls complete
      toolResults?.forEach((toolResult: any) => {
        if (toolResult.toolName === 'webSearch' && toolResult.output) {
          // Access output field (not result)
          const output = toolResult.output as { text: string; citations: Citation[] };
          if (output?.citations && output.citations.length > 0) {
            console.log(`📚 收集到 ${output.citations.length} 个引用`);
            // Add to total citations list (avoid duplicates)
            output.citations.forEach((citation) => {
              if (!allCitations.find(c => c.url === citation.url)) {
                allCitations.push(citation);
              }
            });
          }
        }
      });
    },
    onFinish: async (result) => {
      // Check if compression is needed based on actual token usage
      if (conversationId && userId) {
        try {
          const usage = result.usage;
          const actualTotalTokens = usage?.totalTokens || 0;

          // If total tokens exceed threshold, compress context for next request
          if (actualTotalTokens > MAX_TOKENS) {
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

          // Debug: log the result to see what we're getting
          console.log('💾 Saving message - result.text length:', result.text?.length || 0);
          console.log('💾 Has tool calls:', result.toolCalls?.length || 0);
          console.log('💾 Response steps:', result.response?.messages?.length || 0);

          // If result.text is empty but we have response, there might be tool calls
          // We still want to save the message
          const responseText = result.text || '';

          await saveMessages({
            conversationId,
            userId,
            lastUserMessage,
            assistantResponse: responseText,
            citations: allCitations.length > 0 ? allCitations : undefined,
            uploadedAttachments: uploadedAttachments,
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
          isFinished: false,
        };
      }
      // Send token usage and citations when streaming completes
      if (part.type === 'finish') {
        return {
          totalTokens: part.totalUsage.totalTokens,
          inputTokens: part.totalUsage.inputTokens,
          outputTokens: part.totalUsage.outputTokens,
          reasoningTokens: part.totalUsage.reasoningTokens,
          cachedInputTokens: part.totalUsage.cachedInputTokens,
          maxTokens: MAX_TOKENS,
          // Add citations data
          citations: allCitations.length > 0 ? allCitations : undefined,
          isFinished: true,
        };
      }
    },
  });
}
