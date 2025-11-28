"use client";

import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon } from "lucide-react";
import { useTranslation } from "@/app/contexts/i18n-context";
import { ChatStatus } from "ai";
import { useAvailableModels } from "@/app/hooks/use-available-models";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  model: string;
  onModelChange: (value: string) => void;
  webSearch: boolean;
  onWebSearchToggle: () => void;
  status: string;
  onStop?: () => void;
  className?: string;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  model,
  onModelChange,
  webSearch,
  onWebSearchToggle,
  status,
  onStop,
  className,
}: ChatInputProps) {
  const { t } = useTranslation();
  const { models: availableModels, isLoading: isLoadingModels } =
    useAvailableModels(onModelChange);

  const handleModelChange = (value: string) => {
    onModelChange(value);
    localStorage.setItem("selectedModelId", value);
  };

  // 按厂商分组模型
  const groupedModels = availableModels.reduce((groups, model) => {
    const provider = model.provider || "other";
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(model);
    return groups;
  }, {} as Record<string, typeof availableModels>);

  // 厂商显示名称映射
  const providerNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    deepseek: "DeepSeek",
    gemini: "Google Gemini",
    other: t("models.other") || "其他",
  };

  // 厂商排序优先级
  const providerOrder = [
    "openai",
    "anthropic",
    "google",
    "gemini",
    "deepseek",
    "other",
  ];
  const sortedProviders = Object.keys(groupedModels).sort((a, b) => {
    const indexA = providerOrder.indexOf(a.toLowerCase());
    const indexB = providerOrder.indexOf(b.toLowerCase());
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const handlePromptInputSubmit = async (
    message: { text: string; files: any[] },
    event: React.FormEvent<HTMLFormElement>
  ) => {
    // Create a synthetic form event that matches the expected signature
    const syntheticEvent = {
      ...event,
      preventDefault: () => event.preventDefault(),
      currentTarget: event.currentTarget,
    } as React.FormEvent;

    // Call the original onSubmit handler
    onSubmit(syntheticEvent);
  };

  return (
    <PromptInput
      onSubmit={handlePromptInputSubmit}
      className={cn("w-full", className)}
    >
      <PromptInputTextarea
        placeholder={t("chat.placeholder")}
        onChange={(e) => onInputChange(e.target.value)}
        value={input}
        className="min-h-[56px] py-2.5 px-3 text-sm"
      />
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputButton
            variant={webSearch ? "default" : "ghost"}
            onClick={onWebSearchToggle}
            size="sm"
          >
            <GlobeIcon size={16} />
            <span className="hidden sm:inline">{t("chat.search")}</span>
          </PromptInputButton>
          <PromptInputSelect
            onValueChange={handleModelChange}
            value={model}
            disabled={isLoadingModels}
          >
            <PromptInputSelectTrigger className="h-8 text-sm">
              <PromptInputSelectValue
                placeholder={
                  isLoadingModels
                    ? t("chat.loadingModels")
                    : t("chat.selectModel")
                }
              />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {sortedProviders.map((provider) => (
                <div key={provider}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {providerNames[provider.toLowerCase()] || provider}
                  </div>
                  {groupedModels[provider].map((availableModel) => (
                    <PromptInputSelectItem
                      key={availableModel.id}
                      value={availableModel.id}
                    >
                      <div className="flex items-center gap-2">
                        <span>{availableModel.displayName}</span>
                        {availableModel.isPreset && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            {t("models.preset")}
                          </span>
                        )}
                      </div>
                    </PromptInputSelectItem>
                  ))}
                </div>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={!input && status !== "streaming"}
          status={status as ChatStatus}
          onClick={(e) => {
            if (status === "streaming" && onStop) {
              e.preventDefault();
              e.stopPropagation();
              onStop();
            }
          }}
          size="icon-sm"
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
