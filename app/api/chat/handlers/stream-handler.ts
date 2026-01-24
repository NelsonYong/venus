import { UIMessage, streamText, stepCountIs, convertToModelMessages } from 'ai'
import { buildTools } from '@/lib/chat/tools'
import { recordBillingUsage } from '@/lib/chat/billing-checker'
import { saveMessages } from '@/lib/chat/message-saver'
import { compressContext } from '@/lib/chat/context-compressor'
import { type Citation } from '@/lib/search-tool'
import { type ResolvedModel } from '@/lib/providers'
import { type UploadedAttachment } from '../utils/message-processor'

const MAX_TOKENS = 32000

interface StreamHandlerParams {
  messages: UIMessage[]
  userId: string
  conversationId?: string
  resolved: ResolvedModel
  systemPrompt: string
  webSearch: boolean
  startTime: number
  uploadedAttachments?: UploadedAttachment[]
}

export async function handleStreamText({
  messages,
  userId,
  conversationId,
  resolved,
  systemPrompt,
  webSearch,
  startTime,
  uploadedAttachments,
}: StreamHandlerParams) {
  const { model, provider, modelName, isPreset } = resolved

  const tools = buildTools({ webSearch })
  const allCitations: Citation[] = []

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    abortSignal: AbortSignal.timeout(600000),
    tools,
    toolChoice: 'auto',
    stopWhen: stepCountIs(20),
    onStepFinish: async ({ toolResults }) => {
      toolResults?.forEach((toolResult: any) => {
        if (toolResult.toolName === 'webSearch' && toolResult.output) {
          const output = toolResult.output as { text: string; citations: Citation[] }
          if (output?.citations?.length) {
            output.citations.forEach((citation) => {
              if (!allCitations.find(c => c.url === citation.url)) {
                allCitations.push(citation)
              }
            })
          }
        }
      })
    },
    onFinish: async (result) => {
      // Context compression check
      if (conversationId && userId) {
        try {
          const totalTokens = result.usage?.totalTokens || 0
          if (totalTokens > MAX_TOKENS) {
            await compressContext(messages, conversationId, userId)
          }
        } catch (error) {
          console.error('Error checking compression:', error)
        }
      }

      // Record billing for non-preset models
      if (!isPreset) {
        try {
          const usage = result.usage
          await recordBillingUsage({
            userId,
            conversationId,
            provider,
            modelName,
            promptTokens: usage?.inputTokens || 0,
            completionTokens: usage?.outputTokens || 0,
            startTime,
            messageCount: messages.length,
            finishReason: result.finishReason,
            usage: {
              inputTokens: usage?.inputTokens || 0,
              outputTokens: usage?.outputTokens || 0,
              totalTokens: usage?.totalTokens || 0,
            },
          })
        } catch (error) {
          console.error('Error recording usage:', error)
        }
      }

      // Save messages to database
      if (conversationId && userId) {
        try {
          const lastUserMessage = messages[messages.length - 1]
          const responseText = result.text || ''

          await saveMessages({
            conversationId,
            userId,
            lastUserMessage,
            assistantResponse: responseText,
            citations: allCitations.length > 0 ? allCitations : undefined,
            uploadedAttachments,
          })
        } catch (error) {
          console.error('Error saving messages:', error)
        }
      }
    },
  })

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    messageMetadata: ({ part }) => {
      if (part.type === 'start') {
        return {
          createdAt: Date.now(),
          model: modelName,
          provider,
          isFinished: false,
        }
      }
      if (part.type === 'finish') {
        return {
          inputTokens: part.totalUsage.inputTokens,
          outputTokens: part.totalUsage.outputTokens,
          totalTokens: part.totalUsage.totalTokens,
          maxTokens: MAX_TOKENS,
          citations: allCitations.length > 0 ? allCitations : undefined,
          isFinished: true,
        }
      }
    },
  })
}
