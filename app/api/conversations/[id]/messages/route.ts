import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * Append new messages to a conversation (incremental save)
 * This endpoint only adds new messages without deleting existing ones
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
        isDeleted: false,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get existing message count to determine order
    const existingMessages = await prisma.message.findMany({
      where: { conversationId: id, isDeleted: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true },
    });

    // Append new messages with proper timestamps
    const newMessages = await prisma.$transaction(
      messages.map((msg: {
        role: string;
        parts?: unknown;
        content?: unknown;
        createdAt?: string | Date;
      }, index: number) => {
        // Use the provided createdAt if available, otherwise generate one
        let messageCreatedAt: Date;
        if (msg.createdAt) {
          messageCreatedAt = new Date(msg.createdAt);
        } else {
          // If no createdAt provided, use current time + offset based on position
          messageCreatedAt = new Date(Date.now() + index * 100);
        }

        return prisma.message.create({
          data: {
            conversationId: id,
            userId: user.id,
            role: msg.role,
            content: JSON.stringify(msg.parts || msg.content),
            createdAt: messageCreatedAt,
          },
        });
      })
    );

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      messagesAdded: newMessages.length,
      messages: newMessages,
    });
  } catch (error) {
    console.error("Error appending messages:", error);
    return NextResponse.json(
      { error: "Failed to append messages" },
      { status: 500 }
    );
  }
}

