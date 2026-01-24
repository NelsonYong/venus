import { UIMessage, experimental_generateImage as generateImage } from 'ai'
import { NextResponse } from 'next/server'
import { type ResolvedModel } from '@/lib/providers'
import { checkBillingLimit, recordBillingUsage } from '@/lib/chat/billing-checker'
import { saveMessages } from '@/lib/chat/message-saver'

interface ImageGenerationParams {
  messages: UIMessage[]
  userId: string
  conversationId?: string
  resolved: ResolvedModel
  startTime: number
}

export async function handleImageGeneration({
  messages,
  userId,
  conversationId,
  resolved,
  startTime,
}: ImageGenerationParams) {
  const { model, provider, modelName, isPreset } = resolved

  // Extract prompt from last user message
  const lastMessage = messages[messages.length - 1]
  const textPart = lastMessage.parts?.find((part: any) => part.type === 'text') as any
  const prompt = textPart?.text || ''

  if (!prompt) {
    return NextResponse.json(
      { error: 'No prompt found in message' },
      { status: 400 }
    )
  }

  // Check billing for non-preset models
  if (!isPreset) {
    const usageCheck = await checkBillingLimit({
      userId,
      messages,
      provider,
      modelName,
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

  try {
    const result = await generateImage({
      model: model as any,
      prompt,
      abortSignal: AbortSignal.timeout(60000),
    })

    const imageBase64 = result.image.base64

    // Record billing for non-preset models
    if (!isPreset) {
      try {
        const estimatedTokens = Math.ceil(prompt.length / 4)
        await recordBillingUsage({
          userId,
          conversationId,
          provider,
          modelName,
          promptTokens: estimatedTokens,
          completionTokens: 1000,
          startTime,
          messageCount: messages.length,
          finishReason: 'stop',
          usage: {
            inputTokens: estimatedTokens,
            outputTokens: 1000,
            totalTokens: estimatedTokens + 1000,
          },
        })
      } catch (error) {
        console.error('Error recording usage:', error)
      }
    }

    // Save messages to database
    if (conversationId && userId) {
      try {
        await saveMessages({
          conversationId,
          userId,
          lastUserMessage: lastMessage,
          assistantResponse: `![Generated Image](${imageBase64})`,
          citations: undefined,
        })
      } catch (error) {
        console.error('Error saving messages:', error)
      }
    }

    return NextResponse.json({
      role: 'assistant',
      content: [
        { type: 'image', image: imageBase64 },
        { type: 'text', text: `Generated image for: "${prompt}"` },
      ],
      metadata: {
        createdAt: Date.now(),
        model: modelName,
        provider,
        warnings: result.warnings,
        providerMetadata: result.providerMetadata,
      },
    })
  } catch (error: any) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image', details: error.message },
      { status: 500 }
    )
  }
}
