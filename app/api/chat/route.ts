import { UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultModelConfig, isImageModel } from '@/lib/model-adapter';
import { checkBillingLimit } from '@/lib/chat/billing-checker';
import { handleImageGeneration } from './handlers/image-generation';
import { handleStreamText } from './handlers/stream-handler';
import {
  attachFilesToLastMessage,
  processMessagesWithCompression,
  type UploadedAttachment
} from './utils/message-processor';
import { buildSystemPrompt } from './utils/system-prompt';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { messages, userId, conversationId, webSearch, modelId, uploadedAttachments }: {
      messages: UIMessage[];
      userId?: string;
      conversationId?: string;
      webSearch?: boolean;
      modelId?: string;
      uploadedAttachments?: UploadedAttachment[];
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

    // Check if this is an image generation model
    if (isImageModel(modelName)) {
      return await handleImageGeneration({
        messages,
        userId,
        conversationId,
        modelConfig,
        startTime,
      });
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

    // Process messages: add attachments if present
    let processedMessages = attachFilesToLastMessage(messages, uploadedAttachments || []);

    // Apply context compression if available
    processedMessages = await processMessagesWithCompression(processedMessages, conversationId);

    // Build system prompt with web search and compression context
    const systemPrompt = await buildSystemPrompt(webSearch || false, conversationId);

    // Handle streaming text generation
    return await handleStreamText({
      messages: processedMessages,
      userId,
      conversationId,
      modelConfig,
      systemPrompt,
      webSearch: webSearch || false,
      startTime,
      uploadedAttachments,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}