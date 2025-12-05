"use client";

import { useState, useEffect } from "react";
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
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/components/ai-elements/task";
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
  filename?: string;
}> {
  const blocks: Array<{
    type: "text" | "html" | "svg" | "markdown";
    content: string;
    id?: string;
    filename?: string;
  }> = [];

  // Regex to match ```html:filename.html, ```svg:icon.svg, or ```markdown:guide.md code blocks
  // Also supports ```html, ```svg, ```markdown without filename
  const regex = /```(html|svg|markdown|md)(?::([^\n]+))?\n([\s\S]*?)```/g;
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
    const filename = match[2]?.trim(); // Extract filename if present
    const blockContent = match[3].trim();
    blocks.push({
      type: blockType as "html" | "svg" | "markdown",
      content: blockContent,
      filename: filename,
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

// 聚合思维步骤工具调用
function aggregateThinkingSteps(parts: any[]): Map<
  string,
  {
    type: "chain-of-thought" | "task";
    title: string;
    steps: any[];
    firstIndex: number;
    partIndices: number[];
  }
> {
  const thinkingGroups = new Map();

  parts.forEach((part, index) => {
    // 识别 thinkingStep 工具调用
    if (
      part.type === "tool-thinkingStep" ||
      (part.type === "tool-call" && part.toolName === "thinkingStep")
    ) {
      const input = part.input || part.args;
      if (input && input.title) {
        const key = `${input.stepType}-${input.title}`;

        if (!thinkingGroups.has(key)) {
          thinkingGroups.set(key, {
            type: input.stepType,
            title: input.title,
            steps: [],
            firstIndex: index, // 记录第一次出现的位置
            partIndices: [],
          });
        }

        const group = thinkingGroups.get(key);

        // 检查是否已存在相同 stepId 的步骤
        const existingStepIndex = group.steps.findIndex(
          (step: any) => step.id === input.stepId
        );

        const stepData = {
          id: input.stepId,
          label: input.label,
          description: input.description,
          status: input.status,
          searchResults: input.searchResults,
          files: input.files,
        };

        if (existingStepIndex >= 0) {
          // 更新现有步骤（可能状态改变了）
          group.steps[existingStepIndex] = stepData;
        } else {
          // 添加新步骤
          group.steps.push(stepData);
        }

        group.partIndices.push(index);
      }
    }
  });

  return thinkingGroups;
}

// 检查思维组是否全部完成
function isThinkingGroupComplete(group: any): boolean {
  return group.steps.every((step: any) => step.status === "complete");
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

  console.log("status", status);

  // 自动打开第一个 artifact（基于 isFinished metadata）
  useEffect(() => {
    // 移动端不自动打开 artifact
    if (
      isMobile ||
      !onArtifactOpen ||
      !onAutoOpenComplete ||
      hasAutoOpenedArtifact
    ) {
      return;
    }

    // 查找最后一条助手消息，检查是否刚完成
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "assistant") {
        const metadata = (message as any).metadata;

        // 检查消息是否标记为已完成
        if (metadata?.isFinished === true) {
          // 遍历消息的所有部分，查找 artifact
          for (const part of message.parts) {
            if (part.type === "text") {
              const parsedBlocks = parseHtmlCodeBlocks(part.text);
              // 找到第一个 artifact block
              for (const block of parsedBlocks) {
                if (
                  block.type === "html" ||
                  block.type === "svg" ||
                  block.type === "markdown"
                ) {
                  const artifact: Artifact = {
                    id: block.id || `${block.type}-auto`,
                    type: block.type,
                    title:
                      block.filename || `${block.type.toUpperCase()} Preview`,
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
        }
        // 只检查最后一条助手消息
        break;
      }
    }
  }, [
    messages,
    hasAutoOpenedArtifact,
    onArtifactOpen,
    onAutoOpenComplete,
    isMobile,
  ]);
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

  const messageClassname = cn("pb-0 max-w-[80%] w-[80%]", {
    "max-w-[100%]": isMobile,
    "w-full": isMobile,
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

        // 聚合思维步骤
        const thinkingGroups =
          message.role === "assistant"
            ? aggregateThinkingSteps(message.parts)
            : new Map();

        // 记录已处理的 part 索引
        const processedIndices = new Set<number>();
        thinkingGroups.forEach((group) => {
          group.partIndices.forEach((idx: number) => processedIndices.add(idx));
        });

        // 创建索引到思维组的映射（用于在正确位置渲染）
        const indexToThinkingGroup = new Map<number, [string, any]>();
        thinkingGroups.forEach((group, key) => {
          indexToThinkingGroup.set(group.firstIndex, [key, group]);
        });

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
              <MessageContent
                className={message.role === "assistant" ? "w-full" : ""}
              >
                {/* 渲染消息部分，并在适当位置插入思维链/任务 */}
                {message.parts.flatMap((part: any, i: number) => {
                  const elements: React.ReactElement[] = [];

                  // 检查当前位置是否应该渲染思维组
                  if (indexToThinkingGroup.has(i)) {
                    const [key, group] = indexToThinkingGroup.get(i)!;
                    const isComplete = isThinkingGroupComplete(group);
                    const shouldOpen = status === "streaming" || !isComplete;

                    if (group.type === "chain-of-thought") {
                      elements.push(
                        <ChainOfThought
                          key={`${message.id}-${key}`}
                          defaultOpen={shouldOpen}
                        >
                          <ChainOfThoughtHeader>
                            {group.title}
                          </ChainOfThoughtHeader>
                          <ChainOfThoughtContent>
                            {group.steps.map((step: any) => (
                              <ChainOfThoughtStep
                                key={`${message.id}-${step.id}`}
                                label={step.label}
                                description={step.description}
                                status={step.status}
                              >
                                {step.searchResults &&
                                  step.searchResults.length > 0 && (
                                    <ChainOfThoughtSearchResults>
                                      {step.searchResults.map(
                                        (result: any, idx: number) => (
                                          <ChainOfThoughtSearchResult
                                            key={`${step.id}-result-${idx}`}
                                            onClick={
                                              result.url
                                                ? () =>
                                                    window.open(
                                                      result.url,
                                                      "_blank"
                                                    )
                                                : undefined
                                            }
                                          >
                                            {result.title}
                                          </ChainOfThoughtSearchResult>
                                        )
                                      )}
                                    </ChainOfThoughtSearchResults>
                                  )}
                              </ChainOfThoughtStep>
                            ))}
                          </ChainOfThoughtContent>
                        </ChainOfThought>
                      );
                    } else if (group.type === "task") {
                      elements.push(
                        <Task
                          key={`${message.id}-${key}`}
                          defaultOpen={shouldOpen}
                        >
                          <TaskTrigger title={group.title} />
                          <TaskContent>
                            {group.steps.map((step: any) => (
                              <TaskItem key={`${message.id}-${step.id}`}>
                                {step.label}
                                {step.files && step.files.length > 0 && (
                                  <div className="mt-1 flex gap-2">
                                    {step.files.map(
                                      (file: string, idx: number) => (
                                        <TaskItemFile
                                          key={`${step.id}-file-${idx}`}
                                        >
                                          {file}
                                        </TaskItemFile>
                                      )
                                    )}
                                  </div>
                                )}
                              </TaskItem>
                            ))}
                          </TaskContent>
                        </Task>
                      );
                    }
                  }

                  // 跳过已聚合的思维步骤
                  if (processedIndices.has(i)) {
                    return elements;
                  }
                  // 忽略 step-start 类型（步骤标记，不需要显示）
                  if (part.type === "step-start") {
                    return elements;
                  }

                  // 调试：记录未识别的消息部分类型
                  if (
                    part.type &&
                    ![
                      "text",
                      "tool-weather",
                      "tool-webSearch",
                      "tool-thinkingStep",
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
                      // 移动端不解析 artifact 和 thinking，直接渲染原始文本
                      if (isMobile) {
                        elements.push(
                          <Response
                            key={`${message.id}-${i}`}
                            shikiTheme={["github-light", "github-dark"]}
                            className="markdown"
                            citations={messageCitations}
                            onCitationClick={(citationId) =>
                              handleCitationClick(citationId, messageCitations)
                            }
                          >
                            {part.text}
                          </Response>
                        );
                        return elements;
                      }

                      // 桌面端：Parse HTML/SVG code blocks from the text
                      // 注意：不再解析思维块，因为现在使用工具调用的流式方式
                      const parsedBlocks = parseHtmlCodeBlocks(part.text);

                      elements.push(
                        <div key={`${message.id}-${i}`} className="w-full">
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
                                title:
                                  block.filename ||
                                  `${block.type.toUpperCase()} Preview`,
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
                      return elements;

                    case "tool-weather":
                      // ReAct 模式：显示工具调用的详细信息
                      const weatherToolPart = part as any;
                      elements.push(
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
                      return elements;

                    case "tool-webSearch":
                      // webSearch 工具调用
                      const webSearchToolPart = part as any;
                      elements.push(
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
                      return elements;

                    case "reasoning":
                      elements.push(
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={status === "streaming"}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                      return elements;

                    // 兼容其他工具调用格式
                    case "tool-call":
                    case "tool-result":
                      const toolPart = part as any;
                      elements.push(
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
                      return elements;

                    default:
                      // 处理其他可能的工具调用格式（通过 toolCallId 识别）
                      if (part.toolCallId || part.type?.startsWith("tool-")) {
                        const toolName =
                          part.type?.replace("tool-", "") ||
                          part.toolName ||
                          "tool";

                        // 跳过 thinkingStep（已在上面聚合渲染）
                        if (toolName === "thinkingStep") {
                          return elements;
                        }

                        elements.push(
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
                      return elements;
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
