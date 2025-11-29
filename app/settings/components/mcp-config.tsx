"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/contexts/i18n-context";
import { McpServerItem, type McpServer } from "./mcp-server-item";
import { PlusIcon, ServerIcon, SparklesIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mcpAPI } from "@/lib/api/mcp";

export function McpConfig() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 加载服务器列表
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setIsLoading(true);
      const serverList = await mcpAPI.getAll();
      setServers(serverList);
    } catch (err) {
      console.error("Failed to load MCP servers:", err);
      setError(t("settings.developer.mcpConfig.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServer = () => {
    const newServer: McpServer = {
      id: `temp-${Date.now()}`, // 临时 ID
      name: "",
      mode: "stdio",
      command: "",
      args: [],
      env: {},
      enabled: true,
      isNew: true,
      isPersisted: false, // 标记为未持久化
    };
    setServers([newServer, ...servers]);
  };

  const handleSaveServer = async (server: McpServer) => {
    setMessage("");
    setError("");

    try {
      if (server.isPersisted === false) {
        // 创建新服务器
        const created = await mcpAPI.create({
          name: server.name,
          mode: server.mode,
          command: server.command,
          args: server.args,
          url: server.url,
          endpoint: server.endpoint,
          apiKey: server.apiKey,
          env: server.env,
          enabled: server.enabled,
        });

        // 替换临时 ID
        setServers(
          servers.map((s) =>
            s.id === server.id ? { ...created, isPersisted: true } : s
          )
        );

        setMessage(t("settings.developer.mcpConfig.createSuccess"));
      } else {
        // 更新现有服务器
        const updated = await mcpAPI.update(server.id, {
          name: server.name,
          mode: server.mode,
          command: server.command,
          args: server.args,
          url: server.url,
          endpoint: server.endpoint,
          apiKey: server.apiKey,
          env: server.env,
          enabled: server.enabled,
        });

        setServers(
          servers.map((s) =>
            s.id === server.id ? { ...updated, isPersisted: true } : s
          )
        );

        setMessage(t("settings.developer.mcpConfig.saveSuccess"));
      }

      setTimeout(() => setMessage(""), 2000);
    } catch (err: any) {
      console.error("Failed to save MCP server:", err);
      setError(err.message || t("settings.developer.mcpConfig.saveFailed"));
    }
  };

  const handleUpdateServer = async (updatedServer: McpServer) => {
    // 只更新本地状态，不立即保存
    setServers(
      servers.map((s) => (s.id === updatedServer.id ? updatedServer : s))
    );
  };

  const handleDeleteServer = async (id: string) => {
    setMessage("");
    setError("");

    const server = servers.find((s) => s.id === id);

    if (!server) return;

    // 如果是未持久化的新服务器，直接从列表移除
    if (server.isPersisted === false) {
      setServers(servers.filter((s) => s.id !== id));
      setDeleteId(null);
      return;
    }

    // 否则调用 API 删除
    try {
      await mcpAPI.delete(id);
      setServers(servers.filter((s) => s.id !== id));
      setDeleteId(null);
      setMessage(t("settings.developer.mcpConfig.deleteSuccess"));
      setTimeout(() => setMessage(""), 2000);
    } catch (err: any) {
      console.error("Failed to delete MCP server:", err);
      setError(err.message || t("settings.developer.mcpConfig.deleteFailed"));
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleCancelNew = (id: string) => {
    // 取消新建服务器
    setServers(servers.filter((s) => s.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Icon */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <ServerIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {t("settings.developer.mcpConfig.title")}
            <SparklesIcon className="w-5 h-5 text-yellow-500" />
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("settings.developer.mcpConfig.description")}
          </p>
        </div>
      </div>

      {/* Messages with Animation */}
      <div className="space-y-2">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">✕</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">✓</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Server List or Empty State */}
      {servers.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {servers.filter((s) => s.isPersisted !== false).length}{" "}
                {servers.filter((s) => s.isPersisted !== false).length === 1
                  ? "Server"
                  : "Servers"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {
                  servers.filter((s) => s.enabled && s.isPersisted !== false)
                    .length
                }{" "}
                Active
              </span>
            </div>
            <Button
              onClick={handleAddServer}
              size="sm"
              className="gap-2 shadow-sm hover:shadow transition-all duration-200"
            >
              <PlusIcon className="w-4 h-4" />
              {t("settings.developer.mcpConfig.addServer")}
            </Button>
          </div>

          <div className="space-y-3">
            {servers.map((server, index) => (
              <div
                key={server.id}
                className="animate-in slide-in-from-bottom-4 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <McpServerItem
                  server={server}
                  onUpdate={handleUpdateServer}
                  onSave={handleSaveServer}
                  onDelete={confirmDelete}
                  onCancel={handleCancelNew}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-xl transition-all duration-500" />
          <div className="relative text-center py-16 border-2 border-dashed border-border rounded-2xl transition-all duration-300 bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <ServerIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  {t("settings.developer.mcpConfig.noServers")}
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Get started by adding your first MCP server to extend AI
                  capabilities
                </p>
              </div>
              <Button
                onClick={handleAddServer}
                size="lg"
                className="gap-2 mt-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusIcon className="w-5 h-5" />
                {t("settings.developer.mcpConfig.addServer")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Info Box */}
      <div className="relative group overflow-hidden rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10" />
        <div className="relative p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                About MCP (Model Context Protocol)
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                MCP enables seamless integration with external tools and data
                sources, empowering AI with capabilities like file system
                access, database queries, API interactions, and more. Configure
                your servers to unlock new possibilities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.developer.mcpConfig.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.developer.mcpConfig.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteServer(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
