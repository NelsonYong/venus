import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface UpdateSettingsData {
  theme?: 'system' | 'light' | 'dark';
  language?: string;
}

function validateSettingsData(data: any): data is UpdateSettingsData {
  const validThemes = ['system', 'light', 'dark'];
  const validLanguages = ['zh-CN', 'en-US', 'ja-JP'];
  
  return (
    typeof data === 'object' &&
    data !== null &&
    (!data.theme || validThemes.includes(data.theme)) &&
    (!data.language || validLanguages.includes(data.language))
  );
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    
    if (!validateSettingsData(body)) {
      return NextResponse.json(
        { error: "Invalid data", message: "Invalid settings data provided" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (body.theme) {
      updateData.theme = body.theme;
    }
    
    if (body.language) {
      updateData.language = body.language;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No data", message: "No settings to update" },
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
        image: true,
        createdAt: true,
        language: true,
        theme: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Settings updated successfully",
        user: updatedUser,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to update settings" },
      { status: 500 }
    );
  }
}