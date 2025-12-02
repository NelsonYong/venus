import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();

    const providers = await prisma.modelProvider.findMany({
      where: {
        userId: user.id,
      },
      include: {
        discoveredModels: {
          orderBy: {
            modelName: "asc",
          },
        },
      },
      orderBy: {
        provider: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error("Get providers error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load providers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { provider, apiKey, apiEndpoint } = body;

    if (!provider || !apiKey || !apiEndpoint) {
      return NextResponse.json(
        { success: false, error: "Provider, API key, and endpoint are required" },
        { status: 400 }
      );
    }

    // Upsert provider configuration
    const providerConfig = await prisma.modelProvider.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: provider,
        },
      },
      update: {
        apiKey,
        apiEndpoint,
        status: "ACTIVE",
        lastTestedAt: new Date(),
        errorMessage: null,
      },
      create: {
        userId: user.id,
        provider,
        apiKey,
        apiEndpoint,
        status: "ACTIVE",
        lastTestedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      provider: providerConfig,
    });
  } catch (error) {
    console.error("Save provider error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save provider" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { providerId, models } = body;

    if (!providerId || !Array.isArray(models)) {
      return NextResponse.json(
        { success: false, error: "Provider ID and models array are required" },
        { status: 400 }
      );
    }

    // Verify provider belongs to user
    const provider = await prisma.modelProvider.findFirst({
      where: {
        id: providerId,
        userId: user.id,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Provider not found" },
        { status: 404 }
      );
    }

    // Delete existing discovered models
    await prisma.discoveredModel.deleteMany({
      where: {
        providerId,
      },
    });

    // Create new discovered models
    const createPromises = models.map((model) =>
      prisma.discoveredModel.create({
        data: {
          providerId,
          modelId: model.id,
          modelName: model.name,
          displayName: model.displayName || model.name,
          description: model.description,
          isEnabled: false,
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
          capabilities: model.capabilities,
          metadata: model.metadata,
        },
      })
    );

    await Promise.all(createPromises);

    return NextResponse.json({
      success: true,
      message: "Models saved successfully",
    });
  } catch (error) {
    console.error("Update provider models error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update models" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { modelId, isEnabled } = body;

    if (!modelId || typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Model ID and isEnabled are required" },
        { status: 400 }
      );
    }

    // Verify model belongs to user's provider
    const model = await prisma.discoveredModel.findFirst({
      where: {
        id: modelId,
        provider: {
          userId: user.id,
        },
      },
    });

    if (!model) {
      return NextResponse.json(
        { success: false, error: "Model not found" },
        { status: 404 }
      );
    }

    // Update model
    await prisma.discoveredModel.update({
      where: {
        id: modelId,
      },
      data: {
        isEnabled,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Model updated successfully",
    });
  } catch (error) {
    console.error("Toggle model error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to toggle model" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { success: false, error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Verify provider belongs to user
    const provider = await prisma.modelProvider.findFirst({
      where: {
        id: providerId,
        userId: user.id,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Provider not found" },
        { status: 404 }
      );
    }

    // Delete provider (cascades to discovered models)
    await prisma.modelProvider.delete({
      where: {
        id: providerId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Provider deleted successfully",
    });
  } catch (error) {
    console.error("Delete provider error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete provider" },
      { status: 500 }
    );
  }
}
