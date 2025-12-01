import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * DELETE /api/conversations/[id]/messages
 * Delete the last N messages from a conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    // Get count from query params (default to 1)
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '1', 10);

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
        isDeleted: false,
      },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: count,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Soft delete the last N messages
    const messageIds = conversation.messages.map(msg => msg.id);
    
    if (messageIds.length > 0) {
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
        },
        data: {
          isDeleted: true,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: messageIds.length 
    });
  } catch (error) {
    console.error("Error deleting messages:", error);
    return NextResponse.json(
      { error: "Failed to delete messages" },
      { status: 500 }
    );
  }
}
