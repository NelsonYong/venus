import { UIMessage } from 'ai';

/**
 * Estimates token count for messages
 * Rough estimation: ~4 characters per token
 */
export function estimateTokens(messages: UIMessage[]): number {
  let totalChars = 0;

  for (const message of messages) {
    if (message.parts && Array.isArray(message.parts)) {
      for (const part of message.parts) {
        if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
          totalChars += part.text.length;
        }
      }
    }
  }

  return Math.ceil(totalChars / 4);
}

export function shouldCompress(messages: UIMessage[], maxTokens: number = 8000): boolean {
  const estimatedTokens = estimateTokens(messages);
  return estimatedTokens > maxTokens;
}
