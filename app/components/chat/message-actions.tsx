import { useState } from "react";
import { Actions, Action } from "@/components/ai-elements/actions";
import { CopyIcon, CheckIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "@/app/contexts/i18n-context";

interface MessageActionsProps {
  message: any;
  isLastAssistantMessage: boolean;
  status: string;
  onRegenerate?: () => void;
}

export function MessageActions({
  message,
  isLastAssistantMessage,
  status,
  onRegenerate,
}: MessageActionsProps) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async () => {
    const textParts = message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n");

    await navigator.clipboard.writeText(textParts);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isStreaming = status === "streaming";
  const isAssistant = message.role === "assistant";
  const isUser = message.role === "user";

  // User messages - show on hover
  if (isUser) {
    return (
      <div className="flex justify-end mt-2 px-2">
        <Actions className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Action
            tooltip={
              copiedId === message.id
                ? t("chat.actions.copied")
                : t("chat.actions.copy")
            }
            onClick={handleCopy}
          >
            {copiedId === message.id ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
          </Action>
        </Actions>
      </div>
    );
  }

  // Assistant messages
  if (isAssistant) {
    // Streaming: show copy for non-last messages
    if (isStreaming && !isLastAssistantMessage) {
      return (
        <div className="flex justify-start mt-2 px-2">
          <Actions>
            <Action
              tooltip={
                copiedId === message.id
                  ? t("chat.actions.copied")
                  : t("chat.actions.copy")
              }
              onClick={handleCopy}
            >
              {copiedId === message.id ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
            </Action>
          </Actions>
        </div>
      );
    }

    // Not streaming: show copy + regenerate for last message
    if (!isStreaming && isLastAssistantMessage) {
      return (
        <div className="flex justify-start mt-2 px-2">
          <Actions>
            <Action
              tooltip={
                copiedId === message.id
                  ? t("chat.actions.copied")
                  : t("chat.actions.copy")
              }
              onClick={handleCopy}
            >
              {copiedId === message.id ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
            </Action>
            {onRegenerate && (
              <Action
                tooltip={t("chat.actions.regenerate")}
                onClick={onRegenerate}
              >
                <RefreshCwIcon className="w-4 h-4" />
              </Action>
            )}
          </Actions>
        </div>
      );
    }

    // Not streaming: show copy for non-last messages
    if (!isStreaming && !isLastAssistantMessage) {
      return (
        <div className="flex justify-start mt-2 px-2">
          <Actions>
            <Action
              tooltip={
                copiedId === message.id
                  ? t("chat.actions.copied")
                  : t("chat.actions.copy")
              }
              onClick={handleCopy}
            >
              {copiedId === message.id ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
            </Action>
          </Actions>
        </div>
      );
    }
  }

  return null;
}
