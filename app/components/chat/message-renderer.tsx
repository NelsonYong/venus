"use client"

import {
  Message,
  MessageContent,
  MessageAttachment,
  MessageAttachments,
} from "@/components/ai-elements/message"
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source"
import { Loader } from "@/components/ai-elements/loader"
import { Citations } from "./citations"
import { CitationsSidebar } from "./citations-sidebar"
import { ExternalLinkDialog } from "./external-link-dialog"
import { cn } from "@/lib/utils"
import { useMobile } from "@/app/hooks/use-mobile"
import { useChatContext } from "@/app/contexts/chat-context"
import { useCitations } from "./hooks/use-citations"
import { useArtifactAutoOpen } from "./hooks/use-artifact-auto-open"
import { MessageActions } from "./message-actions"
import { MessagePartsRenderer } from "./message-parts-renderer"
import type { ChatMessage, MessagePart, UploadedAttachment, Citation } from "@/lib/types/chat"

export function MessageRenderer() {
  const isMobile = useMobile()
  const { messages, status, actions, ui } = useChatContext()

  const {
    isSidebarOpen,
    highlightedCitationId,
    activeCitations,
    externalLinkUrl,
    isExternalLinkDialogOpen,
    handleCitationClick,
    handleExternalLinkConfirm,
    handleOpenSidebar,
    handleCloseSidebar,
    handleCloseExternalLinkDialog,
  } = useCitations()

  useArtifactAutoOpen({
    messages: messages as any,
    isMobile,
    hasAutoOpenedArtifact: ui.hasAutoOpenedArtifact,
    onArtifactOpen: ui.openArtifact,
    onAutoOpenComplete: ui.markAutoOpened,
  })

  const isLastAssistantMessage = (index: number) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return i === index
      }
    }
    return false
  }

  const messageClassname = cn("pb-0 max-w-[80%] w-[80%]", {
    "max-w-[100%] w-full": isMobile,
  })

  return (
    <>
      {messages.map((message, index) => {
        const messageCitations: Citation[] =
          (message as ChatMessage).metadata?.citations ?? []

        const messageAttachments: UploadedAttachment[] =
          (message as ChatMessage).data?.uploadedAttachments ??
          (message as ChatMessage).metadata?.uploadedAttachments ??
          []

        return (
          <div key={message.id} className="group flex flex-col">
            {/* Sources from provider */}
            {message.role === "assistant" && (
              <Sources>
                {message.parts.map((part: MessagePart, i: number) => {
                  if (part.type === "source-url") {
                    return (
                      <span key={`${message.id}-source-${i}`}>
                        <SourcesTrigger
                          count={
                            message.parts.filter(
                              (p: MessagePart) => p.type === "source-url"
                            ).length
                          }
                        />
                        <SourcesContent>
                          <Source href={part.url} title={part.url} />
                        </SourcesContent>
                      </span>
                    )
                  }
                  return null
                })}
              </Sources>
            )}

            <Message
              from={message.role}
              key={message.id}
              className={messageClassname}
            >
              {message.role === "user" && messageAttachments.length > 0 && (
                <MessageAttachments className="mb-2">
                  {messageAttachments.map((attachment, idx) => (
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
                {message.parts.map((part: MessagePart, i: number) => {
                  if (part.type === "step-start" || part.type === "source-url") {
                    return null
                  }

                  return (
                    <MessagePartsRenderer
                      key={`${message.id}-part-${i}`}
                      part={part}
                      messageId={message.id}
                      partIndex={i}
                      messageCitations={messageCitations}
                      onCitationClick={(citationId: number) =>
                        handleCitationClick(citationId, messageCitations)
                      }
                    />
                  )
                })}
                {/* Streaming cursor on last assistant message */}
                {status === "streaming" &&
                  message.role === "assistant" &&
                  isLastAssistantMessage(index) &&
                  message.parts.some((p: MessagePart) => p.type === "text") && (
                    <span className="streaming-cursor" />
                  )}
              </MessageContent>

              {message.role === "assistant" && messageCitations.length > 0 && (
                <Citations
                  citations={messageCitations}
                  onOpenSidebar={() => handleOpenSidebar(messageCitations)}
                />
              )}
            </Message>

            <MessageActions
              message={message}
              isLastAssistantMessage={isLastAssistantMessage(index)}
            />
          </div>
        )
      })}

      {status === "submitted" && <Loader />}

      <CitationsSidebar
        citations={activeCitations}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        highlightedId={highlightedCitationId}
      />

      <ExternalLinkDialog
        url={externalLinkUrl}
        isOpen={isExternalLinkDialogOpen}
        onClose={handleCloseExternalLinkDialog}
        onConfirm={handleExternalLinkConfirm}
      />
    </>
  )
}
