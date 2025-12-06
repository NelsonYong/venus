"use client";

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
  ContextContentFooter,
} from "@/components/ai-elements/context";
import { GlobeIcon, Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "@/app/contexts/i18n-context";
import { ChatStatus } from "ai";
import { useAvailableModels } from "@/app/hooks/use-available-models";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { LanguageModelUsage } from "ai";

export interface UploadedAttachment {
  url: string;
  filename: string;
  size: number;
  type: string;
  contentType: string;
}

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (
    message: PromptInputMessage,
    attachments: UploadedAttachment[]
  ) => void;
  model: string;
  onModelChange: (value: string) => void;
  webSearch: boolean;
  onWebSearchToggle: () => void;
  status: string;
  onStop?: () => void;
  className?: string;
  usage?: LanguageModelUsage & { maxTokens?: number };
}

// 文件上传到服务器的内部组件
function ChatInputInner({
  input: _,
  onInputChange,
  onSubmit,
  model,
  onModelChange,
  webSearch,
  onWebSearchToggle,
  status,
  onStop,
  className,
  usage,
}: ChatInputProps) {
  const { t } = useTranslation();
  const { models: availableModels, isLoading: isLoadingModels } =
    useAvailableModels(onModelChange);
  const [open, setOpen] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<
    UploadedAttachment[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const attachmentsContext = usePromptInputAttachments();
  const uploadingFiles = useRef(new Set<string>());

  const { files } = attachmentsContext;

  const handleModelChange = (value: string) => {
    onModelChange(value);
    localStorage.setItem("selectedModelId", value);
    setOpen(false);
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

  // 当文件列表变化时，上传新文件到服务器
  useEffect(() => {
    const uploadNewFiles = async () => {
      // 找出还没有上传的文件
      const newFiles = files.filter(
        (file) =>
          file.url.startsWith("blob:") && !uploadingFiles.current.has(file.id)
      );

      if (newFiles.length === 0) return;

      // 标记这些文件正在上传
      newFiles.forEach((file) => uploadingFiles.current.add(file.id));
      setUploading(true);

      try {
        // 从 blob URLs 获取文件
        const filePromises = newFiles.map(async (fileUIPart) => {
          if (fileUIPart.url && fileUIPart.url.startsWith("blob:")) {
            const response = await fetch(fileUIPart.url);
            const blob = await response.blob();
            return {
              file: new File([blob], fileUIPart.filename || "file", {
                type: fileUIPart.mediaType || "application/octet-stream",
              }),
              id: fileUIPart.id,
            };
          }
          return null;
        });

        const filesWithIds = (await Promise.all(filePromises)).filter(
          (f) => f !== null
        ) as { file: File; id: string }[];

        // 上传到服务器
        const formData = new FormData();
        filesWithIds.forEach(({ file }) => {
          formData.append("files", file);
        });

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        const uploaded: UploadedAttachment[] = data.files;

        // 保存上传结果
        setUploadedAttachments((prev) => {
          // 创建一个 Map 来存储已有的附件
          const existingMap = new Map(
            prev.map((item) => [item.filename, item])
          );

          // 添加新上传的附件
          uploaded.forEach((item) => {
            existingMap.set(item.filename, item);
          });

          return Array.from(existingMap.values());
        });

        // 移除上传标记
        filesWithIds.forEach(({ id }) => uploadingFiles.current.delete(id));
      } catch (error) {
        console.error("Upload error:", error);
        // 上传失败，移除标记以便重试
        newFiles.forEach((file) => uploadingFiles.current.delete(file.id));
      } finally {
        setUploading(false);
      }
    };

    uploadNewFiles();
  }, [files]);

  const handlePromptInputSubmit = async (
    message: PromptInputMessage,
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    // 如果还在上传中，不允许提交
    if (uploading) {
      return;
    }

    // 使用已经上传好的附件
    onSubmit(message, uploadedAttachments);

    // 清空上传的附件
    setUploadedAttachments([]);
    uploadingFiles.current.clear();
  };

  // 获取当前选中的模型
  const selectedModel = availableModels.find((m) => m.id === model);

  // 计算上下文用量
  const totalTokens = useMemo(() => {
    if (!usage) return 0;
    return (usage.inputTokens || 0) + (usage.outputTokens || 0);
  }, [usage]);

  // console.log("usage", usage);

  // 获取模型的上下文窗口大小
  const maxTokens = useMemo(() => {
    if (!usage) return 0;
    return usage.maxTokens || 0;
  }, [usage]);

  // 判断是否显示用量指示器
  const showUsage = usage && (usage.inputTokens || usage.outputTokens);

  // console.log("usage", usage);

  return (
    <PromptInput
      globalDrop
      maxFiles={5}
      multiple
      onSubmit={handlePromptInputSubmit}
      className={cn("w-full", className)}
    >
      <PromptInputAttachments>
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={t("chat.placeholder")}
          onChange={(e) => onInputChange(e.target.value)}
          className="min-h-[56px] py-2.5 px-3 text-sm"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments label={t("chat.addFiles")} />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputButton
            variant={webSearch ? "default" : "ghost"}
            onClick={onWebSearchToggle}
            size="sm"
          >
            <GlobeIcon size={16} />
            <span className="hidden sm:inline">{t("chat.search")}</span>
          </PromptInputButton>
          <ModelSelector open={open} onOpenChange={setOpen}>
            <ModelSelectorTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 justify-start gap-2"
                disabled={isLoadingModels}
              >
                {selectedModel?.provider && (
                  <ModelSelectorLogo provider={selectedModel.provider} />
                )}
                <span className="truncate text-sm">
                  {selectedModel?.displayName ||
                    (isLoadingModels
                      ? t("chat.loadingModels")
                      : t("chat.selectModel"))}
                </span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </ModelSelectorTrigger>
            <ModelSelectorContent title={t("chat.selectModel")}>
              <ModelSelectorInput
                placeholder={t("chat.searchModels") || "搜索模型..."}
              />
              <ModelSelectorList>
                <ModelSelectorEmpty>
                  {t("chat.noModelsFound") || "未找到模型"}
                </ModelSelectorEmpty>
                {sortedProviders.map((provider) => (
                  <ModelSelectorGroup
                    key={provider}
                    heading={providerNames[provider.toLowerCase()] || provider}
                  >
                    {groupedModels[provider].map((availableModel) => (
                      <ModelSelectorItem
                        key={availableModel.id}
                        value={availableModel.id}
                        onSelect={() => handleModelChange(availableModel.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {availableModel.provider && (
                            <ModelSelectorLogo
                              provider={availableModel.provider}
                            />
                          )}
                          <ModelSelectorName>
                            {availableModel.displayName}
                          </ModelSelectorName>
                          {availableModel.isPreset && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {t("models.preset")}
                            </span>
                          )}
                          {model === availableModel.id && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </div>
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>

          {/* Token 用量显示 */}
          {showUsage && (
            <Context
              usedTokens={totalTokens}
              maxTokens={maxTokens}
              usage={usage}
              modelId={selectedModel?.id}
            >
              <ContextTrigger className="h-8 text-xs" />
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody className="space-y-2">
                  <ContextInputUsage />
                  <ContextOutputUsage />
                  <ContextReasoningUsage />
                  <ContextCacheUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          )}
        </PromptInputTools>
        <PromptInputSubmit
          disabled={uploading}
          status={uploading ? "submitted" : (status as ChatStatus)}
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

export function ChatInput(props: ChatInputProps) {
  return (
    <PromptInputProvider initialInput={props.input}>
      <ChatInputInner {...props} />
    </PromptInputProvider>
  );
}
