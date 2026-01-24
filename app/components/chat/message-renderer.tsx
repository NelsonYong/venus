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
import { UIMessage } from "ai"
import { Citations } from "./citations"
import { CitationsSidebar } from "./citations-sidebar"
import { ExternalLinkDialog } from "./external-link-dialog"
import { ArtifactPreviewSidebar } from "./artifact-preview-sidebar"
import { cn } from "@/lib/utils"
import { useMobile } from "@/app/hooks/use-mobile"
import { Artifact } from "@/lib/types/artifact"
import { useCitations } from "./hooks/use-citations"
import { useArtifactAutoOpen } from "./hooks/use-artifact-auto-open"
import { MessageActions } from "./message-actions"
import { MessagePartsRenderer } from "./message-parts-renderer"

interface MessageRendererProps {
  messages: UIMessage[]
  status: string
  onRegenerate?: () => void
  onArtifactOpen?: (artifact: Artifact, previewUrl: string) => void
  onArtifactClose?: () => void
  artifactSidebarState?: {
    artifact: Artifact | null
    isOpen: boolean
    previewUrl: string | null
  }
  hasAutoOpenedArtifact?: boolean
  onAutoOpenComplete?: () => void
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
  const isMobile = useMobile()

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
    messages,
    isMobile,
    hasAutoOpenedArtifact,
    onArtifactOpen,
    onAutoOpenComplete,
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
    "max-w-[100%]": isMobile,
    "w-full": isMobile,
  })

  return (
    <>
      {messages.map((message, index) => {
        const messageCitations = (message as any).metadata?.citations || []

        let messageAttachments = []
        if ((message as any).data?.uploadedAttachments) {
          messageAttachments = (message as any).data.uploadedAttachments
        } else if ((message as any).metadata?.uploadedAttachments) {
          messageAttachments = (message as any).metadata.uploadedAttachments
        }

        return (
          <div key={message.id} className="group flex flex-col">
            {/* Sources from provider */}
            {message.role === "assistant" && (
              <Sources>
                {message.parts.map((part: any, i: number) => {
                  if (part.type === "source-url") {
                    return (
                      <span key={`${message.id}-source-${i}`}>
                        <SourcesTrigger
                          count={
                            message.parts.filter(
                              (p: any) => p.type === "source-url"
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
                {message.parts.map((part: any, i: number) => {
                  if (part.type === "step-start" || part.type === "source-url") {
                    return null
                  }

                  const partElements = MessagePartsRenderer({
                    part,
                    messageId: message.id,
                    partIndex: i,
                    status,
                    isMobile,
                    messageCitations,
                    onCitationClick: (citationId) =>
                      handleCitationClick(citationId, messageCitations),
                    onArtifactPreviewClick: (artifact, previewUrl) =>
                      onArtifactOpen?.(artifact, previewUrl),
                  })

                  return partElements.length > 0 ? (
                    <span key={`${message.id}-part-${i}`}>{partElements}</span>
                  ) : null
                })}
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
              status={status}
              onRegenerate={onRegenerate}
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

      {!artifactSidebarState && (
        <ArtifactPreviewSidebar
          artifact={null}
          isOpen={false}
          previewUrl=""
          onClose={onArtifactClose || (() => {})}
        />
      )}
    </>
  )
}
