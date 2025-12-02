import { experimental_generateImage as generateImage } from 'ai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createImageModelAdapter, getDefaultModelConfig } from '@/lib/model-adapter';
import { checkBillingLimit, recordBillingUsage } from '@/lib/chat/billing-checker';

// Allow image generation up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const startTime = Date.now();

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
      providerOptions
    }: {
      prompt: string;
      userId?: string;
      conversationId?: string;
      modelId?: string;
      size?: string;
      aspectRatio?: string;
      n?: number;
      seed?: number;
      providerOptions?: Record<string, any>;
    } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

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
      // Use default model (this should be an image model)
      modelConfig = getDefaultModelConfig();
    }

    const provider = modelConfig.provider;
    const modelName = modelConfig.name;
    const isPresetModel = modelConfig.isPreset;

    // Check billing for non-preset models
    if (!isPresetModel) {
      // For image generation, estimate tokens based on prompt length
      const usageCheck = await checkBillingLimit({
        userId,
        messages: [{
          id: 'temp-id',
          role: 'user',
          parts: [{ type: 'text', text: prompt }]
        }] as any,
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

    // Create image model adapter
    const model = createImageModelAdapter(modelConfig);

    // Prepare generation options
    const generateOptions: any = {
      model,
      prompt,
      abortSignal: AbortSignal.timeout(60000),
    };

    // Add optional parameters
    if (size) generateOptions.size = size;
    if (aspectRatio) generateOptions.aspectRatio = aspectRatio;
    if (n) generateOptions.n = n;
    if (seed) generateOptions.seed = seed;
    if (providerOptions) generateOptions.providerOptions = providerOptions;

    // Generate image(s)
    const result = await generateImage(generateOptions);

    // Extract images
    const images = result.images || (result.image ? [result.image] : []);

    // Convert images to base64 for response
    const imageData = images.map((image: any) => ({
      base64: image.base64,
      // Additional metadata if available
      providerMetadata: result.providerMetadata,
    }));

    // Record billing usage for non-preset models
    if (!isPresetModel) {
      try {
        // For image generation, we estimate costs differently
        // Each image generation counts as a unit
        const estimatedTokens = n * 1000; // Rough estimate

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
            cachedInputTokens: 0,
            reasoningTokens: 0,
          },
        });
      } catch (error) {
        console.error('Error recording usage:', error);
      }
    }

    return NextResponse.json({
      success: true,
      images: imageData,
      warnings: result.warnings,
      providerMetadata: result.providerMetadata,
    });

  } catch (error: any) {
    console.error('Image generation API error:', error);

    // Handle specific error types
    if (error.name === 'AI_NoImageGeneratedError') {
      return NextResponse.json(
        {
          error: 'Failed to generate image',
          details: error.message,
          cause: error.cause,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

