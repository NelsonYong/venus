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

    const { title, messages, model } = await request.json();

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "新对话",
        userId: session.userId,
        model: model || "openai/gpt-4o",
        messages: {
          create: messages.map((msg: any, index: number) => ({
            userId: session.userId,
            role: msg.role,
            content: JSON.stringify(msg.parts || msg.content),
            createdAt: msg.createdAt || new Date(Date.now() + index * 1000), // Ensure proper ordering
          })),
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