import { recordBillingUsage } from '@/lib/chat/billing-checker'
import { saveMessages } from '@/lib/chat/message-saver'
import { compressContext } from '@/lib/chat/context-compressor'
import { type Citation } from '@/lib/search-tool'
import { type UIMessage } from 'ai'

const MAX_TOKENS = 32000

/**
 * Extract serializable assistant parts from streamText result.
 * Collects text + tool-call + tool-result across all steps.
 */
function extractAssistantParts(result: any): any[] | undefined {
  try {
    const parts: any[] = []

    if (result.steps && Array.isArray(result.steps)) {
      for (const step of result.steps) {
        if (step.text) {
          parts.push({ type: 'text', text: step.text })
        }
        if (step.toolCalls && Array.isArray(step.toolCalls)) {
          for (const tc of step.toolCalls) {
            parts.push({
              type: 'tool-invocation',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.input ?? tc.args,
              state: 'output-available',
            })
          }
        }
        if (step.toolResults && Array.isArray(step.toolResults)) {
          for (const tr of step.toolResults) {
            const existing = parts.find(
              (p: any) =>
                p.type === 'tool-invocation' &&
                p.toolCallId === tr.toolCallId
            )
            if (existing) {
              existing.output = tr.output ?? tr.result
            }
          }
        }
      }
    }

    if (parts.length === 0 && result.text) {
      parts.push({ type: 'text', text: result.text })
    }

    return parts.length > 0 ? parts : undefined
  } catch {
    return undefined
  }
}

export interface StreamLifecycleContext {
  userId: string
  conversationId?: string
  provider: string
  modelName: string
  isPreset: boolean
  startTime: number
  messages: UIMessage[]
  uploadedAttachments?: Array<{
    url: string
    filename: string
    size: number
    type: string
    contentType: string
  }>
}

/**
 * Creates onStepFinish / onFinish handlers that encapsulate billing,
 * context compression, and message persistence — keeping the stream
 * handler itself thin.
 */
export function createStreamLifecycleHandlers(ctx: StreamLifecycleContext) {
  const allCitations: Citation[] = []

  const onStepFinish = async ({ toolResults }: { toolResults?: any[] }) => {
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
  }

  const onFinish = async (result: any) => {
    // Context compression
    if (ctx.conversationId && ctx.userId) {
      try {
        const totalTokens = result.usage?.totalTokens || 0
        if (totalTokens > MAX_TOKENS) {
          await compressContext(ctx.messages, ctx.conversationId, ctx.userId)
        }
      } catch (error) {
        console.error('Error checking compression:', error)
      }
    }

    // Billing
    if (!ctx.isPreset) {
      try {
        const usage = result.usage
        await recordBillingUsage({
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          provider: ctx.provider,
          modelName: ctx.modelName,
          promptTokens: usage?.inputTokens || 0,
          completionTokens: usage?.outputTokens || 0,
          startTime: ctx.startTime,
          messageCount: ctx.messages.length,
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

    // Persist messages
    if (ctx.conversationId && ctx.userId) {
      try {
        const lastUserMessage = ctx.messages[ctx.messages.length - 1]
        const responseText = result.text || ''

        // Extract full assistant parts from all steps for persistence
        const assistantParts = extractAssistantParts(result)

        await saveMessages({
          conversationId: ctx.conversationId,
          userId: ctx.userId,
          lastUserMessage,
          assistantResponse: responseText,
          assistantParts,
          citations: allCitations.length > 0 ? allCitations : undefined,
          uploadedAttachments: ctx.uploadedAttachments,
        })
      } catch (error) {
        console.error('Error saving messages:', error)
      }
    }
  }

  const getMetadata = ({ part }: { part: any }) => {
    if (part.type === 'start') {
      return {
        createdAt: Date.now(),
        model: ctx.modelName,
        provider: ctx.provider,
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
  }

  return { onStepFinish, onFinish, getMetadata, allCitations }
}
