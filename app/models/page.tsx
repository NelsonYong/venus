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
  ChevronUpIcon,
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
import { Badge } from "@/components/ui/badge";

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
  onBatchToggle,
}: {
  models: DiscoveredModel[];
  onToggle: (modelId: string, isEnabled: boolean) => void;
  onBatchToggle: (modelIds: string[], isEnabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("models.noModelsDiscovered")}
      </div>
    );
  }

  // 按模型系列分组
  const groupModels = (models: DiscoveredModel[]) => {
    const groups: Record<string, DiscoveredModel[]> = {};

    models.forEach((model) => {
      const modelName = model.modelName.toLowerCase();
      let groupKey = "other";

      // 智能分组逻辑
      if (modelName.includes("gpt-4")) groupKey = "GPT-4";
      else if (modelName.includes("gpt-3.5")) groupKey = "GPT-3.5";
      else if (modelName.includes("o1")) groupKey = "O1";
      else if (
        modelName.includes("claude-3.5") ||
        modelName.includes("claude-3-5")
      )
        groupKey = "Claude 3.5";
      else if (modelName.includes("claude-3-opus")) groupKey = "Claude 3 Opus";
      else if (modelName.includes("claude-3")) groupKey = "Claude 3";
      else if (modelName.includes("claude")) groupKey = "Claude";
      else if (modelName.includes("gemini-2")) groupKey = "Gemini 2.0";
      else if (modelName.includes("gemini-1.5")) groupKey = "Gemini 1.5";
      else if (modelName.includes("gemini")) groupKey = "Gemini";
      else if (modelName.includes("deepseek-chat")) groupKey = "DeepSeek Chat";
      else if (modelName.includes("deepseek-reasoner"))
        groupKey = "DeepSeek Reasoner";
      else if (modelName.includes("deepseek")) groupKey = "DeepSeek";

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(model);
    });

    return groups;
  };

  // 过滤模型
  const filteredModels = models.filter((model) =>
    (model.displayName || model.modelName)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const groupedModels = groupModels(filteredModels);
  const groupKeys = Object.keys(groupedModels).sort((a, b) => {
    // "other" 组放最后
    if (a === "other") return 1;
    if (b === "other") return -1;
    return a.localeCompare(b);
  });

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const enabledCount = models.filter((m) => m.isEnabled).length;
  const totalCount = models.length;

  const handleSelectAll = () => {
    const modelIds = filteredModels.map((m) => m.id);
    onBatchToggle(modelIds, true);
  };

  const handleDeselectAll = () => {
    const modelIds = filteredModels.map((m) => m.id);
    onBatchToggle(modelIds, false);
  };

  const handleGroupToggle = (
    groupModels: DiscoveredModel[],
    enable: boolean
  ) => {
    const modelIds = groupModels.map((m) => m.id);
    onBatchToggle(modelIds, enable);
  };

  return (
    <div className="space-y-4">
      {/* 搜索和批量操作 */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Input
            placeholder={t("models.searchModels")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Badge variant="secondary">
            {enabledCount}/{totalCount} {t("models.enabled")}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredModels.length === 0}
          >
            {t("models.selectAll")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={filteredModels.length === 0}
          >
            {t("models.deselectAll")}
          </Button>
        </div>
      </div>

      {/* 分组显示 */}
      {filteredModels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("models.noMatchingModels")}
        </div>
      ) : (
        <div className="space-y-2">
          {groupKeys.map((groupKey) => {
            const groupModels = groupedModels[groupKey];
            const isExpanded = expandedGroups.has(groupKey);
            const groupEnabledCount = groupModels.filter(
              (m) => m.isEnabled
            ).length;

            return (
              <Card key={groupKey} className="border-border">
                <CardContent className="p-0">
                  {/* 分组头部 */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronUpIcon className="w-4 h-4" />
                        )}
                      </Button>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {groupKey}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {groupEnabledCount}/{groupModels.length}{" "}
                          {t("models.enabled")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupToggle(groupModels, true);
                        }}
                      >
                        {t("models.enableAll")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupToggle(groupModels, false);
                        }}
                      >
                        {t("models.disableAll")}
                      </Button>
                    </div>
                  </div>

                  {/* 分组内容 */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {groupModels.map((model) => (
                        <div
                          key={model.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/30 border-b border-border last:border-b-0"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center space-x-2">
                              <h5 className="text-sm font-medium text-foreground">
                                {model.displayName || model.modelName}
                              </h5>
                              {model.isEnabled && (
                                <Badge variant="default" className="text-xs">
                                  {t("models.enabled")}
                                </Badge>
                              )}
                            </div>
                            {model.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {model.description}
                              </p>
                            )}
                            {model.contextWindow && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Context: {model.contextWindow.toLocaleString()}{" "}
                                tokens
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={model.isEnabled}
                            onCheckedChange={(checked) =>
                              onToggle(model.id, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
  onBatchToggleModel,
}: {
  provider: ModelProvider | null;
  config: ProviderConfig;
  onTest: (provider: string, apiKey: string, apiEndpoint: string) => void;
  onSave: (provider: string, apiKey: string, apiEndpoint: string) => void;
  onDelete: (providerId: string) => void;
  onToggleModel: (modelId: string, isEnabled: boolean) => void;
  onBatchToggleModel: (modelIds: string[], isEnabled: boolean) => void;
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
      <Card className="border-border w-full">
        <CardContent className="p-6 w-full">
          <div className="space-y-4 w-full">
            {/* Provider Header */}
            <div
              className="flex items-center justify-between cursor-pointer w-full"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <ModelSelectorLogo provider={config.id} className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {config.displayName}
                    </h2>
                    {isActive && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        {t("models.connected")}
                      </Badge>
                    )}
                    {hasError && (
                      <Badge variant="destructive">
                        <AlertCircleIcon className="w-3 h-3 mr-1" />
                        {t("models.error")}
                      </Badge>
                    )}
                    {hasModels && (
                      <Badge variant="secondary">
                        {enabledCount}/{provider?.discoveredModels?.length}{" "}
                        {t("models.modelsEnabled")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Provider Content */}
            {isExpanded && (
              <div className="space-y-4 pt-4 border-t w-full">
                {/* Configuration Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("models.apiEndpoint")}
                    </label>
                    <Input
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder={config.defaultEndpoint}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("models.apiKey")}
                    </label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-xxxxxxxxxxxxx"
                        className="pr-10"
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

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleTest}
                      disabled={!apiKey || !apiEndpoint || isTesting}
                      variant="outline"
                      className="flex-1"
                    >
                      {isTesting ? (
                        <>
                          <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                          {t("models.testing")}
                        </>
                      ) : (
                        <>
                          <RefreshCwIcon className="w-4 h-4 mr-2" />
                          {t("models.testConnection")}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={!apiKey || !apiEndpoint}
                      className="flex-1"
                    >
                      <CheckIcon className="w-4 h-4 mr-2" />
                      {t("models.save")}
                    </Button>
                    {hasConfig && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {hasError && provider?.errorMessage && (
                  <Card className="border-destructive bg-destructive/10">
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircleIcon className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">
                          {provider.errorMessage}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Discovered Models */}
                {hasModels && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-foreground">
                        {t("models.availableModels")}
                      </h3>
                      <Badge variant="secondary">
                        {provider?.discoveredModels?.length}{" "}
                        {t("models.models")}
                      </Badge>
                    </div>
                    <ModelsList
                      models={provider?.discoveredModels || []}
                      onToggle={onToggleModel}
                      onBatchToggle={onBatchToggleModel}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
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

  const handleBatchToggleModel = async (
    modelIds: string[],
    isEnabled: boolean
  ) => {
    try {
      // 批量更新多个模型
      const updatePromises = modelIds.map((modelId) =>
        httpClient.patch("/api/models/providers", {
          modelId,
          isEnabled,
        })
      );

      await Promise.all(updatePromises);

      // Update local state
      setProviders((prev) =>
        prev.map((provider) => ({
          ...provider,
          discoveredModels: provider.discoveredModels.map((model) =>
            modelIds.includes(model.id) ? { ...model, isEnabled } : model
          ),
        }))
      );
    } catch (error) {
      console.error("Batch toggle models error:", error);
      setError(t("models.toggleFailed"));
    }
  };

  if (!user) return null;

  const enabledProviders = MODEL_PROVIDERS.filter((p) => p.enabled);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 max-w-6xl mx-auto p-6 overflow-auto w-full">
        <div className="space-y-6 w-full">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <CpuIcon className="w-8 h-8 mr-3" />
              {t("models.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("models.subtitle")}</p>
          </div>

          {/* Messages */}
          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircleIcon className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {message && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider Cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 w-full">
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
                    onBatchToggleModel={handleBatchToggleModel}
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
