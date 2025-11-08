import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
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
    const user = await requireAuth();

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

    const { title, messages, model, modelId } = requestData;
    const { id } = await params;

    // First, verify the conversation belongs to the user
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // If modelId is provided, fetch the model name from database
    let modelName = model || existingConversation.model;
    if (modelId) {
      const dbModel = await prisma.aiModel.findFirst({
        where: {
          id: modelId,
          OR: [
            { isPreset: true },
            { createdBy: user.id },
          ],
          isActive: true,
        },
        select: {
          provider: true,
          name: true,
        }
      });
      if (dbModel) {
        modelName = `${dbModel.provider}/${dbModel.name}`;
      }
    }

    // Update the conversation and replace all messages
    const updatedConversation = await prisma.$transaction(async (tx) => {
      // Delete existing messages
      await tx.message.deleteMany({
        where: { conversationId: id },
      });

      // Update conversation and create new messages
      // IMPORTANT: Preserve original createdAt timestamps to maintain message order
      return await tx.conversation.update({
        where: { id },
        data: {
          title: title || existingConversation.title,
          model: modelName,
          updatedAt: new Date(),
          messages: {
            create: messages.map((msg: { role: string; parts?: unknown; content?: unknown; createdAt?: string | Date }, index: number) => {
              // If createdAt is provided, use it; otherwise generate a proper sequence
              let messageTimestamp: Date;
              
              if (msg.createdAt) {
                // Preserve the original timestamp
                messageTimestamp = new Date(msg.createdAt);
              } else {
                // Generate timestamp with small increments (100ms) to maintain order
                // Use index to ensure proper sequencing
                messageTimestamp = new Date(Date.now() + index * 100);
              }

              return {
                userId: user.id,
                role: msg.role,
                content: JSON.stringify(msg.parts || msg.content),
                createdAt: messageTimestamp,
              };
            }),
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
    const user = await requireAuth();

    const { id } = await params;

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
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