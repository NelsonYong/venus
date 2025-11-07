import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";

interface McpServerData {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

function validateMcpServerData(data: any): data is McpServerData {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.name === "string" &&
    data.name.trim().length > 0 &&
    typeof data.command === "string" &&
    data.command.trim().length > 0 &&
    (!data.args || Array.isArray(data.args)) &&
    (!data.env || typeof data.env === "object") &&
    (!data.enabled || typeof data.enabled === "boolean")
  );
}

// GET - 获取用户的所有 MCP 服务器
export async function GET(request: NextRequest) {
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

    const servers = await prisma.mcpServer.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      servers: servers.map((server) => ({
        id: server.id,
        name: server.name,
        command: server.command,
        args: server.args,
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

    if (!validateMcpServerData(body)) {
      return NextResponse.json(
        {
          error: "Invalid data",
          message: "Invalid MCP server data. Name and command are required.",
        },
        { status: 400 }
      );
    }

    const server = await prisma.mcpServer.create({
      data: {
        userId: session.userId,
        name: body.name.trim(),
        command: body.command.trim(),
        args: body.args || [],
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
          command: server.command,
          args: server.args,
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
