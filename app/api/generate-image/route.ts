import { experimental_generateImage as generateImage } from 'ai'
import { NextResponse } from 'next/server'
import { resolveModel, ModelNotFoundError } from '@/lib/providers'
import { checkBillingLimit, recordBillingUsage } from '@/lib/chat/billing-checker'

export const maxDuration = 60

export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    const {
      prompt,
      userId,
      conversationId,
      modelId,
      size,
      aspectRatio,
      n = 1,
      seed,
      providerOptions,
    }: {
      prompt: string
      userId?: string
      conversationId?: string
      modelId?: string
      size?: string
      aspectRatio?: string
      n?: number
      seed?: number
      providerOptions?: Record<string, any>
    } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required for billing tracking' },
        { status: 401 }
      )
    }

    const resolved = await resolveModel(modelId, userId)
    const { model, provider, modelName, isPreset } = resolved

    // Check billing for non-preset models
    if (!isPreset) {
      const usageCheck = await checkBillingLimit({
        userId,
        messages: [{
          id: 'temp-id',
          role: 'user',
          parts: [{ type: 'text', text: prompt }],
        }] as any,
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

    // Prepare generation options
    const generateOptions: any = {
      model,
      prompt,
      abortSignal: AbortSignal.timeout(60000),
    }

    if (size) generateOptions.size = size
    if (aspectRatio) generateOptions.aspectRatio = aspectRatio
    if (n) generateOptions.n = n
    if (seed) generateOptions.seed = seed
    if (providerOptions) generateOptions.providerOptions = providerOptions

    const result = await generateImage(generateOptions)

    const images = result.images || (result.image ? [result.image] : [])
    const imageData = images.map((image: any) => ({
      base64: image.base64,
      providerMetadata: result.providerMetadata,
    }))

    // Record billing for non-preset models
    if (!isPreset) {
      try {
        const estimatedTokens = n * 1000
        await recordBillingUsage({
          userId,
          conversationId,
          provider,
          modelName,
          promptTokens: estimatedTokens,
          completionTokens: 0,
          startTime,
          messageCount: 1,
          finishReason: 'stop',
          usage: {
            inputTokens: estimatedTokens,
            outputTokens: 0,
            totalTokens: estimatedTokens,
          },
        })
      } catch (error) {
        console.error('Error recording usage:', error)
      }
    }

    return NextResponse.json({
      success: true,
      images: imageData,
      warnings: result.warnings,
      providerMetadata: result.providerMetadata,
    })
  } catch (error: any) {
    if (error instanceof ModelNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    console.error('Image generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
