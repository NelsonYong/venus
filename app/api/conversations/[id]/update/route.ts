import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";

export async function PATCH(
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

    const { title, isStarred } = await request.json();
    const { id } = await params;

    // Verify the conversation belongs to the user
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.userId,
        isDeleted: false,
      },
    });

    if (!existingConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update only the specified fields
    const updateData: { title?: string; isStarred?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (isStarred !== undefined) {
      updateData.isStarred = isStarred;
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
        },
      },
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