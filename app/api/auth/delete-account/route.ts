import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface DeleteAccountData {
  confirmation: string;
}

function validateDeleteData(data: any): data is DeleteAccountData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.confirmation === 'string' &&
    data.confirmation === 'DELETE'
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();

    if (!validateDeleteData(body)) {
      return NextResponse.json(
        {
          error: "Invalid data",
          message: "Confirmation 'DELETE' is required"
        },
        { status: 400 }
      );
    }

    // Get user info for logging
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        name: true
      }
    });

    if (!userInfo) {
      return NextResponse.json(
        { error: "User not found", message: "User not found" },
        { status: 404 }
      );
    }

    // Delete user and all related data using transaction
    await prisma.$transaction(async (tx) => {
      // Delete sessions first (due to foreign key constraints)
      await tx.session.deleteMany({
        where: { userId: user.id }
      });

      // Delete messages
      await tx.message.deleteMany({
        where: { userId: user.id }
      });

      // Delete conversations
      await tx.conversation.deleteMany({
        where: { userId: user.id }
      });

      // Delete API usage records (if exists)
      await tx.apiUsage.deleteMany({
        where: { userId: user.id }
      }).catch(() => {});

      // Delete accounts (OAuth connections)
      await tx.account.deleteMany({
        where: { userId: user.id }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: user.id }
      });
    });

    console.log(`Account deleted for user: ${userInfo.email} (${userInfo.name})`);

    return NextResponse.json(
      {
        success: true,
        message: "Account deleted successfully. We're sorry to see you go.",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to delete account" },
      { status: 500 }
    );
  }
}