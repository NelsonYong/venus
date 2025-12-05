"use client";

import { useState, useEffect, useRef } from "react";
import {
  Message,
  MessageContent,
  MessageAttachment,
  MessageAttachments,
} from "@/components/ai-elements/message";
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
import { CitationsSidebar } from "./citations-sidebar";
import { ExternalLinkDialog } from "./external-link-dialog";
import { ArtifactPreview } from "./artifact-preview";
import { ArtifactPreviewSidebar } from "./artifact-preview-sidebar";
import { cn } from "@/lib/utils";
import { useMobile } from "@/app/hooks/use-mobile";
import { Artifact } from "@/lib/types/artifact";

// Parse HTML/SVG/Markdown code blocks from markdown text
function parseHtmlCodeBlocks(text: string): Array<{
  type: "text" | "html" | "svg" | "markdown";
  content: string;
  id?: string;
}> {
  const blocks: Array<{
    type: "text" | "html" | "svg" | "markdown";
    content: string;
    id?: string;
  }> = [];

  // Regex to match ```html, ```svg, or ```markdown code blocks
  const regex = /```(html|svg|markdown|md)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    // Add the HTML/SVG/Markdown code block
    let blockType = match[1] as "html" | "svg" | "markdown" | "md";
    // Normalize 'md' to 'markdown'
    if (blockType === "md") {
      blockType = "markdown";
    }
    const blockContent = match[2].trim();
    blocks.push({
      type: blockType as "html" | "svg" | "markdown",
      content: blockContent,
      id: `${blockType}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after the last code block
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex).trim();
    if (textContent) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no code blocks found, return the entire text
  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: "text", content: text });
  }

  return blocks;
}

interface MessageRendererProps {
  messages: UIMessage[];
  status: string;
  onRegenerate?: () => void;
  onArtifactOpen?: (artifact: Artifact, previewUrl: string) => void;
  onArtifactClose?: () => void;
  artifactSidebarState?: {
    artifact: Artifact | null;
    isOpen: boolean;
    previewUrl: string | null;
  };
  hasAutoOpenedArtifact?: boolean;
  onAutoOpenComplete?: () => void;
}

export function MessageRenderer({
  messages,
  status,
  onRegenerate,
  onArtifactOpen,
  onArtifactClose,
  artifactSidebarState,
  hasAutoOpenedArtifact = false,
  onAutoOpenComplete,
}: MessageRendererProps) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [highlightedCitationId, setHighlightedCitationId] = useState<
    number | undefined
  >();
  const [activeCitations, setActiveCitations] = useState<any[]>([]);
  const [externalLinkUrl, setExternalLinkUrl] = useState<string | null>(null);
  const [isExternalLinkDialogOpen, setIsExternalLinkDialogOpen] =
    useState(false);
  const isMobile = useMobile();
  const prevStatusRef = useRef<string>(status);

  // 自动打开第一个 artifact（当流式输出完成时）
  useEffect(() => {
    // 检测流式输出刚完成
    const streamingJustEnded = prevStatusRef.current === "streaming" && status !== "streaming";

    if (streamingJustEnded && !hasAutoOpenedArtifact && onArtifactOpen && onAutoOpenComplete) {
      // 查找最后一条助手消息中的第一个 artifact
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.role === "assistant") {
          // 遍历消息的所有部分
          for (const part of message.parts) {
            if (part.type === "text") {
              const parsedBlocks = parseHtmlCodeBlocks(part.text);
              // 找到第一个 artifact block
              for (const block of parsedBlocks) {
                if (block.type === "html" || block.type === "svg" || block.type === "markdown") {
                  const artifact: Artifact = {
                    id: block.id || `${block.type}-auto`,
                    type: block.type,
                    title: `${block.type.toUpperCase()} Preview`,
                    language: block.type,
                    code: block.content,
                    previewable: true,
                  };

                  // 创建 preview URL
                  const blob = new Blob([block.content], {
                    type: block.type === "svg" ? "image/svg+xml" : "text/html",
                  });
                  const previewUrl = URL.createObjectURL(blob);

                  // 自动打开
                  onArtifactOpen(artifact, previewUrl);
                  onAutoOpenComplete();
                  return;
                }
              }
            }
          }
          // 只检查最后一条助手消息
          break;
        }
      }
    }

    // 更新 prevStatusRef
    prevStatusRef.current = status;
  }, [status, hasAutoOpenedArtifact, messages, onArtifactOpen, onAutoOpenComplete]);

  const handleCopy = async (message: any) => {
    const textParts = message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n");

    await navigator.clipboard.writeText(textParts);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCitationClick = (citationId: number, citations: any[]) => {
    // 查找点击的引用
    const citation = citations.find((c) => c.id === citationId);
    if (citation?.url) {
      // 检查是否已禁用外部链接确认
      const disabled =
        localStorage.getItem("external-link-confirm-disabled") === "true";
      if (disabled) {
        // 直接打开链接
        window.open(citation.url, "_blank", "noopener,noreferrer");
      } else {
        // 显示确认弹窗
        setExternalLinkUrl(citation.url);
        setIsExternalLinkDialogOpen(true);
      }
    }
  };

  const handleExternalLinkConfirm = () => {
    if (externalLinkUrl) {
      window.open(externalLinkUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenSidebar = (citations: any[]) => {
    setActiveCitations(citations);
    setHighlightedCitationId(undefined);
    setIsSidebarOpen(true);
  };

  const handleOpenArtifactPreview = (
    artifact: Artifact,
    previewUrl: string
  ) => {
    onArtifactOpen?.(artifact, previewUrl);
  };

  const isLastAssistantMessage = (index: number) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return i === index;
      }
    }
    return false;
  };

  const messageClassname = cn("pb-0 max-w-[80%]", {
    "max-w-[100%]": isMobile,
  });

  return (
    <>
      {messages.map((message, index) => {
        const messageCitations = (message as any).metadata?.citations || [];

        // 读取附件：优先从 data（实时消息），然后从 metadata（历史消息）
        let messageAttachments = [];

        // 1. 从 data 读取（实时消息，发送时添加的）
        if ((message as any).data?.uploadedAttachments) {
          messageAttachments = (message as any).data.uploadedAttachments;
        }
        // 2. 从 metadata 读取（历史消息，数据库加载的）
        else if ((message as any).metadata?.uploadedAttachments) {
          messageAttachments = (message as any).metadata.uploadedAttachments;
        }

        return (
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
            <Message
              from={message.role}
              key={message.id}
              className={messageClassname}
            >
              {/* 显示用户上传的文件附件 */}
              {message.role === "user" && messageAttachments.length > 0 && (
                <MessageAttachments className="mb-2">
                  {messageAttachments.map((attachment: any, idx: number) => (
                    <MessageAttachment
                      key={idx}
                      data={{
                        type: "file" as const,
                        url: attachment.url,
                        mediaType: attachment.contentType || attachment.type,
                        filename: attachment.filename,
                      }}
                    />
                  ))}
                </MessageAttachments>
              )}
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
                    console.log(
                      "🔍 Unknown message part type:",
                      part.type,
                      part
                    );
                  }

                  switch (part.type) {
                    case "text":
                      // Parse HTML/SVG code blocks from the text
                      const parsedBlocks = parseHtmlCodeBlocks(part.text);

                      return (
                        <div key={`${message.id}-${i}`}>
                          {parsedBlocks.map((block, blockIndex) => {
                            if (
                              block.type === "html" ||
                              block.type === "svg" ||
                              block.type === "markdown"
                            ) {
                              // Render HTML/SVG/Markdown preview card
                              const artifact: Artifact = {
                                id: block.id || `${block.type}-${blockIndex}`,
                                type: block.type,
                                title: `${block.type.toUpperCase()} Preview`,
                                language: block.type,
                                code: block.content,
                                previewable: true,
                              };
                              return (
                                <ArtifactPreview
                                  key={
                                    block.id ||
                                    `${message.id}-${i}-${blockIndex}`
                                  }
                                  artifact={artifact}
                                  onClick={(previewUrl) =>
                                    handleOpenArtifactPreview(
                                      artifact,
                                      previewUrl
                                    )
                                  }
                                />
                              );
                            } else {
                              // Render text content
                              return (
                                <Response
                                  key={`${message.id}-${i}-${blockIndex}`}
                                  shikiTheme={["github-light", "github-dark"]}
                                  className="markdown"
                                  citations={messageCitations}
                                  onCitationClick={(citationId) =>
                                    handleCitationClick(
                                      citationId,
                                      messageCitations
                                    )
                                  }
                                >
                                  {block.content}
                                </Response>
                              );
                            }
                          })}
                        </div>
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
                                  typeof (
                                    toolPart.output || toolPart.result
                                  ) === "string"
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
              {message.role === "assistant" && messageCitations.length > 0 && (
                <Citations
                  citations={messageCitations}
                  onOpenSidebar={() => handleOpenSidebar(messageCitations)}
                />
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
        );
      })}
      {status === "submitted" && <Loader />}

      {/* 引用侧边栏 */}
      <CitationsSidebar
        citations={activeCitations}
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false);
          setHighlightedCitationId(undefined);
          setActiveCitations([]);
        }}
        highlightedId={highlightedCitationId}
      />

      {/* 外部链接确认弹窗 */}
      <ExternalLinkDialog
        url={externalLinkUrl}
        isOpen={isExternalLinkDialogOpen}
        onClose={() => {
          setIsExternalLinkDialogOpen(false);
          setExternalLinkUrl(null);
        }}
        onConfirm={handleExternalLinkConfirm}
      />

      {/* Artifact 预览侧边栏 - 仅在未被父组件管理时显示 */}
      {!artifactSidebarState && (
        <ArtifactPreviewSidebar
          artifact={null}
          isOpen={false}
          previewUrl=""
          onClose={onArtifactClose || (() => {})}
        />
      )}
    </>
  );
}
