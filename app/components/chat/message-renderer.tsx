"use client";

import {
  Message,
  MessageContent,
  MessageAttachment,
  MessageAttachments,
} from "@/components/ai-elements/message";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import { Loader } from "@/components/ai-elements/loader";
import { UIMessage } from "ai";
import { Citations } from "./citations";
import { CitationsSidebar } from "./citations-sidebar";
import { ExternalLinkDialog } from "./external-link-dialog";
import { ArtifactPreviewSidebar } from "./artifact-preview-sidebar";
import { cn } from "@/lib/utils";
import { useMobile } from "@/app/hooks/use-mobile";
import { Artifact } from "@/lib/types/artifact";
import { useCitations } from "./hooks/use-citations";
import { useArtifactAutoOpen } from "./hooks/use-artifact-auto-open";
import { MessageActions } from "./message-actions";
import { MessagePartsRenderer } from "./message-parts-renderer";
import { ThinkingRenderer } from "./thinking-renderer";
import { aggregateThinkingSteps, isThinkingGroupComplete } from "./utils";

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
  const isMobile = useMobile();

  // Custom hooks
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
  } = useCitations();

  useArtifactAutoOpen({
    messages,
    isMobile,
    hasAutoOpenedArtifact,
    onArtifactOpen,
    onAutoOpenComplete,
  });

  // Helper functions
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

        // Read attachments: prioritize data (realtime), then metadata (history)
        let messageAttachments = [];
        if ((message as any).data?.uploadedAttachments) {
          messageAttachments = (message as any).data.uploadedAttachments;
        } else if ((message as any).metadata?.uploadedAttachments) {
          messageAttachments = (message as any).metadata.uploadedAttachments;
        }

        // Aggregate thinking steps
        const thinkingGroups =
          message.role === "assistant"
            ? aggregateThinkingSteps(message.parts)
            : new Map();

        // Track processed part indices
        const processedIndices = new Set<number>();
        thinkingGroups.forEach((group) => {
          group.partIndices.forEach((idx: number) => processedIndices.add(idx));
        });

        // Create index to thinking group mapping
        const indexToThinkingGroup = new Map<number, [string, any]>();
        thinkingGroups.forEach((group, key) => {
          indexToThinkingGroup.set(group.firstIndex, [key, group]);
        });

        return (
          <div key={message.id} className="group flex flex-col">
            {/* Sources */}
            {message.role === "assistant" && (
              <Sources>
                {message.parts.map((part: any, i: number) => {
                  if (part.type === "source-url") {
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
              {/* User uploaded file attachments */}
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
                {/* Render message parts with thinking groups */}
                {message.parts.flatMap((part: any, i: number) => {
                  const elements: React.ReactElement[] = [];

                  // Check if we should render a thinking group at this position
                  if (indexToThinkingGroup.has(i)) {
                    const [key, group] = indexToThinkingGroup.get(i)!;
                    const isComplete = isThinkingGroupComplete(group);
                    const shouldOpen = status === "streaming" || !isComplete;

                    elements.push(
                      <ThinkingRenderer
                        key={`${message.id}-${key}`}
                        group={group}
                        messageId={message.id}
                        groupKey={key}
                        shouldOpen={shouldOpen}
                      />
                    );
                  }

                  // Skip already aggregated thinking steps
                  if (processedIndices.has(i)) {
                    return elements;
                  }

                  // Ignore step-start type (marker, doesn't need display)
                  if (part.type === "step-start") {
                    return elements;
                  }

                  // Debug: log unrecognized message part types
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

                  // Render message part
                  const partElements = MessagePartsRenderer({
                    part,
                    messageId: message.id,
                    partIndex: i,
                    status,
                    isMobile,
                    messageCitations,
                    onCitationClick: (citationId) =>
                      handleCitationClick(citationId, messageCitations),
                    onArtifactPreviewClick: handleOpenArtifactPreview,
                  });

                  elements.push(...partElements);
                  return elements;
                })}
              </MessageContent>

              {/* Citations */}
              {message.role === "assistant" && messageCitations.length > 0 && (
                <Citations
                  citations={messageCitations}
                  onOpenSidebar={() => handleOpenSidebar(messageCitations)}
                />
              )}
            </Message>

            {/* Message Actions */}
            <MessageActions
              message={message}
              isLastAssistantMessage={isLastAssistantMessage(index)}
              status={status}
              onRegenerate={onRegenerate}
            />
          </div>
        );
      })}

      {status === "submitted" && <Loader />}

      {/* Citations Sidebar */}
      <CitationsSidebar
        citations={activeCitations}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        highlightedId={highlightedCitationId}
      />

      {/* External Link Confirmation Dialog */}
      <ExternalLinkDialog
        url={externalLinkUrl}
        isOpen={isExternalLinkDialogOpen}
        onClose={handleCloseExternalLinkDialog}
        onConfirm={handleExternalLinkConfirm}
      />

      {/* Artifact Preview Sidebar - only when not managed by parent */}
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
