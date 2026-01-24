import { NextResponse } from 'next/server'
import { resolveModel, ModelNotFoundError } from '@/lib/providers'
import { checkBillingLimit } from '@/lib/chat/billing-checker'
import { handleImageGeneration } from './handlers/image-generation'
import { handleStreamText } from './handlers/stream-handler'
import {
  attachFilesToLastMessage,
  processMessagesWithCompression,
  type UploadedAttachment
} from './utils/message-processor'
import { buildSystemPrompt } from './utils/system-prompt'
import { type UIMessage } from 'ai'

export const maxDuration = 60

export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    const {
      messages,
      userId,
      conversationId,
      webSearch,
      modelId,
      uploadedAttachments,
    }: {
      messages: UIMessage[]
      userId?: string
      conversationId?: string
      webSearch?: boolean
      modelId?: string
      uploadedAttachments?: UploadedAttachment[]
    } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required for billing tracking' },
        { status: 401 }
      )
    }

    // Resolve model from ID or use default preset
    const resolved = await resolveModel(modelId, userId)

    // Route image models to image generation handler
    if (resolved.isImageModel) {
      return await handleImageGeneration({
        messages,
        userId,
        conversationId,
        resolved,
        startTime,
      })
    }

    // Check billing for non-preset models
    if (!resolved.isPreset) {
      const usageCheck = await checkBillingLimit({
        userId,
        messages,
        provider: resolved.provider,
        modelName: resolved.modelName,
      })

      if (!usageCheck.canProceed) {
        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            reason: usageCheck.reason,
            billing: usageCheck.userBilling,
          },
          { status: 429 }
        )
      }
    }

    // Process messages: add attachments if present
    let processedMessages = attachFilesToLastMessage(messages, uploadedAttachments || [])

    // Apply context compression if available
    processedMessages = await processMessagesWithCompression(processedMessages, conversationId)

    // Build system prompt
    const systemPrompt = await buildSystemPrompt(webSearch || false, conversationId)

    // Handle streaming text generation
    return await handleStreamText({
      messages: processedMessages,
      userId,
      conversationId,
      resolved,
      systemPrompt,
      webSearch: webSearch || false,
      startTime,
      uploadedAttachments,
    })
  } catch (error) {
    if (error instanceof ModelNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
