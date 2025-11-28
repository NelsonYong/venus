import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

interface ModelInfo {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
}

async function testDeepSeek(apiKey: string, apiEndpoint: string): Promise<ModelInfo[]> {
  const response = await fetch(`${apiEndpoint}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.data.map((model: any) => ({
    id: model.id,
    name: model.id,
    displayName: model.id,
    description: model.description,
  }));
}

async function testOpenAI(apiKey: string, apiEndpoint: string): Promise<ModelInfo[]> {
  const response = await fetch(`${apiEndpoint}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.data
    .filter((model: any) => model.id.includes("gpt") || model.id.includes("o1"))
    .map((model: any) => ({
      id: model.id,
      name: model.id,
      displayName: model.id,
      contextWindow: model.context_length,
    }));
}

async function testAnthropic(apiKey: string, apiEndpoint: string): Promise<ModelInfo[]> {
  // Anthropic doesn't have a models list endpoint, return known models
  const testResponse = await fetch(`${apiEndpoint}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1,
      messages: [{ role: "user", content: "test" }],
    }),
  });

  if (!testResponse.ok) {
    throw new Error(`Anthropic API error: ${testResponse.statusText}`);
  }

  return [
    { id: "claude-3-5-sonnet-20241022", name: "claude-3-5-sonnet-20241022", displayName: "Claude 3.5 Sonnet", contextWindow: 200000 },
    { id: "claude-3-5-haiku-20241022", name: "claude-3-5-haiku-20241022", displayName: "Claude 3.5 Haiku", contextWindow: 200000 },
    { id: "claude-3-opus-20240229", name: "claude-3-opus-20240229", displayName: "Claude 3 Opus", contextWindow: 200000 },
  ];
}

async function testGoogle(apiKey: string, apiEndpoint: string): Promise<ModelInfo[]> {
  const response = await fetch(`${apiEndpoint}/models?key=${apiKey}`);

  if (!response.ok) {
    throw new Error(`Google API error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.models
    .filter((model: any) => model.name.includes("gemini"))
    .map((model: any) => ({
      id: model.name.replace("models/", ""),
      name: model.name.replace("models/", ""),
      displayName: model.displayName || model.name,
      description: model.description,
    }));
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { provider, apiKey, apiEndpoint } = body;

    if (!provider || !apiKey || !apiEndpoint) {
      return NextResponse.json(
        { success: false, error: "Provider, API key, and endpoint are required" },
        { status: 400 }
      );
    }

    let models: ModelInfo[] = [];

    try {
      switch (provider.toLowerCase()) {
        case "deepseek":
          models = await testDeepSeek(apiKey, apiEndpoint);
          break;
        case "openai":
          models = await testOpenAI(apiKey, apiEndpoint);
          break;
        case "anthropic":
          models = await testAnthropic(apiKey, apiEndpoint);
          break;
        case "google":
        case "gemini":
          models = await testGoogle(apiKey, apiEndpoint);
          break;
        default:
          return NextResponse.json(
            { success: false, error: `Unsupported provider: ${provider}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        models,
      });
    } catch (error: any) {
      console.error("Provider test error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to connect to provider",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Test provider error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
