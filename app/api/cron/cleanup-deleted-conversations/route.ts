import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanupConversationBlobs } from '@/lib/blob/cleaner';

/**
 * Cron job to permanently delete soft-deleted conversations
 * and clean up their associated blob files
 *
 * Deploy with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-deleted-conversations",
 *     "schedule": "0 2 * * *"  // Run daily at 2 AM
 *   }]
 * }
 *
 * Or use with external cron service (e.g., cron-job.org)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify request is from Vercel Cron or authorized source
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find conversations deleted more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedConversations = await prisma.conversation.findMany({
      where: {
        isDeleted: true,
        updatedAt: {
          lt: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      take: 100, // Process in batches
    });

    if (deletedConversations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No conversations to clean up',
        processed: 0,
      });
    }

    console.log(`🗑️  Found ${deletedConversations.length} conversations to permanently delete`);

    const conversationIds = deletedConversations.map(c => c.id);
    let successCount = 0;
    let failedCount = 0;

    // Process each conversation
    for (const conversation of deletedConversations) {
      try {
        // Clean up blob files first
        await cleanupConversationBlobs(conversation.id);

        // Then permanently delete from database
        await prisma.conversation.delete({
          where: { id: conversation.id },
        });

        successCount++;
        console.log(`✅ Permanently deleted conversation ${conversation.id}`);
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to delete conversation ${conversation.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: deletedConversations.length,
      success: successCount,
      failed: failedCount,
      conversationIds,
    });
  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
