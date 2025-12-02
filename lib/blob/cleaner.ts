import { del } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

/**
 * Extract blob URLs from message uploadedAttachments
 */
export function extractBlobUrls(uploadedAttachments: any): string[] {
  if (!uploadedAttachments) return [];

  try {
    const attachments = typeof uploadedAttachments === 'string'
      ? JSON.parse(uploadedAttachments)
      : uploadedAttachments;

    if (Array.isArray(attachments)) {
      return attachments
        .filter(att => att?.url && att.url.includes('blob.vercel-storage.com'))
        .map(att => att.url);
    }
  } catch (error) {
    console.error('Error parsing uploadedAttachments:', error);
  }

  return [];
}

/**
 * Collect all blob URLs from a conversation and its messages
 */
export async function collectConversationBlobUrls(conversationId: string): Promise<string[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: { uploadedAttachments: true },
  });

  const blobUrls: string[] = [];

  for (const message of messages) {
    if (message.uploadedAttachments) {
      const urls = extractBlobUrls(message.uploadedAttachments);
      blobUrls.push(...urls);
    }
  }

  return [...new Set(blobUrls)]; // Remove duplicates
}

/**
 * Delete blob files from Vercel Blob storage
 */
export async function deleteBlobFiles(urls: string[]): Promise<{
  success: number;
  failed: number;
  errors: Array<{ url: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ url: string; error: string }>,
  };

  // Delete blobs concurrently with a limit to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          await del(url);
          results.success++;
          console.log(`✅ Deleted blob: ${url}`);
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            url,
            error: error.message || 'Unknown error',
          });
          console.error(`❌ Failed to delete blob ${url}:`, error);
        }
      })
    );
  }

  return results;
}

/**
 * Clean up blob files associated with a conversation
 * This should be called after deleting conversation from database
 */
export async function cleanupConversationBlobs(conversationId: string): Promise<void> {
  try {
    console.log(`🧹 Starting blob cleanup for conversation ${conversationId}`);

    const blobUrls = await collectConversationBlobUrls(conversationId);

    if (blobUrls.length === 0) {
      console.log(`ℹ️  No blob files to clean up for conversation ${conversationId}`);
      return;
    }

    console.log(`📦 Found ${blobUrls.length} blob file(s) to delete`);

    const results = await deleteBlobFiles(blobUrls);

    console.log(`✅ Blob cleanup completed for conversation ${conversationId}:`, {
      total: blobUrls.length,
      success: results.success,
      failed: results.failed,
    });

    if (results.errors.length > 0) {
      console.error('⚠️  Some blob deletions failed:', results.errors);
    }
  } catch (error) {
    console.error(`❌ Error during blob cleanup for conversation ${conversationId}:`, error);
    // Don't throw - we want to continue even if blob cleanup fails
  }
}

/**
 * Collect all blob URLs from all user's conversations
 */
export async function collectUserBlobUrls(userId: string): Promise<string[]> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    select: { id: true },
  });

  const allBlobUrls: string[] = [];

  for (const conversation of conversations) {
    const urls = await collectConversationBlobUrls(conversation.id);
    allBlobUrls.push(...urls);
  }

  return [...new Set(allBlobUrls)]; // Remove duplicates
}

/**
 * Clean up all blob files associated with a user
 * This should be called when deleting a user account
 */
export async function cleanupUserBlobs(userId: string): Promise<void> {
  try {
    console.log(`🧹 Starting blob cleanup for user ${userId}`);

    const blobUrls = await collectUserBlobUrls(userId);

    if (blobUrls.length === 0) {
      console.log(`ℹ️  No blob files to clean up for user ${userId}`);
      return;
    }

    console.log(`📦 Found ${blobUrls.length} blob file(s) to delete for user`);

    const results = await deleteBlobFiles(blobUrls);

    console.log(`✅ Blob cleanup completed for user ${userId}:`, {
      total: blobUrls.length,
      success: results.success,
      failed: results.failed,
    });

    if (results.errors.length > 0) {
      console.error('⚠️  Some blob deletions failed:', results.errors);
    }
  } catch (error) {
    console.error(`❌ Error during blob cleanup for user ${userId}:`, error);
    // Don't throw - we want to continue even if blob cleanup fails
  }
}
