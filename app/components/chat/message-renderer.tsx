"use client";

import { useState } from "react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Actions, Action } from "@/components/ai-elements/actions";
import { Weather, WeatherProps } from "../../tools/Weather";
import { Loader } from "@/components/ai-elements/loader";
import { CopyIcon, CheckIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "@/app/contexts/i18n-context";

interface MessageRendererProps {
  messages: any[];
  status: string;
  onRegenerate?: () => void;
}

export function MessageRenderer({
  messages,
  status,
  onRegenerate,
}: MessageRendererProps) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (message: any) => {
    const textParts = message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n");

    await navigator.clipboard.writeText(textParts);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isLastAssistantMessage = (index: number) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return i === index;
      }
    }
    return false;
  };

  return (
    <>
      {messages.map((message, index) => (
        <div key={message.id} className="group flex flex-col">
          {message.role === "assistant" && (
            <Sources>
              {message.parts.map((part: any, i: number) => {
                switch (part.type) {
                  case "source-url":
                    return (
                      <>
                        <SourcesTrigger
                          count={
                            message.parts.filter(
                              (part: any) => part.type === "source-url"
                            ).length
                          }
                        />
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={part.url}
                            title={part.url}
                          />
                        </SourcesContent>
                      </>
                    );
                }
              })}
            </Sources>
          )}
          <Message from={message.role} key={message.id} className="pb-0">
            <MessageContent>
              {message.parts.map((part: any, i: number) => {
                switch (part.type) {
                  case "text":
                    return (
                      <Response
                        key={`${message.id}-${i}`}
                        shikiTheme="github-dark"
                        className="markdown"
                      >
                        {part.text}
                      </Response>
                    );
                  case "tool-weather":
                    return (
                      <Weather
                        key={`${message.id}-${i}`}
                        {...(part.output as WeatherProps)}
                      />
                    );
                  case "reasoning":
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={status === "streaming"}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  default:
                    return null;
                }
              })}
            </MessageContent>
          </Message>

          {/* Actions for assistant messages - copy button always visible */}
          {message.role === "assistant" && (
            <div className="flex justify-start mt-2 px-2">
              <Actions>
                <Action
                  tooltip={
                    copiedId === message.id
                      ? t("chat.actions.copied")
                      : t("chat.actions.copy")
                  }
                  onClick={() => handleCopy(message)}
                >
                  {copiedId === message.id ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )}
                </Action>
                {isLastAssistantMessage(index) && onRegenerate && (
                  <Action
                    tooltip={t("chat.actions.regenerate")}
                    onClick={onRegenerate}
                  >
                    <RefreshCwIcon className="w-4 h-4" />
                  </Action>
                )}
              </Actions>
            </div>
          )}

          {/* Actions for user messages - copy button visible on hover */}
          {message.role === "user" && (
            <div className="flex justify-end mt-2 px-2">
              <Actions className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Action
                  tooltip={
                    copiedId === message.id
                      ? t("chat.actions.copied")
                      : t("chat.actions.copy")
                  }
                  onClick={() => handleCopy(message)}
                >
                  {copiedId === message.id ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )}
                </Action>
              </Actions>
            </div>
          )}
        </div>
      ))}
      {status === "submitted" && <Loader />}
    </>
  );
}
