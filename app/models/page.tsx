"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/contexts/auth-context";
import { useTranslation } from "@/app/contexts/i18n-context";
import { ProtectedRoute } from "@/app/components/auth/protected-route";
import { Navbar } from "@/app/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { httpClient } from "@/lib/http-client";
import {
  CpuIcon,
  PlusIcon,
  TrashIcon,
  SaveIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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

interface ModelConfig {
  id?: string;
  name: string;
  displayName: string;
  apiKey: string;
  apiEndpoint: string;
  isActive: boolean;
  provider: string;
  isPreset?: boolean;
}

interface ModelPreset {
  name: string;
  displayName: string;
  defaultEndpoint: string;
}

interface ProviderConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  presets: ModelPreset[];
  defaultEndpoint: string;
  enabled: boolean;
}

const MODEL_PROVIDERS: ProviderConfig[] = [
  {
    id: "deepseek",
    name: "deepseek",
    displayName: "DeepSeek",
    description: "DeepSeek AI - 高性能的中文大语言模型",
    icon: "🤖",
    enabled: true,
    defaultEndpoint: "https://api.deepseek.com/v1/chat/completions",
    presets: [
      {
        name: "deepseek-chat",
        displayName: "DeepSeek Chat",
        defaultEndpoint: "https://api.deepseek.com/v1/chat/completions",
      },
      {
        name: "deepseek-coder",
        displayName: "DeepSeek Coder",
        defaultEndpoint: "https://api.deepseek.com/v1/chat/completions",
      },
      {
        name: "deepseek-reasoner",
        displayName: "DeepSeek Reasoner",
        defaultEndpoint: "https://api.deepseek.com/v1/chat/completions",
      },
    ],
  },
  // 预留其他提供商的配置
  // {
  //   id: "openai",
  //   name: "openai",
  //   displayName: "OpenAI",
  //   description: "OpenAI - GPT 系列模型",
  //   icon: "🧠",
  //   enabled: false,
  //   defaultEndpoint: "https://api.openai.com/v1/chat/completions",
  //   presets: [
  //     {
  //       name: "gpt-4",
  //       displayName: "GPT-4",
  //       defaultEndpoint: "https://api.openai.com/v1/chat/completions",
  //     },
  //   ],
  // },
];

function ModelCard({
  model,
  index,
  provider,
  providerIndex,
  onRemoveModel,
  onModelChange,
  onSelectPreset,
  showApiKey,
  onToggleApiKey,
  onSaveModel,
}: {
  model: ModelConfig;
  index: number;
  provider: ProviderConfig;
  providerIndex: number;
  onRemoveModel: (index: number) => void;
  onModelChange: (index: number, field: keyof ModelConfig, value: string | boolean) => void;
  onSelectPreset: (index: number, preset: ModelPreset, provider: string) => void;
  showApiKey: boolean;
  onToggleApiKey: (index: number) => void;
  onSaveModel: (index: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(!model.id); // 新模型默认展开，已保存的默认折叠
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "***";
    return key.substring(0, 4) + "***" + key.substring(key.length - 4);
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onRemoveModel(index);
  };

  return (
    <>
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header - Always Visible */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex-1 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {model.displayName || t("models.modelConfig") + " #" + (providerIndex + 1)}
                    </h3>
                    {model.isPreset && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                        {t("models.preset")}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        model.isActive
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {model.isActive ? t("models.active") : t("models.inactive")}
                    </span>
                  </div>
                  {!isExpanded && (
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <span>
                        {t("models.modelName")}: <span className="font-mono">{model.name}</span>
                      </span>
                      <span>•</span>
                      <span>
                        {t("models.apiKey")}: <span className="font-mono">{maskApiKey(model.apiKey)}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="space-y-4 pt-2 border-t">
              {/* Preset badge for preset models */}
              {model.isPreset && (
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    ℹ️ {t("models.presetInfo")}
                  </p>
                </div>
              )}

              {/* Preset Selection - Only for user-configured models */}
              {!model.isPreset && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("models.selectPreset")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {provider.presets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant={model.name === preset.name ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPreset(index, preset, provider.id);
                        }}
                      >
                        {preset.displayName}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("models.modelName")}
                  </label>
                  <Input
                    value={model.name}
                    onChange={(e) => onModelChange(index, "name", e.target.value)}
                    placeholder={provider.presets[0]?.name || "model-name"}
                    disabled={model.isPreset}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("models.displayName")}
                  </label>
                  <Input
                    value={model.displayName}
                    onChange={(e) => onModelChange(index, "displayName", e.target.value)}
                    placeholder={provider.presets[0]?.displayName || "Display Name"}
                    disabled={model.isPreset}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("models.apiEndpoint")}
                  </label>
                  <Input
                    value={model.apiEndpoint}
                    onChange={(e) => onModelChange(index, "apiEndpoint", e.target.value)}
                    placeholder={provider.defaultEndpoint}
                    disabled={model.isPreset}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("models.apiKey")}
                  </label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={model.apiKey}
                      onChange={(e) => onModelChange(index, "apiKey", e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxx"
                      className="pr-10"
                      disabled={model.isPreset}
                    />
                    {!model.isPreset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleApiKey(index);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:col-span-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!model.isPreset) {
                        onModelChange(index, "isActive", !model.isActive);
                      }
                    }}
                    disabled={model.isPreset}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                      model.isActive
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                        : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400"
                    } ${model.isPreset ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {model.isActive ? (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("models.active")}</span>
                      </>
                    ) : (
                      <>
                        <XIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("models.inactive")}</span>
                      </>
                    )}
                  </button>
                  {!model.isPreset && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsSaving(true);
                          try {
                            await onSaveModel(index);
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        size="sm"
                      >
                        <SaveIcon className="w-4 h-4 mr-2" />
                        {isSaving ? t("models.saving") : t("models.save")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteDialog(true);
                        }}
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        {t("models.delete")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("models.deleteConfirm.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("models.deleteConfirm.message", { name: model.displayName || model.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

function ProviderSection({
  provider,
  models,
  onAddModel,
  onRemoveModel,
  onModelChange,
  onSelectPreset,
  showApiKeys,
  onToggleApiKey,
  onSaveModel,
}: {
  provider: ProviderConfig;
  models: ModelConfig[];
  onAddModel: (provider: string) => void;
  onRemoveModel: (index: number) => void;
  onModelChange: (index: number, field: keyof ModelConfig, value: string | boolean) => void;
  onSelectPreset: (index: number, preset: ModelPreset, provider: string) => void;
  showApiKeys: { [key: string]: boolean };
  onToggleApiKey: (index: number) => void;
  onSaveModel: (index: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  const providerModels = models
    .map((model, index) => ({ model, index }))
    .filter(({ model }) => model.provider === provider.id);

  // Check if there are any user-configured models (non-preset models)
  const hasUserConfiguredModels = providerModels.some(({ model }) => !model.isPreset);

  return (
    <Card className="border-border w-full">
      <CardContent className="p-6 w-full">
        <div className="space-y-4 w-full">
          {/* Provider Header */}
          <div
            className="flex items-center justify-between cursor-pointer w-full"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <span className="text-3xl flex-shrink-0">{provider.icon}</span>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground flex items-center space-x-2">
                  <span>{provider.displayName}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {providerModels.length} {t("models.configured")}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">{provider.description}</p>
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
              {/* Info Banner - Only show if no user-configured models */}
              {!hasUserConfiguredModels && (
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <CardContent className="p-3">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {t(`models.providers.${provider.id}.info`)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Models List */}
              {providerModels.length > 0 && (
                <div className="space-y-4">
                  {providerModels.map(({ model, index }, providerIndex) => (
                    <ModelCard
                      key={index}
                      model={model}
                      index={index}
                      provider={provider}
                      providerIndex={providerIndex}
                      onRemoveModel={onRemoveModel}
                      onModelChange={onModelChange}
                      onSelectPreset={onSelectPreset}
                      showApiKey={showApiKeys[index]}
                      onToggleApiKey={onToggleApiKey}
                      onSaveModel={onSaveModel}
                    />
                  ))}
                </div>
              )}

              {/* Add Model Button */}
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => onAddModel(provider.id)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                {t("models.addModel")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ModelsContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await httpClient.get<{ success: boolean; models: ModelConfig[] }>("/api/models/user");
      if (response.status === 200 && response.data?.models) {
        setModels(response.data.models);
      }
    } catch (error) {
      console.error("Load models error:", error);
    }
  };

  const handleAddModel = (provider: string) => {
    const providerConfig = MODEL_PROVIDERS.find((p) => p.id === provider);
    if (!providerConfig) return;

    const newModel: ModelConfig = {
      name: "",
      displayName: "",
      apiKey: "",
      apiEndpoint: providerConfig.defaultEndpoint,
      isActive: true,
      provider: provider,
    };
    setModels([...models, newModel]);
  };

  const handleRemoveModel = (index: number) => {
    const newModels = models.filter((_, i) => i !== index);
    setModels(newModels);
  };

  const handleModelChange = (
    index: number,
    field: keyof ModelConfig,
    value: string | boolean
  ) => {
    const newModels = [...models];
    newModels[index] = { ...newModels[index], [field]: value };
    setModels(newModels);
  };

  const handleSelectPreset = (index: number, preset: ModelPreset, provider: string) => {
    handleModelChange(index, "name", preset.name);
    handleModelChange(index, "displayName", preset.displayName);
    handleModelChange(index, "apiEndpoint", preset.defaultEndpoint);
    handleModelChange(index, "provider", provider);
  };

  const toggleApiKeyVisibility = (index: number) => {
    setShowApiKeys({
      ...showApiKeys,
      [index]: !showApiKeys[index],
    });
  };

  const handleSaveModel = async (index: number) => {
    setMessage("");
    setError("");

    const model = models[index];

    // Validate model
    if (!model.name || !model.displayName || !model.apiKey) {
      setError(t("models.validation.required"));
      return;
    }

    try {
      const response = await httpClient.post<{ success: boolean; message: string }>("/api/models/user", {
        models: [model],
      });

      if (response.status === 200 && response.data?.success) {
        setMessage(response.data.message || t("models.saveSuccess"));
        await loadModels();
      } else {
        setError((response as any).message || (response as any).error || t("models.saveFailed"));
      }
    } catch (error) {
      console.error("Save model error:", error);
      setError(t("models.saveFailed"));
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
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
            </div>
          )}

          {/* Provider Sections */}
          <div className="space-y-6 w-full">
            {enabledProviders.map((provider) => (
              <ProviderSection
                key={provider.id}
                provider={provider}
                models={models}
                onAddModel={handleAddModel}
                onRemoveModel={handleRemoveModel}
                onModelChange={handleModelChange}
                onSelectPreset={handleSelectPreset}
                showApiKeys={showApiKeys}
                onToggleApiKey={toggleApiKeyVisibility}
                onSaveModel={handleSaveModel}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <ProtectedRoute>
      <ModelsContent />
    </ProtectedRoute>
  );
}
