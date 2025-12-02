import { NextRequest, NextResponse } from 'next/server';
import { cleanupConversationBlobs } from '@/lib/blob/cleaner';

/**
 * Background task endpoint for cleaning up blob files
 * This endpoint can be called asynchronously after conversation deletion
 *
 * Usage:
 * POST /api/cleanup/blobs
 * Body: { conversationIds: string[] }
 *
 * For production: integrate with a queue system like:
 * - Vercel Cron Jobs
 * - Inngest
 * - Bull Queue
 * - QStash
 */
export async function POST(req: NextRequest) {
  try {
    const { conversationIds } = await req.json();

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return NextResponse.json(
        { error: 'conversationIds array is required' },
        { status: 400 }
      );
    }

    // Optional: verify request is from internal system
    // const authHeader = req.headers.get('x-cleanup-token');
    // if (authHeader !== process.env.CLEANUP_SECRET_TOKEN) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log(`🔄 Starting blob cleanup for ${conversationIds.length} conversation(s)`);

    // Process cleanup for each conversation
    const results = await Promise.allSettled(
      conversationIds.map(id => cleanupConversationBlobs(id))
    );

    const summary = {
      total: conversationIds.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };

    console.log('✅ Blob cleanup batch completed:', summary);

    return NextResponse.json({
      success: true,
      summary,
      details: results.map((result, index) => ({
        conversationId: conversationIds[index],
        status: result.status,
        error: result.status === 'rejected' ? result.reason?.message : undefined,
      })),
    });
  } catch (error: any) {
    console.error('❌ Blob cleanup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Optional: GET endpoint to check cleanup status or list pending cleanups
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'Blob cleanup service is running',
  });
}
