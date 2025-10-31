import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const session = await validateSession(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all active models (preset models and user's configured models)
    const models = await prisma.aiModel.findMany({
      where: {
        OR: [
          { isPreset: true },
          { createdBy: session.userId },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        provider: true,
        isPreset: true,
        apiEndpoint: true,
        apiKey: true,
      },
      orderBy: [
        { isPreset: "desc" }, // Preset models first
        { createdAt: "desc" },
      ],
    });

    // Mask API keys for preset models
    const maskedModels = models.map(model => ({
      ...model,
      apiKey: model.isPreset ? "····" : model.apiKey,
    }));

    return NextResponse.json({
      success: true,
      models: maskedModels,
    });
  } catch (error) {
    console.error("Get available models error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load models" },
      { status: 500 }
    );
  }
}
