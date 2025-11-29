import { Redis } from '@upstash/redis';

// Initialize Redis client
export const redis = Redis.fromEnv();


// Cache compressed context for a conversation
export async function cacheCompressedContext(
  conversationId: string,
  compressedContext: string,
  ttl: number = 86400 // 24 hours default
): Promise<void> {
  const key = `compressed:${conversationId}`;
  await redis.setex(key, ttl, compressedContext);
}

// Retrieve compressed context for a conversation
export async function getCompressedContext(
  conversationId: string
): Promise<string | null> {
  const key = `compressed:${conversationId}`;
  return await redis.get<string>(key);
}

// Clear compressed context for a conversation
export async function clearCompressedContext(
  conversationId: string
): Promise<void> {
  const key = `compressed:${conversationId}`;
  await redis.del(key);
}
