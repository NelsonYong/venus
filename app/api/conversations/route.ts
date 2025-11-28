import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        isDeleted: false,
      },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { title, messages, model, modelId } = await request.json();

    // If modelId is provided, fetch the model name from database
    let modelName = model || "openai/gpt-4o";
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

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "新对话",
        userId: user.id,
        model: modelName,
        messages: {
          create: messages.map((msg: any, index: number) => {
            // Preserve original createdAt timestamps to maintain message order
            let messageTimestamp: Date;

            if (msg.createdAt) {
              // Use the provided timestamp
              messageTimestamp = new Date(msg.createdAt);
            } else {
              // Generate timestamp with small increments (100ms) to maintain order
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

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Soft delete all conversations for the user
    // updatedAt will be automatically updated by Prisma's @updatedAt decorator
    await prisma.conversation.updateMany({
      where: {
        userId: user.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    // Also soft delete all messages for the user
    // Message model doesn't have updatedAt field, so we don't set it
    await prisma.message.updateMany({
      where: {
        userId: user.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: "All conversations deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting all conversations:", error);
    return NextResponse.json(
      { error: "Failed to delete all conversations" },
      { status: 500 }
    );
  }
}