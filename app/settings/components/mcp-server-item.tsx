"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  SaveIcon,
  TrashIcon,
  PlusIcon,
  XIcon,
  TerminalIcon,
  KeyIcon,
  ListIcon,
} from "lucide-react";

export interface McpServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  isNew?: boolean;
}

interface McpServerItemProps {
  server: McpServer;
  onUpdate: (server: McpServer) => void;
  onDelete: (id: string) => void;
}

export function McpServerItem({ server, onUpdate, onDelete }: McpServerItemProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(server.isNew || false);
  const [editedServer, setEditedServer] = useState<McpServer>(server);

  const handleSave = () => {
    if (!editedServer.name.trim() || !editedServer.command.trim()) {
      return;
    }
    onUpdate(editedServer);
  };

  const handleToggleEnabled = () => {
    const updated = { ...editedServer, enabled: !editedServer.enabled };
    setEditedServer(updated);
    onUpdate(updated);
  };

  const addArg = () => {
    setEditedServer({
      ...editedServer,
      args: [...editedServer.args, ""],
    });
  };

  const updateArg = (index: number, value: string) => {
    const newArgs = [...editedServer.args];
    newArgs[index] = value;
    setEditedServer({ ...editedServer, args: newArgs });
  };

  const removeArg = (index: number) => {
    const newArgs = editedServer.args.filter((_, i) => i !== index);
    setEditedServer({ ...editedServer, args: newArgs });
  };

  const addEnvVar = () => {
    const newKey = `VAR_${Object.keys(editedServer.env || {}).length + 1}`;
    setEditedServer({
      ...editedServer,
      env: { ...editedServer.env, [newKey]: "" },
    });
  };

  const updateEnvKey = (oldKey: string, newKey: string) => {
    const env = { ...editedServer.env };
    const value = env[oldKey];
    delete env[oldKey];
    env[newKey] = value;
    setEditedServer({ ...editedServer, env });
  };

  const updateEnvValue = (key: string, value: string) => {
    setEditedServer({
      ...editedServer,
      env: { ...editedServer.env, [key]: value },
    });
  };

  const removeEnvVar = (key: string) => {
    const env = { ...editedServer.env };
    delete env[key];
    setEditedServer({ ...editedServer, env });
  };

  const hasChanges = JSON.stringify(editedServer) !== JSON.stringify(server);

  return (
    <Card className="group border-border hover:border-primary/30 transition-all duration-300 hover:shadow-md overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-background rounded-md transition-all duration-200"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {server.name || t("settings.developer.mcpConfig.untitled")}
              </h3>
              {server.isNew && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                  New
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
              {server.command ? (
                <>
                  <TerminalIcon className="w-3 h-3 inline mr-1" />
                  {server.command} {server.args.join(" ")}
                </>
              ) : (
                "No command configured"
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={editedServer.enabled}
                onCheckedChange={handleToggleEnabled}
              />
              <span className={`text-xs font-medium ${editedServer.enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                {editedServer.enabled ? 'ON' : 'OFF'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(server.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-6 space-y-6 border-t border-border bg-background animate-in slide-in-from-top-2 duration-200">
            {/* Server Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {t("settings.developer.mcpConfig.serverName")}
                <span className="text-destructive">*</span>
              </label>
              <Input
                value={editedServer.name}
                onChange={(e) =>
                  setEditedServer({ ...editedServer, name: e.target.value })
                }
                placeholder={t("settings.developer.mcpConfig.serverNamePlaceholder")}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Command */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-primary" />
                {t("settings.developer.mcpConfig.command")}
                <span className="text-destructive">*</span>
              </label>
              <Input
                value={editedServer.command}
                onChange={(e) =>
                  setEditedServer({ ...editedServer, command: e.target.value })
                }
                placeholder={t("settings.developer.mcpConfig.commandPlaceholder")}
                className="font-mono text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Arguments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ListIcon className="w-4 h-4 text-primary" />
                  {t("settings.developer.mcpConfig.args")}
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                    {editedServer.args.length}
                  </span>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addArg}
                  className="gap-2 h-8"
                >
                  <PlusIcon className="w-3 h-3" />
                  Add
                </Button>
              </div>
              {editedServer.args.length > 0 && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
                  {editedServer.args.map((arg, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex items-center justify-center w-6 h-9 text-xs text-muted-foreground font-medium">
                        {index + 1}
                      </div>
                      <Input
                        value={arg}
                        onChange={(e) => updateArg(index, e.target.value)}
                        placeholder={t("settings.developer.mcpConfig.argsPlaceholder")}
                        className="font-mono text-sm flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArg(index)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Environment Variables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <KeyIcon className="w-4 h-4 text-primary" />
                  {t("settings.developer.mcpConfig.env")}
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                    {Object.keys(editedServer.env || {}).length}
                  </span>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEnvVar}
                  className="gap-2 h-8"
                >
                  <PlusIcon className="w-3 h-3" />
                  Add
                </Button>
              </div>
              {Object.keys(editedServer.env || {}).length > 0 && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
                  {Object.entries(editedServer.env || {}).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <Input
                        value={key}
                        onChange={(e) => updateEnvKey(key, e.target.value)}
                        placeholder={t("settings.developer.mcpConfig.envKey")}
                        className="flex-1 font-mono text-sm"
                      />
                      <div className="flex items-center justify-center text-muted-foreground px-1">
                        =
                      </div>
                      <Input
                        value={value}
                        onChange={(e) => updateEnvValue(key, e.target.value)}
                        placeholder={t("settings.developer.mcpConfig.envValue")}
                        className="flex-1 font-mono text-sm"
                        type="password"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEnvVar(key)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={!editedServer.name.trim() || !editedServer.command.trim()}
                className="gap-2 shadow-sm hover:shadow transition-all duration-200"
              >
                <SaveIcon className="w-4 h-4" />
                {t("settings.developer.mcpConfig.save")}
              </Button>
              {hasChanges && (
                <Button
                  onClick={() => setEditedServer(server)}
                  variant="outline"
                  className="gap-2"
                >
                  <XIcon className="w-4 h-4" />
                  {t("settings.developer.mcpConfig.cancel")}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
