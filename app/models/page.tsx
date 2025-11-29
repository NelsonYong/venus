"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Navbar } from "@/app/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { httpClient } from "@/lib/http-client";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import {
  CpuIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";

interface DiscoveredModel {
  id: string;
  modelId: string;
  modelName: string;
  displayName?: string;
  description?: string;
  isEnabled: boolean;
  contextWindow?: number;
  maxTokens?: number;
}

interface ModelProvider {
  id: string;
  provider: string;
  apiKey: string;
  apiEndpoint: string;
  status: "UNCONFIGURED" | "TESTING" | "ACTIVE" | "ERROR";
  lastTestedAt?: string;
  errorMessage?: string;
  discoveredModels: DiscoveredModel[];
}

interface ProviderConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  defaultEndpoint: string;
  enabled: boolean;
}

const MODEL_PROVIDERS: ProviderConfig[] = [
  {
    id: "deepseek",
    name: "deepseek",
    displayName: "DeepSeek",
    description: "DeepSeek AI - 高性能的中文大语言模型",
    enabled: true,
    defaultEndpoint: "https://api.deepseek.com/v1",
  },
  {
    id: "openai",
    name: "openai",
    displayName: "OpenAI",
    description: "OpenAI - GPT 系列模型",
    enabled: true,
    defaultEndpoint: "https://api.openai.com/v1",
  },
  {
    id: "anthropic",
    name: "anthropic",
    displayName: "Anthropic",
    description: "Anthropic - Claude 系列模型",
    enabled: true,
    defaultEndpoint: "https://api.anthropic.com/v1",
  },
  {
    id: "google",
    name: "google",
    displayName: "Google",
    description: "Google - Gemini 系列模型",
    enabled: true,
    defaultEndpoint: "https://generativelanguage.googleapis.com/v1",
  },
];

function ModelsList({
  models,
  onToggle,
}: {
  models: DiscoveredModel[];
  onToggle: (modelId: string, isEnabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t("models.noModelsDiscovered")}
      </div>
    );
  }

  // 过滤模型
  const filteredModels = models.filter((model) =>
    (model.displayName || model.modelName)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const enabledCount = models.filter((m) => m.isEnabled).length;

  return (
    <div className="space-y-3">
      {/* 简化的搜索栏 */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("models.searchModels")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {enabledCount}/{models.length}
        </span>
      </div>

      {/* 简化的模型列表 */}
      {filteredModels.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm">
          {t("models.noMatchingModels")}
        </div>
      ) : (
        <div className="space-y-0">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/50 rounded-md group"
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {model.displayName || model.modelName}
                  </span>
                  {model.contextWindow && (
                    <span className="text-xs text-muted-foreground">
                      {(model.contextWindow / 1000).toFixed(0)}K
                    </span>
                  )}
                </div>
                {model.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {model.description}
                  </p>
                )}
              </div>
              <Switch
                checked={model.isEnabled}
                onCheckedChange={(checked) => onToggle(model.id, checked)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  config,
  onTest,
  onSave,
  onDelete,
  onToggleModel,
}: {
  provider: ModelProvider | null;
  config: ProviderConfig;
  onTest: (provider: string, apiKey: string, apiEndpoint: string) => void;
  onSave: (provider: string, apiKey: string, apiEndpoint: string) => void;
  onDelete: (providerId: string) => void;
  onToggleModel: (modelId: string, isEnabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiKey, setApiKey] = useState(provider?.apiKey || "");
  const [apiEndpoint, setApiEndpoint] = useState(
    provider?.apiEndpoint || config.defaultEndpoint
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasConfig = !!provider;
  const isActive = provider?.status === "ACTIVE";
  const hasError = provider?.status === "ERROR";
  const hasModels = (provider?.discoveredModels?.length || 0) > 0;
  const enabledCount =
    provider?.discoveredModels?.filter((m) => m.isEnabled).length || 0;

  const handleTest = async () => {
    if (!apiKey || !apiEndpoint) return;

    setIsTesting(true);
    try {
      await onTest(config.id, apiKey, apiEndpoint);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!apiKey || !apiEndpoint) return;
    onSave(config.id, apiKey, apiEndpoint);
  };

  const handleDelete = () => {
    if (provider?.id) {
      onDelete(provider.id);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="border-border cursor-pointer">
        <CardContent className="p-0">
          {/* 简化的Provider头部 */}
          <div
            className="flex items-center justify-between p-4 "
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ModelSelectorLogo
                provider={config.id}
                className="w-8 h-8 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {config.displayName}
                  </h3>
                  {isActive && (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  )}
                  {hasError && (
                    <AlertCircleIcon className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasModels
                    ? `${enabledCount}/${
                        provider?.discoveredModels?.length
                      } ${t("models.modelsEnabled")}`
                    : config.description}
                </p>
              </div>
            </div>
            <ChevronDownIcon
              className={`w-5 h-5 text-muted-foreground transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>

          {/* 展开的配置内容 */}
          {isExpanded && (
            <div className="border-t p-4 space-y-4">
              {/* 配置表单 */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("models.apiEndpoint")}
                  </label>
                  <Input
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder={config.defaultEndpoint}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("models.apiKey")}
                  </label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxx"
                      className="h-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOffIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 简化的操作按钮 */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleTest}
                    disabled={!apiKey || !apiEndpoint || isTesting}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {isTesting ? (
                      <>
                        <Loader2Icon className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        {t("models.testing")}
                      </>
                    ) : (
                      <>
                        <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5" />
                        {t("models.testConnection")}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!apiKey || !apiEndpoint}
                    size="sm"
                    className="flex-1"
                  >
                    <CheckIcon className="w-3.5 h-3.5 mr-1.5" />
                    {t("models.save")}
                  </Button>
                  {hasConfig && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="px-2"
                    >
                      <TrashIcon className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 错误信息 */}
              {hasError && provider?.errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertCircleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    {provider.errorMessage}
                  </p>
                </div>
              )}

              {/* 简化的模型列表 */}
              {hasModels && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">
                      {t("models.availableModels")}
                    </h4>
                  </div>
                  <ModelsList
                    models={provider?.discoveredModels || []}
                    onToggle={onToggleModel}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("models.deleteProviderConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("models.deleteProviderConfirm.message", {
                name: config.displayName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ModelsContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setIsLoading(true);
      const response = await httpClient.get<{
        success: boolean;
        providers: ModelProvider[];
      }>("/api/models/providers");
      if (response.status === 200 && response.data?.providers) {
        setProviders(response.data.providers);
      }
    } catch (error) {
      console.error("Load providers error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestProvider = async (
    provider: string,
    apiKey: string,
    apiEndpoint: string
  ) => {
    setMessage("");
    setError("");

    try {
      const response = await httpClient.post<{
        success: boolean;
        models: any[];
        error?: string;
      }>("/api/models/test-provider", {
        provider,
        apiKey,
        apiEndpoint,
      });

      if (response.status === 200 && response.data?.success) {
        setMessage(
          t("models.connectionSuccess", {
            count: response.data.models.length,
          })
        );

        // Save provider configuration
        const saveResponse = await httpClient.post("/api/models/providers", {
          provider,
          apiKey,
          apiEndpoint,
        });

        if (
          saveResponse.status === 200 &&
          (saveResponse.data as any)?.success
        ) {
          const providerConfig = (saveResponse.data as any).provider;

          // Save discovered models
          await httpClient.put("/api/models/providers", {
            providerId: providerConfig.id,
            models: response.data.models,
          });

          await loadProviders();
        }
      } else {
        setError(response.data?.error || t("models.connectionFailed"));
      }
    } catch (error: any) {
      console.error("Test provider error:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          t("models.connectionFailed")
      );
    }
  };

  const handleSaveProvider = async (
    provider: string,
    apiKey: string,
    apiEndpoint: string
  ) => {
    setMessage("");
    setError("");

    try {
      const response = await httpClient.post("/api/models/providers", {
        provider,
        apiKey,
        apiEndpoint,
      });

      if (response.status === 200 && (response.data as any)?.success) {
        setMessage(t("models.saveSuccess"));
        await loadProviders();
      }
    } catch (error) {
      console.error("Save provider error:", error);
      setError(t("models.saveFailed"));
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    setMessage("");
    setError("");

    try {
      const response = await httpClient.delete(
        `/api/models/providers?providerId=${providerId}`
      );

      if (response.status === 200 && (response.data as any)?.success) {
        setMessage(t("models.deleteSuccess"));
        await loadProviders();
      }
    } catch (error) {
      console.error("Delete provider error:", error);
      setError(t("models.deleteFailed"));
    }
  };

  const handleToggleModel = async (modelId: string, isEnabled: boolean) => {
    try {
      const response = await httpClient.patch("/api/models/providers", {
        modelId,
        isEnabled,
      });

      if (response.status === 200 && (response.data as any)?.success) {
        // Update local state
        setProviders((prev) =>
          prev.map((provider) => ({
            ...provider,
            discoveredModels: provider.discoveredModels.map((model) =>
              model.id === modelId ? { ...model, isEnabled } : model
            ),
          }))
        );
      }
    } catch (error) {
      console.error("Toggle model error:", error);
      setError(t("models.toggleFailed"));
    }
  };

  if (!user) return null;

  const enabledProviders = MODEL_PROVIDERS.filter((p) => p.enabled);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 max-w-4xl mx-auto p-6 overflow-auto w-full">
        <div className="space-y-6">
          {/* 简化的Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CpuIcon className="w-6 h-6" />
              {t("models.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("models.subtitle")}
            </p>
          </div>

          {/* 消息提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm text-green-600 dark:text-green-400">
                {message}
              </p>
            </div>
          )}

          {/* Provider列表 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {enabledProviders.map((config) => {
                const provider = providers.find(
                  (p) => p.provider === config.id
                );
                return (
                  <ProviderCard
                    key={config.id}
                    provider={provider || null}
                    config={config}
                    onTest={handleTestProvider}
                    onSave={handleSaveProvider}
                    onDelete={handleDeleteProvider}
                    onToggleModel={handleToggleModel}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return <ModelsContent />;
}
