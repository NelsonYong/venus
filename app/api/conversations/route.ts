import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const offset = searchParams.get("offset");
    const limit = searchParams.get("limit");

    // 构建查询选项
    const queryOptions = {
      where: {
        userId: user.id,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        isStarred: true,
        isPinned: true,
        model: true,
        // 只获取最后一条消息的预览文本
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: {
            content: true,
            role: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc" as const,
      },
      skip: offset ? parseInt(offset, 10) : undefined,
      take: limit ? parseInt(limit, 10) : undefined,
    };

    const conversations = await prisma.conversation.findMany(queryOptions);

    // 如果使用分页，同时获取总数
    let total: number | undefined;
    if (offset !== null || limit !== null) {
      total = await prisma.conversation.count({
        where: {
          userId: user.id,
          isDeleted: false,
        },
      });
    }

    // 转换为前端需要的格式
    const conversationsWithPreview = conversations.map((conv) => {
      let preview = "暂无消息";

      if (conv.messages.length > 0) {
        const lastMessage = conv.messages[0];
        try {
          const content = JSON.parse(lastMessage.content);
          if (Array.isArray(content)) {
            const textPart = content.find((part: any) => part.type === "text");
            if (textPart?.text) {
              const text = textPart.text;
              preview = text.slice(0, 50) + (text.length > 50 ? "..." : "");
            }
          } else if (typeof content === 'string') {
            preview = content.slice(0, 50) + (content.length > 50 ? "..." : "");
          }
        } catch {
          preview = lastMessage.content.slice(0, 50);
        }
      }

      return {
        id: conv.id,
        title: conv.title,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
        isStarred: conv.isStarred,
        isPinned: conv.isPinned,
        model: conv.model,
        preview,
      };
    });

    // 如果使用分页，返回带分页信息的响应
    if (total !== undefined) {
      return NextResponse.json({
        data: conversationsWithPreview,
        pagination: {
          total,
          offset: offset ? parseInt(offset, 10) : 0,
          limit: limit ? parseInt(limit, 10) : conversationsWithPreview.length,
          hasMore: (offset ? parseInt(offset, 10) : 0) + conversationsWithPreview.length < total,
        },
      });
    }

    // 不使用分页时，直接返回数组
    return NextResponse.json(conversationsWithPreview);
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

export async function DELETE() {
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