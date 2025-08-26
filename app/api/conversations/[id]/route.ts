import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.userId,
        isDeleted: false,
      },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if request body is empty to avoid JSON parsing errors
    const contentLength = request.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      return NextResponse.json({ error: "Request body is empty" }, { status: 400 });
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { title, messages, model } = requestData;
    const { id } = await params;

    // First, verify the conversation belongs to the user
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!existingConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update the conversation and replace all messages
    const updatedConversation = await prisma.$transaction(async (tx) => {
      // Delete existing messages
      await tx.message.deleteMany({
        where: { conversationId: id },
      });

      // Update conversation and create new messages
      return await tx.conversation.update({
        where: { id },
        data: {
          title: title || existingConversation.title,
          model: model || existingConversation.model,
          updatedAt: new Date(),
          messages: {
            create: messages.map((msg: { role: string; parts?: unknown; content?: unknown; createdAt?: string }, index: number) => ({
              userId: session.userId,
              role: msg.role,
              content: JSON.stringify(msg.parts || msg.content),
              createdAt: msg.createdAt || new Date(Date.now() + index * 1000),
            })),
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Soft delete the conversation
    await prisma.conversation.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}