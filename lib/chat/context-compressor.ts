import { generateText, UIMessage } from 'ai'
import { cacheCompressedContext } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { createModel } from '@/lib/providers'
import { getDefaultPreset } from '@/lib/providers'

/**
 * Compresses conversation context using first available model
 */
export async function compressContext(
  messages: UIMessage[],
  conversationId: string,
  userId: string
): Promise<string> {
  const conversationText = messages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      const textParts = (msg.parts || [])
        .filter((part): part is { type: 'text'; text: string } =>
          part.type === 'text' && 'text' in part && typeof part.text === 'string'
        )
        .map(part => part.text)
      return `${role}: ${textParts.join('\n')}`
    })
    .join('\n\n')

  // Try user's first available model, fall back to default preset
  const model = await getCompressionModel(userId)

  const limitedText = conversationText.slice(0, 2000)

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
  })

  await cacheCompressedContext(conversationId, text)
  return text
}

async function getCompressionModel(userId: string) {
  const firstModel = await prisma.discoveredModel.findFirst({
    where: {
      isEnabled: true,
      provider: {
        userId,
        status: 'ACTIVE',
      },
    },
    include: { provider: true },
    orderBy: { createdAt: 'asc' },
  })

  if (firstModel) {
    return createModel(
      firstModel.provider.provider,
      firstModel.modelName,
      {
        apiKey: firstModel.provider.apiKey,
        baseURL: firstModel.provider.apiEndpoint || undefined,
      }
    )
  }

  // Fallback to default preset
  const preset = getDefaultPreset()
  return createModel(preset.provider, preset.modelName, {
    apiKey: preset.apiKey,
    baseURL: preset.baseURL,
  })
}

/**
 * Truncates messages to keep only recent messages
 */
export function truncateMessages(messages: UIMessage[], keepLast: number = 10): UIMessage[] {
  if (messages.length <= keepLast) {
    return messages
  }

  let lastUserMessageIndex = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserMessageIndex = i
      break
    }
  }

  if (lastUserMessageIndex === -1) {
    return messages.slice(-keepLast)
  }

  const startIndex = Math.max(0, lastUserMessageIndex - keepLast + 1)
  return messages.slice(startIndex)
}
