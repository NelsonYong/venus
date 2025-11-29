import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type McpMode = "stdio" | "sse" | "streamable";

interface McpServerData {
  name: string;
  mode: McpMode;
  // stdio mode fields
  command?: string;
  args?: string[];
  // sse mode fields
  url?: string;
  // streamable mode fields
  endpoint?: string;
  apiKey?: string;
  // common fields
  env?: Record<string, string>;
  enabled?: boolean;
}

function validateMcpServerData(data: any): data is McpServerData {
  const isValidBase =
    typeof data === "object" &&
    data !== null &&
    typeof data.name === "string" &&
    data.name.trim().length > 0 &&
    typeof data.mode === "string" &&
    ["stdio", "sse", "streamable"].includes(data.mode) &&
    (!data.args || Array.isArray(data.args)) &&
    (!data.env || typeof data.env === "object") &&
    (!data.enabled || typeof data.enabled === "boolean");

  if (!isValidBase) return false;

  // 根据模式验证必填字段
  if (data.mode === "stdio") {
    return typeof data.command === "string" && data.command.trim().length > 0;
  } else if (data.mode === "sse") {
    return typeof data.url === "string" && data.url.trim().length > 0;
  } else if (data.mode === "streamable") {
    return typeof data.endpoint === "string" && data.endpoint.trim().length > 0;
  }

  return false;
}

// GET - 获取用户的所有 MCP 服务器
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const servers = await prisma.mcpServer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      servers: servers.map((server) => ({
        id: server.id,
        name: server.name,
        mode: server.mode,
        command: server.command,
        args: server.args,
        url: server.url,
        endpoint: server.endpoint,
        apiKey: server.apiKey,
        env: server.env || {},
        enabled: server.enabled,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get MCP servers error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to get MCP servers" },
      { status: 500 }
    );
  }
}

// POST - 创建新的 MCP 服务器
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();

    if (!validateMcpServerData(body)) {
      return NextResponse.json(
        {
          error: "Invalid data",
          message: "Invalid MCP server data. Name, mode, and mode-specific fields are required.",
        },
        { status: 400 }
      );
    }

    const server = await prisma.mcpServer.create({
      data: {
        userId: user.id,
        name: body.name.trim(),
        mode: body.mode,
        command: body.command?.trim() || null,
        args: body.args || [],
        url: body.url?.trim() || null,
        endpoint: body.endpoint?.trim() || null,
        apiKey: body.apiKey?.trim() || null,
        env: body.env || {},
        enabled: body.enabled !== undefined ? body.enabled : true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "MCP server created successfully",
        server: {
          id: server.id,
          name: server.name,
          mode: server.mode,
          command: server.command,
          args: server.args,
          url: server.url,
          endpoint: server.endpoint,
          apiKey: server.apiKey,
          env: server.env || {},
          enabled: server.enabled,
          createdAt: server.createdAt,
          updatedAt: server.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create MCP server error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to create MCP server",
      },
      { status: 500 }
    );
  }
}
