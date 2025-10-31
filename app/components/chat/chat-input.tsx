"use client";

import { useState, useEffect, useRef } from "react";
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
import { httpClient } from "@/lib/http-client";

interface AvailableModel {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  isPreset: boolean;
}

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
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const isMounted = useRef(false);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      const response = await httpClient.get<{
        success: boolean;
        models: AvailableModel[];
      }>("/api/models/available");
      if (response.status === 200 && response.data?.models) {
        setAvailableModels(response.data.models);

        if (response.data.models.length > 0) {
          // Get saved model from localStorage
          const savedModelId = localStorage.getItem("selectedModelId");

          // Check if saved model exists in available models
          const savedModel = savedModelId
            ? response.data.models.find((m) => m.id === savedModelId)
            : null;

          let modelToSelect: string;

          if (savedModel) {
            // Use saved model if it exists in available models
            modelToSelect = savedModel.id;
          } else {
            // No saved model or it doesn't exist, find first preset model or fallback to first model
            const firstPresetModel = response.data.models.find(
              (m) => m.isPreset
            );
            const defaultModel = firstPresetModel || response.data.models[0];
            modelToSelect = defaultModel.id;
            // Only save to localStorage when there's no saved model or it's invalid
            localStorage.setItem("selectedModelId", modelToSelect);
          }

          onModelChange(modelToSelect);
        }
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

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
