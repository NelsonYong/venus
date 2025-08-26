import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession, verifyPassword } from "@/lib/auth";

interface DeleteAccountData {
  password: string;
  confirmation: string;
}

function validateDeleteData(data: any): data is DeleteAccountData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.password === 'string' &&
    data.password.length > 0 &&
    typeof data.confirmation === 'string' &&
    data.confirmation === 'DELETE'
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: "No token found", message: "Authentication required" },
        { status: 401 }
      );
    }

    const session = await validateSession(token);
    
    if (!session) {
      return NextResponse.json(
        { error: "Invalid token", message: "Please login again" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    if (!validateDeleteData(body)) {
      return NextResponse.json(
        { 
          error: "Invalid data", 
          message: "Password and confirmation 'DELETE' are required" 
        },
        { status: 400 }
      );
    }

    const { password } = body;

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { 
        password: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User not found" },
        { status: 404 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid password", message: "Password is incorrect" },
        { status: 400 }
      );
    }

    // Delete user and all related data using transaction
    await prisma.$transaction(async (tx) => {
      // Delete sessions first (due to foreign key constraints)
      await tx.session.deleteMany({
        where: { userId: session.userId }
      });

      // Delete messages
      await tx.message.deleteMany({
        where: { userId: session.userId }
      });

      // Delete conversations
      await tx.conversation.deleteMany({
        where: { userId: session.userId }
      });

      // Delete API usage records
      await tx.apiUsage.deleteMany({
        where: { userId: session.userId }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: session.userId }
      });
    });

    console.log(`Account deleted for user: ${user.email} (${user.name})`);

    // Clear the auth cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Account deleted successfully. We're sorry to see you go.",
      },
      { status: 200 }
    );

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to delete account" },
      { status: 500 }
    );
  }
}