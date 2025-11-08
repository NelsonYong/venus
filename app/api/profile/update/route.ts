import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface UpdateProfileData {
  name?: string;
  avatar?: string;
}

function validateUpdateData(data: any): data is UpdateProfileData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (!data.name || (typeof data.name === 'string' && data.name.trim().length >= 1)) &&
    (!data.avatar || typeof data.avatar === 'string')
  );
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();

    if (!validateUpdateData(body)) {
      return NextResponse.json(
        { error: "Invalid data", message: "Invalid profile data provided" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.name) {
      updateData.name = body.name.trim();
    }

    if (body.avatar !== undefined) {
      updateData.avatar = body.avatar || null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No data", message: "No data to update" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        language: true,
        theme: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to update profile" },
      { status: 500 }
    );
  }
}