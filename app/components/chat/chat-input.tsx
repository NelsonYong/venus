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
import { models } from "@/app/constants/models";

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
          <PromptInputModelSelect onValueChange={onModelChange} value={model}>
            <PromptInputModelSelectTrigger>
              <PromptInputModelSelectValue />
            </PromptInputModelSelectTrigger>
            <PromptInputModelSelectContent>
              {models.map((model) => (
                <PromptInputModelSelectItem
                  key={model.value}
                  value={model.value}
                >
                  {model.name}
                </PromptInputModelSelectItem>
              ))}
            </PromptInputModelSelectContent>
          </PromptInputModelSelect>
        </PromptInputTools>
        <PromptInputSubmit disabled={!input} status={status} />
      </PromptInputToolbar>
    </PromptInput>
  );
}