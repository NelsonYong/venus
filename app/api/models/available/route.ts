import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get all enabled models from user's configured providers
    const providers = await prisma.modelProvider.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      include: {
        discoveredModels: {
          where: {
            isEnabled: true,
          },
          orderBy: {
            modelName: "asc",
          },
        },
      },
    });

    // Transform discovered models to the expected format
    const models = providers.flatMap(provider =>
      provider.discoveredModels.map(model => ({
        id: model.modelId,
        name: model.modelName,
        displayName: model.displayName || model.modelName,
        provider: provider.provider,
        isPreset: false,
        apiEndpoint: provider.apiEndpoint,
        apiKey: provider.apiKey,
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
      }))
    );

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (error) {
    console.error("Get available models error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load models" },
      { status: 500 }
    );
  }
}
