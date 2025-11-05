"use client";

import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon } from "lucide-react";
import { useTranslation } from "@/app/contexts/i18n-context";
import { ChatStatus } from "ai";
import { useAvailableModels } from "@/app/hooks/use-available-models";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  model: string;
  onModelChange: (value: string) => void;
  webSearch: boolean;
  onWebSearchToggle: () => void;
  status: string;
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
  className,
}: ChatInputProps) {
  const { t } = useTranslation();
  const { models: availableModels, isLoading: isLoadingModels } =
    useAvailableModels(onModelChange);

  const handleModelChange = (value: string) => {
    onModelChange(value);
    localStorage.setItem("selectedModelId", value);
  };

  return (
    <PromptInput onSubmit={onSubmit} className={className}>
      <PromptInputTextarea
        placeholder={t("chat.placeholder")}
        onChange={(e) => onInputChange(e.target.value)}
        value={input}
      />
      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputButton
            variant={webSearch ? "default" : "ghost"}
            onClick={onWebSearchToggle}
          >
            <GlobeIcon size={16} />
            <span>{t("chat.search")}</span>
          </PromptInputButton>
          <PromptInputModelSelect
            onValueChange={handleModelChange}
            value={model}
            disabled={isLoadingModels}
          >
            <PromptInputModelSelectTrigger>
              <PromptInputModelSelectValue
                placeholder={
                  isLoadingModels
                    ? t("chat.loadingModels")
                    : t("chat.selectModel")
                }
              />
            </PromptInputModelSelectTrigger>
            <PromptInputModelSelectContent>
              {availableModels.map((availableModel) => (
                <PromptInputModelSelectItem
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
                </PromptInputModelSelectItem>
              ))}
            </PromptInputModelSelectContent>
          </PromptInputModelSelect>
        </PromptInputTools>
        <PromptInputSubmit disabled={!input} status={status as ChatStatus} />
      </PromptInputToolbar>
    </PromptInput>
  );
}
