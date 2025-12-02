import { UIMessage, experimental_generateImage as generateImage } from 'ai';
import { NextResponse } from 'next/server';
import { createImageModelAdapter } from '@/lib/model-adapter';
import { checkBillingLimit, recordBillingUsage } from '@/lib/chat/billing-checker';
import { saveMessages } from '@/lib/chat/message-saver';

interface ImageGenerationParams {
  messages: UIMessage[];
  userId: string;
  conversationId?: string;
  modelConfig: any;
  startTime: number;
}

/**
 * Handle image generation requests
 */
export async function handleImageGeneration({
  messages,
  userId,
  conversationId,
  modelConfig,
  startTime,
}: ImageGenerationParams) {
  const provider = modelConfig.provider;
  const modelName = modelConfig.name;
  const isPresetModel = modelConfig.isPreset;

  // Extract the prompt from the last user message
  const lastMessage = messages[messages.length - 1];
  let prompt = '';

  // UIMessage uses 'parts' array instead of 'content'
  if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
    // Find the first text part
    const textPart = lastMessage.parts.find((part: any) => part.type === 'text') as any;
    prompt = textPart?.text || '';
  }

  if (!prompt) {
    return NextResponse.json(
      { error: 'No prompt found in message' },
      { status: 400 }
    );
  }

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

  try {
    // Create image model adapter
    const model = createImageModelAdapter(modelConfig);

    // Generate image
    // Note: Type assertion needed due to ImageModelV2 vs V3 compatibility
    const result = await generateImage({
      model: model as any,
      prompt,
      abortSignal: AbortSignal.timeout(60000),
    });

    // Extract image data
    const image = result.image;
    const imageBase64 = image.base64;

    // Record billing usage for non-preset models
    if (!isPresetModel) {
      try {
        const estimatedTokens = Math.ceil(prompt.length / 4);
        await recordBillingUsage({
          userId,
          conversationId,
          provider,
          modelName,
          promptTokens: estimatedTokens,
          completionTokens: 1000, // Image generation cost estimate
          startTime,
          messageCount: messages.length,
          finishReason: 'stop',
          usage: {
            inputTokens: estimatedTokens,
            outputTokens: 1000,
            totalTokens: estimatedTokens + 1000,
            cachedInputTokens: 0,
            reasoningTokens: 0,
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
          assistantResponse: `![Generated Image](${imageBase64})`,
          citations: undefined,
        });
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }

    // Return image as a message response
    return NextResponse.json({
      role: 'assistant',
      content: [
        {
          type: 'image',
          image: imageBase64,
        },
        {
          type: 'text',
          text: `Generated image for: "${prompt}"`,
        }
      ],
      metadata: {
        createdAt: Date.now(),
        model: modelName,
        provider: provider,
        warnings: result.warnings,
        providerMetadata: result.providerMetadata,
      }
    });
  } catch (error: any) {
    console.error('Image generation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate image',
        details: error.message,
        cause: error.cause,
      },
      { status: 500 }
    );
  }
}
