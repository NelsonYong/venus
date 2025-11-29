import { generateText, UIMessage } from 'ai';
import { cacheCompressedContext } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { createModelAdapter } from '@/lib/model-adapter';

/**
 * Compresses conversation context using first available user model
 */
export async function compressContext(
  messages: UIMessage[],
  conversationId: string,
  userId: string
): Promise<string> {
  // Build conversation text
  const conversationText = messages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      let content = '';

      if (msg.parts && Array.isArray(msg.parts)) {
        const textParts = msg.parts
          .filter((part): part is { type: 'text'; text: string } =>
            part.type === 'text' && 'text' in part && typeof part.text === 'string'
          )
          .map(part => part.text);
        content = textParts.join('\n');
      }

      return `${role}: ${content}`;
    })
    .join('\n\n');

  // Get first available user model
  const firstModel = await prisma.discoveredModel.findFirst({
    where: {
      isEnabled: true,
      provider: {
        userId: userId,
        status: "ACTIVE",
      },
    },
    include: {
      provider: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!firstModel) {
    throw new Error('No available models found for compression');
  }

  // Create model adapter for compression
  const modelConfig = {
    provider: firstModel.provider.provider,
    name: firstModel.modelName,
    apiKey: firstModel.provider.apiKey,
    apiEndpoint: firstModel.provider.apiEndpoint,
    isPreset: false,
  };

  const model = createModelAdapter(modelConfig);

  // Limit conversation text to avoid token limits
  const limitedText = conversationText.slice(0, 2000);

  const { text } = await generateText({
    model,
    prompt: `Summarize the following conversation, preserving key facts, decisions, and context. Be concise but comprehensive:

${limitedText}

Provide a summary that captures:
1. Main topics discussed
2. Important decisions or conclusions
3. Key facts or data mentioned
4. Current state/progress of any ongoing tasks

Summary:`,
  });

  // Cache the compressed context
  await cacheCompressedContext(conversationId, text);

  return text;
}

/**
 * Truncates messages to keep only recent messages up to last user message
 */
export function truncateMessages(messages: UIMessage[], keepLast: number = 10): UIMessage[] {
  if (messages.length <= keepLast) {
    return messages;
  }

  // Find the last user message index
  let lastUserMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserMessageIndex = i;
      break;
    }
  }

  // If no user message found, return last N messages
  if (lastUserMessageIndex === -1) {
    return messages.slice(-keepLast);
  }

  // Keep messages from (lastUserMessageIndex - keepLast + 1) to end
  const startIndex = Math.max(0, lastUserMessageIndex - keepLast + 1);
  return messages.slice(startIndex);
}
