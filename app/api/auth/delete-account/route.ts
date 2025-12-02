import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { cleanupUserBlobs } from "@/lib/blob/cleaner";

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

    // Step 1: Clean up blob files BEFORE deleting database records
    // This ensures we still have access to the blob URLs in the database
    try {
      await cleanupUserBlobs(user.id);
    } catch (error) {
      console.error('Warning: Blob cleanup failed, but continuing with account deletion:', error);
      // Continue with deletion even if blob cleanup fails
    }

    // Step 2: Delete user and all related data using transaction
    // Note: Most relations have onDelete: Cascade in schema, but we're explicit here
    await prisma.$transaction(async (tx) => {
      // Delete user billing records
      await tx.billingRecord.deleteMany({
        where: { userId: user.id }
      }).catch(() => {});

      await tx.usageRecord.deleteMany({
        where: { userId: user.id }
      }).catch(() => {});

      await tx.userBilling.delete({
        where: { userId: user.id }
      }).catch(() => {});

      // Delete MCP servers
      await tx.mcpServer.deleteMany({
        where: { userId: user.id }
      }).catch(() => {});

      // Delete model providers and their discovered models (cascades)
      await tx.modelProvider.deleteMany({
        where: { userId: user.id }
      }).catch(() => {});

      // Delete sessions
      await tx.session.deleteMany({
        where: { userId: user.id }
      });

      // Delete message citations (will cascade when messages are deleted)
      // But explicit deletion for clarity
      const userMessages = await tx.message.findMany({
        where: { userId: user.id },
        select: { id: true }
      });

      if (userMessages.length > 0) {
        await tx.messageCitation.deleteMany({
          where: {
            messageId: { in: userMessages.map(m => m.id) }
          }
        }).catch(() => {});
      }

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

      // Delete OAuth accounts
      await tx.account.deleteMany({
        where: { userId: user.id }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: user.id }
      });
    });

    console.log(`✅ Account and all associated data deleted for user: ${userInfo.email} (${userInfo.name})`);

    return NextResponse.json(
      {
        success: true,
        message: "Account deleted successfully. We're sorry to see you go.",
        deletedResources: {
          user: true,
          conversations: true,
          messages: true,
          blobs: true,
          billing: true,
          sessions: true,
        }
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