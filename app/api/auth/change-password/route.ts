import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession, hashPassword, verifyPassword } from "@/lib/auth";

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

function validatePasswordData(data: any): data is ChangePasswordData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.currentPassword === 'string' &&
    data.currentPassword.length > 0 &&
    typeof data.newPassword === 'string' &&
    data.newPassword.length >= 8
  );
}

export async function PUT(request: NextRequest) {
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
    
    if (!validatePasswordData(body)) {
      return NextResponse.json(
        { 
          error: "Invalid data", 
          message: "Current password and new password (at least 8 characters) are required" 
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = body;

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { password: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Invalid password", message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Check if new password is different from current password
    const isSamePassword = await verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: "Same password", message: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: session.userId },
      data: { 
        password: hashedNewPassword,
        updatedAt: new Date()
      },
    });

    // Optionally, invalidate all other sessions except current one
    await prisma.session.deleteMany({
      where: {
        userId: session.userId,
        token: { not: token }
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password changed successfully. Other sessions have been logged out for security.",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to change password" },
      { status: 500 }
    );
  }
}