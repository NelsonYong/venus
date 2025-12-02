import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();

    // 统计用户的总消息数
    const totalMessages = await prisma.message.count({
      where: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      totalMessages,
    });
  } catch (error) {
    console.error("Failed to fetch user stats:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
