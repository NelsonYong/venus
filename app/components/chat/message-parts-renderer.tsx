"use client"

import { Response } from "@/components/ai-elements/response"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { useMobile } from "@/app/hooks/use-mobile"
import { useChatContext } from "@/app/contexts/chat-context"
import { ArtifactPreview } from "./artifact-preview"
import { parseHtmlCodeBlocks } from "./utils"
import { ToolCallRenderer } from "./tool-call-renderer"
import type { MessagePart, Citation } from "@/lib/types/chat"
import type { Artifact } from "@/lib/types/artifact"

interface MessagePartsRendererProps {
  part: MessagePart
  messageId: string
  partIndex: number
  messageCitations: Citation[]
  onCitationClick: (citationId: number) => void
  /** Whether this specific part is actively being streamed right now */
  isStreamingPart?: boolean
  /** 1-based index when message has multiple reasoning parts (for chain display) */
  reasoningStep?: number
  /** Total number of reasoning parts in this message */
  reasoningStepTotal?: number
}

export function MessagePartsRenderer({
  part,
  messageId,
  partIndex,
  messageCitations,
  onCitationClick,
  isStreamingPart = false,
  reasoningStep,
  reasoningStepTotal,
}: MessagePartsRendererProps) {
  const isMobile = useMobile()
  const { ui } = useChatContext()

  // --- Text part ---
  if (part.type === "text") {
    if (isMobile) {
      return (
        <Response
          shikiTheme={["github-light", "github-dark"]}
          className="markdown"
          citations={messageCitations}
          onCitationClick={onCitationClick}
        >
          {part.text}
        </Response>
      )
    }

    const parsedBlocks = parseHtmlCodeBlocks(part.text)
    return (
      <div className="w-full">
        {parsedBlocks.map((block, blockIndex) => {
          if (block.type === "html" || block.type === "svg" || block.type === "markdown") {
            const artifact: Artifact = {
              id: block.id || `${block.type}-${blockIndex}`,
              type: block.type,
              title: block.filename || `${block.type.toUpperCase()} Preview`,
              language: block.type,
              code: block.content,
              previewable: true,
            }
            return (
              <ArtifactPreview
                key={block.id || `${messageId}-${partIndex}-${blockIndex}`}
                artifact={artifact}
                onClick={(previewUrl) => ui.openArtifact(artifact, previewUrl)}
              />
            )
          }
          return (
            <Response
              key={`${messageId}-${partIndex}-${blockIndex}`}
              shikiTheme={["github-light", "github-dark"]}
              className="markdown"
              citations={messageCitations}
              onCitationClick={onCitationClick}
            >
              {block.content}
            </Response>
          )
        })}
      </div>
    )
  }

  // --- Reasoning part ---
  if (part.type === "reasoning") {
    const tokenCount = part.text.length > 0
      ? Math.ceil(part.text.length / 4) // rough estimate: ~4 chars per token
      : undefined

    const hasChain = reasoningStepTotal !== undefined && reasoningStepTotal > 1
    const stepLabel = hasChain && reasoningStep !== undefined
      ? ` (${reasoningStep}/${reasoningStepTotal})`
      : ""

    return (
      <Reasoning
        className="w-full"
        isStreaming={isStreamingPart}
      >
        <ReasoningTrigger
          getThinkingMessage={(isStreaming, duration) => {
            if (isStreaming) {
              const tokenLabel = tokenCount ? ` · ${tokenCount.toLocaleString()} tokens` : ""
              return <Shimmer duration={1}>{`Thinking${stepLabel}...${tokenLabel}`}</Shimmer>
            }
            const durationLabel = duration ? `${duration}s` : "a few seconds"
            const tokenLabel = tokenCount ? ` · ${tokenCount.toLocaleString()} tokens` : ""
            return <span>Thought{stepLabel} for {durationLabel}{tokenLabel}</span>
          }}
        />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    )
  }

  // --- Tool parts ---
  return <ToolCallRenderer part={part} messageId={messageId} partIndex={partIndex} />
}
