import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: session.userId,
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
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, messages, model, modelId } = await request.json();

    // If modelId is provided, fetch the model name from database
    let modelName = model || "openai/gpt-4o";
    if (modelId) {
      const dbModel = await prisma.aiModel.findFirst({
        where: {
          id: modelId,
          OR: [
            { isPreset: true },
            { createdBy: session.userId },
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

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "新对话",
        userId: session.userId,
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
              userId: session.userId,
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
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete all conversations for the user
    // updatedAt will be automatically updated by Prisma's @updatedAt decorator
    await prisma.conversation.updateMany({
      where: {
        userId: session.userId,
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
        userId: session.userId,
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