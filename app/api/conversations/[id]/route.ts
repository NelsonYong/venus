import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateConversationTitle, shouldGenerateTitle } from "@/lib/chat/title-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
          include: {
            citations: true, // Include citations for each message
          },
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
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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
      const discoveredModel = await prisma.discoveredModel.findFirst({
        where: {
          modelId: modelId,
          isEnabled: true,
          provider: {
            userId: user.id,
            status: "ACTIVE",
          },
        },
        include: {
          provider: true,
        },
      });
      if (discoveredModel) {
        modelName = `${discoveredModel.provider.provider}/${discoveredModel.modelName}`;
      }
    }

    // 自动生成标题（如果需要）
    let finalTitle = title || existingConversation.title;
    if (shouldGenerateTitle(messages.length)) {
      console.log('Auto-generating title for conversation:', id);
      try {
        // 准备消息用于标题生成
        const messagesForTitle = messages.map((msg: any) => ({
          role: msg.role,
          content: JSON.stringify(msg.parts || msg.content)
        }));

        const generatedTitle = await generateConversationTitle(messagesForTitle);
        finalTitle = generatedTitle;
        console.log('Generated title:', generatedTitle);
      } catch (error) {
        console.error('Failed to auto-generate title:', error);
        // 失败时保持原标题
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
          title: finalTitle,
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
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Check if request wants hard delete (permanent)
    const { permanent } = await request.json().catch(() => ({ permanent: false }));

    if (permanent) {
      // Hard delete: remove from database and trigger blob cleanup
      await prisma.conversation.delete({
        where: { id },
      });

      // Trigger async blob cleanup (don't wait for it)
      // In production, use a proper queue system
      fetch(`${request.nextUrl.origin}/api/cleanup/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds: [id] }),
      }).catch(error => {
        console.error('Failed to trigger blob cleanup:', error);
      });

      return NextResponse.json({ success: true, deleted: 'permanent' });
    } else {
      // Soft delete the conversation
      await prisma.conversation.update({
        where: { id },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, deleted: 'soft' });
    }
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}