import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type McpMode = "stdio" | "sse" | "streamable";

interface McpServerUpdateData {
  name?: string;
  mode?: McpMode;
  command?: string;
  args?: string[];
  url?: string;
  endpoint?: string;
  apiKey?: string;
  env?: Record<string, string>;
  enabled?: boolean;
}

function validateMcpServerUpdateData(data: any): data is McpServerUpdateData {
  return (
    typeof data === "object" &&
    data !== null &&
    (!data.name || (typeof data.name === "string" && data.name.trim().length > 0)) &&
    (!data.mode || (typeof data.mode === "string" && ["stdio", "sse", "streamable"].includes(data.mode))) &&
    (!data.command || typeof data.command === "string") &&
    (!data.args || Array.isArray(data.args)) &&
    (!data.url || typeof data.url === "string") &&
    (!data.endpoint || typeof data.endpoint === "string") &&
    (!data.apiKey || typeof data.apiKey === "string") &&
    (!data.env || typeof data.env === "object") &&
    (!data.enabled || typeof data.enabled === "boolean")
  );
}

// PUT - 更新 MCP 服务器
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const serverId = params.id;

    // 验证服务器是否存在且属于当前用户
    const existingServer = await prisma.mcpServer.findUnique({
      where: { id: serverId },
    });

    if (!existingServer) {
      return NextResponse.json(
        { error: "Not found", message: "MCP server not found" },
        { status: 404 }
      );
    }

    if (existingServer.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You don't have permission to update this server" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!validateMcpServerUpdateData(body)) {
      return NextResponse.json(
        { error: "Invalid data", message: "Invalid MCP server data" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.mode !== undefined) {
      updateData.mode = body.mode;
    }
    if (body.command !== undefined) {
      updateData.command = body.command.trim() || null;
    }
    if (body.args !== undefined) {
      updateData.args = body.args;
    }
    if (body.url !== undefined) {
      updateData.url = body.url.trim() || null;
    }
    if (body.endpoint !== undefined) {
      updateData.endpoint = body.endpoint.trim() || null;
    }
    if (body.apiKey !== undefined) {
      updateData.apiKey = body.apiKey.trim() || null;
    }
    if (body.env !== undefined) {
      updateData.env = body.env;
    }
    if (body.enabled !== undefined) {
      updateData.enabled = body.enabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No data", message: "No data to update" },
        { status: 400 }
      );
    }

    const updatedServer = await prisma.mcpServer.update({
      where: { id: serverId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "MCP server updated successfully",
      server: {
        id: updatedServer.id,
        name: updatedServer.name,
        mode: updatedServer.mode,
        command: updatedServer.command,
        args: updatedServer.args,
        url: updatedServer.url,
        endpoint: updatedServer.endpoint,
        apiKey: updatedServer.apiKey,
        env: updatedServer.env || {},
        enabled: updatedServer.enabled,
        createdAt: updatedServer.createdAt,
        updatedAt: updatedServer.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update MCP server error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update MCP server",
      },
      { status: 500 }
    );
  }
}

// DELETE - 删除 MCP 服务器
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const serverId = params.id;

    // 验证服务器是否存在且属于当前用户
    const existingServer = await prisma.mcpServer.findUnique({
      where: { id: serverId },
    });

    if (!existingServer) {
      return NextResponse.json(
        { error: "Not found", message: "MCP server not found" },
        { status: 404 }
      );
    }

    if (existingServer.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You don't have permission to delete this server" },
        { status: 403 }
      );
    }

    await prisma.mcpServer.delete({
      where: { id: serverId },
    });

    return NextResponse.json({
      success: true,
      message: "MCP server deleted successfully",
    });
  } catch (error) {
    console.error("Delete MCP server error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to delete MCP server",
      },
      { status: 500 }
    );
  }
}
