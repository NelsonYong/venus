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

    // Get all preset models and user's configured models
    const models = await prisma.aiModel.findMany({
      where: {
        OR: [
          { isPreset: true },
          { createdBy: session.userId },
        ],
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        apiKey: true,
        apiEndpoint: true,
        isActive: true,
        provider: true,
        isPreset: true,
      },
      orderBy: [
        { isPreset: "desc" }, // Preset models first
        { createdAt: "desc" },
      ],
    });

    // Mask API keys for preset models
    const maskedModels = models.map(model => ({
      ...model,
      apiKey: model.isPreset ? "****************************" : model.apiKey,
    }));

    return NextResponse.json({
      success: true,
      models: maskedModels,
    });
  } catch (error) {
    console.error("Get user models error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load models" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { models } = body;

    if (!Array.isArray(models)) {
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      );
    }

    // Validate all models
    for (const model of models) {
      if (!model.name || !model.displayName || !model.apiKey || !model.provider) {
        return NextResponse.json(
          { success: false, error: "All fields are required" },
          { status: 400 }
        );
      }

      // Validate provider (currently only DeepSeek is supported)
      if (model.provider !== "deepseek") {
        return NextResponse.json(
          {
            success: false,
            error: "Only DeepSeek models are currently supported",
          },
          { status: 400 }
        );
      }
    }

    // Group models by provider
    const modelsByProvider = models.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, typeof models>);

    // Delete and recreate models for each provider
    for (const [provider, providerModels] of Object.entries(modelsByProvider)) {
      // Delete existing user's models for this provider (exclude preset models)
      await prisma.aiModel.deleteMany({
        where: {
          createdBy: session.userId,
          provider: provider,
          isPreset: false, // Only delete non-preset models
        },
      });

      // Create new models for this provider
      const createPromises = providerModels.map((model) =>
        prisma.aiModel.create({
          data: {
            name: model.name,
            displayName: model.displayName,
            provider: model.provider,
            apiEndpoint: model.apiEndpoint,
            apiKey: model.apiKey,
            apiKeyName: "Authorization",
            isActive: model.isActive !== undefined ? model.isActive : true,
            isPreset: false, // User-configured models are not preset
            createdBy: session.userId,
            modelType: "TEXT",
            headers: {
              "Content-Type": "application/json",
            },
            requestFormat: {
              messages: "messages",
              model: "model",
              temperature: "temperature",
              max_tokens: "max_tokens",
            },
            responseFormat: {
              content: "choices.0.message.content",
              role: "choices.0.message.role",
              finish_reason: "choices.0.finish_reason",
            },
          },
        })
      );

      await Promise.all(createPromises);
    }

    return NextResponse.json({
      success: true,
      message: "Models saved successfully",
    });
  } catch (error) {
    console.error("Save user models error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save models" },
      { status: 500 }
    );
  }
}
