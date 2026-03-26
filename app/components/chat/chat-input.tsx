"use client"

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
} from "@/components/ai-elements/prompt-input"
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
} from "@/components/ai-elements/model-selector"
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
} from "@/components/ai-elements/context"
import { GlobeIcon, Check, ChevronsUpDown } from "lucide-react"
import { useTranslation } from "@/app/contexts/i18n-context"
import { useChatContext } from "@/app/contexts/chat-context"
import type { ChatStatus } from "ai"
import { useAvailableModels } from "@/app/hooks/use-available-models"
import { cn } from "@/lib/utils"
import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import type { UploadedAttachment } from "@/lib/types/chat"

interface ChatInputProps {
  className?: string
}

function ChatInputInner({ className }: ChatInputProps) {
  const { t } = useTranslation()
  const { actions, model: modelState, status, usage } = useChatContext()
  const { modelId, setModelId, webSearch, setWebSearch } = modelState

  const { models: availableModels, isLoading: isLoadingModels } =
    useAvailableModels(setModelId)
  const [open, setOpen] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const attachmentsContext = usePromptInputAttachments()
  const uploadingFiles = useRef(new Set<string>())

  const { files } = attachmentsContext

  const handleModelChange = (value: string) => {
    setModelId(value)
    localStorage.setItem("selectedModelId", value)
    setOpen(false)
  }

  // Group models by provider
  const groupedModels = availableModels.reduce(
    (groups, m) => {
      const provider = m.provider || "other"
      if (!groups[provider]) {
        groups[provider] = []
      }
      groups[provider].push(m)
      return groups
    },
    {} as Record<string, typeof availableModels>
  )

  const providerNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    deepseek: "DeepSeek",
    gemini: "Google Gemini",
    other: t("models.other") || "Other",
  }

  const providerOrder = ["openai", "anthropic", "google", "gemini", "deepseek", "other"]
  const sortedProviders = Object.keys(groupedModels).sort((a, b) => {
    const indexA = providerOrder.indexOf(a.toLowerCase())
    const indexB = providerOrder.indexOf(b.toLowerCase())
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Upload new files when file list changes
  useEffect(() => {
    const uploadNewFiles = async () => {
      const newFiles = files.filter(
        (file) => file.url.startsWith("blob:") && !uploadingFiles.current.has(file.id)
      )
      if (newFiles.length === 0) return

      newFiles.forEach((file) => uploadingFiles.current.add(file.id))
      setUploading(true)

      try {
        const filePromises = newFiles.map(async (fileUIPart) => {
          if (fileUIPart.url?.startsWith("blob:")) {
            const response = await fetch(fileUIPart.url)
            const blob = await response.blob()
            return {
              file: new File([blob], fileUIPart.filename || "file", {
                type: fileUIPart.mediaType || "application/octet-stream",
              }),
              id: fileUIPart.id,
            }
          }
          return null
        })

        const filesWithIds = (await Promise.all(filePromises)).filter(
          (f): f is { file: File; id: string } => f !== null
        )

        const formData = new FormData()
        filesWithIds.forEach(({ file }) => {
          formData.append("files", file)
        })

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const data = await response.json()
        const uploaded: UploadedAttachment[] = data.files

        setUploadedAttachments((prev) => {
          const existingMap = new Map(prev.map((item) => [item.filename, item]))
          uploaded.forEach((item) => {
            existingMap.set(item.filename, item)
          })
          return Array.from(existingMap.values())
        })

        filesWithIds.forEach(({ id }) => uploadingFiles.current.delete(id))
      } catch (err) {
        newFiles.forEach((file) => uploadingFiles.current.delete(file.id))
      } finally {
        setUploading(false)
      }
    }

    uploadNewFiles()
  }, [files])

  const handlePromptInputSubmit = async (
    message: PromptInputMessage,
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (uploading) return
    actions.send(message, uploadedAttachments)
    setUploadedAttachments([])
    uploadingFiles.current.clear()
  }

  const selectedModel = availableModels.find((m) => m.id === modelId)

  const totalTokens = useMemo(() => {
    if (!usage) return 0
    return (usage.inputTokens || 0) + (usage.outputTokens || 0)
  }, [usage])

  const maxTokens = useMemo(() => {
    if (!usage) return 0
    return usage.maxTokens || 0
  }, [usage])

  const showUsage = usage && (usage.inputTokens || usage.outputTokens)

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
            onClick={() => setWebSearch(!webSearch)}
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
                    (isLoadingModels ? t("chat.loadingModels") : t("chat.selectModel"))}
                </span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </ModelSelectorTrigger>
            <ModelSelectorContent title={t("chat.selectModel")}>
              <ModelSelectorInput placeholder={t("chat.searchModels") || "Search models..."} />
              <ModelSelectorList>
                <ModelSelectorEmpty>{t("chat.noModelsFound") || "No models found"}</ModelSelectorEmpty>
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
                            <ModelSelectorLogo provider={availableModel.provider} />
                          )}
                          <ModelSelectorName>{availableModel.displayName}</ModelSelectorName>
                          {availableModel.isPreset && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {t("models.preset")}
                            </span>
                          )}
                          {modelId === availableModel.id && (
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
            if (status === "streaming") {
              e.preventDefault()
              e.stopPropagation()
              actions.stop()
            }
          }}
          size="icon-sm"
        />
      </PromptInputFooter>
    </PromptInput>
  )
}

export function ChatInput({ className }: ChatInputProps = {}) {
  return (
    <PromptInputProvider>
      <ChatInputInner className={className} />
    </PromptInputProvider>
  )
}

export type { UploadedAttachment } from "@/lib/types/chat"
