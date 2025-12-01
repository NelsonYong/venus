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
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Actions, Action } from "@/components/ai-elements/actions";
import { Loader } from "@/components/ai-elements/loader";
import { CopyIcon, CheckIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "@/app/contexts/i18n-context";
import { UIMessage } from "ai";
import { Citations } from "./citations";

interface MessageRendererProps {
  messages: UIMessage[];
  status: string;
  isFinished?: boolean;
  onRegenerate?: () => void;
}

export function MessageRenderer({
  messages,
  status,
  isFinished,
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
                // 忽略 step-start 类型（步骤标记，不需要显示）
                if (part.type === "step-start") {
                  return null;
                }

                // 调试：记录未识别的消息部分类型
                if (
                  part.type &&
                  ![
                    "text",
                    "tool-weather",
                    "tool-webSearch",
                    "reasoning",
                    "tool-call",
                    "tool-result",
                    "source-url",
                  ].includes(part.type)
                ) {
                  console.log("🔍 Unknown message part type:", part.type, part);
                }

                switch (part.type) {
                  case "text":
                    return (
                      <Response
                        key={`${message.id}-${i}`}
                        shikiTheme={["github-light", "github-dark"]}
                        className="markdown"
                      >
                        {part.text}
                      </Response>
                    );
                  case "tool-weather":
                    // ReAct 模式：显示工具调用的详细信息
                    const weatherToolPart = part as any;
                    return (
                      <Tool
                        key={`${message.id}-${i}`}
                        defaultOpen={status === "streaming"}
                      >
                        <ToolHeader
                          type="tool-weather"
                          state={
                            weatherToolPart.state ||
                            (status === "streaming"
                              ? "input-streaming"
                              : "output-available")
                          }
                        />
                        <ToolContent>
                          {weatherToolPart.input && (
                            <ToolInput input={weatherToolPart.input} />
                          )}
                          {weatherToolPart.output && (
                            <ToolOutput
                              output={
                                typeof weatherToolPart.output === "string"
                                  ? weatherToolPart.output
                                  : JSON.stringify(
                                      weatherToolPart.output,
                                      null,
                                      2
                                    )
                              }
                              errorText={weatherToolPart.error}
                            />
                          )}
                        </ToolContent>
                      </Tool>
                    );
                  case "tool-webSearch":
                    // webSearch 工具调用
                    const webSearchToolPart = part as any;
                    return (
                      <Tool
                        key={`${message.id}-${i}`}
                        defaultOpen={status === "streaming"}
                      >
                        <ToolHeader
                          type="tool-webSearch"
                          state={
                            webSearchToolPart.state ||
                            (status === "streaming"
                              ? "input-streaming"
                              : "output-available")
                          }
                        />
                        <ToolContent>
                          {webSearchToolPart.input && (
                            <ToolInput input={webSearchToolPart.input} />
                          )}
                          {webSearchToolPart.output && (
                            <ToolOutput
                              output={
                                typeof webSearchToolPart.output === "string"
                                  ? webSearchToolPart.output
                                  : JSON.stringify(
                                      webSearchToolPart.output,
                                      null,
                                      2
                                    )
                              }
                              errorText={webSearchToolPart.error}
                            />
                          )}
                        </ToolContent>
                      </Tool>
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
                  // 兼容其他工具调用格式
                  case "tool-call":
                  case "tool-result":
                    const toolPart = part as any;
                    return (
                      <Tool
                        key={`${message.id}-${i}`}
                        defaultOpen={status === "streaming"}
                      >
                        <ToolHeader
                          type={
                            toolPart.toolName || toolPart.toolCallId || "tool"
                          }
                          state={
                            toolPart.state ||
                            (status === "streaming"
                              ? "input-streaming"
                              : "output-available")
                          }
                        />
                        <ToolContent>
                          {(toolPart.input || toolPart.args) && (
                            <ToolInput
                              input={toolPart.input || toolPart.args}
                            />
                          )}
                          {(toolPart.output || toolPart.result) && (
                            <ToolOutput
                              output={
                                typeof (toolPart.output || toolPart.result) ===
                                "string"
                                  ? toolPart.output || toolPart.result
                                  : JSON.stringify(
                                      toolPart.output || toolPart.result,
                                      null,
                                      2
                                    )
                              }
                              errorText={toolPart.error}
                            />
                          )}
                        </ToolContent>
                      </Tool>
                    );
                  default:
                    // 处理其他可能的工具调用格式（通过 toolCallId 识别）
                    if (part.toolCallId || part.type?.startsWith("tool-")) {
                      const toolName =
                        part.type?.replace("tool-", "") ||
                        part.toolName ||
                        "tool";
                      return (
                        <Tool
                          key={`${message.id}-${i}`}
                          defaultOpen={status === "streaming"}
                        >
                          <ToolHeader
                            type={toolName}
                            state={
                              part.state ||
                              (status === "streaming"
                                ? "input-streaming"
                                : "output-available")
                            }
                          />
                          <ToolContent>
                            {(part.input || part.args) && (
                              <ToolInput input={part.input || part.args} />
                            )}
                            {(part.output || part.result) && (
                              <ToolOutput
                                output={
                                  typeof (part.output || part.result) ===
                                  "string"
                                    ? part.output || part.result
                                    : JSON.stringify(
                                        part.output || part.result,
                                        null,
                                        2
                                      )
                                }
                                errorText={part.error}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                }
              })}
            </MessageContent>

            {/* 显示引用来源 */}
            {message.role === "assistant" && (message as any).metadata?.citations && (
              <Citations citations={(message as any).metadata.citations} />
            )}
          </Message>

          {/* Actions for assistant messages */}
          {message.role === "assistant" && (
            <>
              {/* 流式输出时：非最后一条消息显示复制按钮 */}
              {status === "streaming" && !isLastAssistantMessage(index) && (
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
                  </Actions>
                </div>
              )}
              {/* 非流式输出时：最后一条消息显示复制和重新生成按钮 */}
              {status !== "streaming" && isLastAssistantMessage(index) && (
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
              )}
              {/* 非流式输出时：非最后一条消息显示复制按钮 */}
              {status !== "streaming" && !isLastAssistantMessage(index) && (
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
                  </Actions>
                </div>
              )}
            </>
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
