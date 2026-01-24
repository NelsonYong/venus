"use client"

import { Response } from "@/components/ai-elements/response"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { Artifact } from "@/lib/types/artifact"
import { ArtifactPreview } from "./artifact-preview"
import { parseHtmlCodeBlocks } from "./utils"

interface MessagePartsRendererProps {
  part: any
  messageId: string
  partIndex: number
  status: string
  isMobile: boolean
  messageCitations: any[]
  onCitationClick: (citationId: number) => void
  onArtifactPreviewClick: (artifact: Artifact, previewUrl: string) => void
}

export function MessagePartsRenderer({
  part,
  messageId,
  partIndex,
  status,
  isMobile,
  messageCitations,
  onCitationClick,
  onArtifactPreviewClick,
}: MessagePartsRendererProps) {
  const elements: React.ReactElement[] = []

  switch (part.type) {
    case "text":
      if (isMobile) {
        elements.push(
          <Response
            key={`${messageId}-${partIndex}`}
            shikiTheme={["github-light", "github-dark"]}
            className="markdown"
            citations={messageCitations}
            onCitationClick={onCitationClick}
          >
            {part.text}
          </Response>
        )
        return elements
      }

      const parsedBlocks = parseHtmlCodeBlocks(part.text)
      elements.push(
        <div key={`${messageId}-${partIndex}`} className="w-full">
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
                  onClick={(previewUrl) => onArtifactPreviewClick(artifact, previewUrl)}
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
      return elements

    case "reasoning":
      elements.push(
        <Reasoning
          key={`${messageId}-${partIndex}`}
          className="w-full"
          isStreaming={status === "streaming"}
        >
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      )
      return elements

    case "tool-call":
    case "tool-result":
    case "tool-weather":
    case "tool-webSearch":
      const toolPart = part as any
      const toolName = toolPart.toolName || part.type?.replace("tool-", "") || "tool"
      elements.push(
        <Tool key={`${messageId}-${partIndex}`} defaultOpen={status === "streaming"}>
          <ToolHeader
            type={toolName}
            state={
              toolPart.state ||
              (status === "streaming" ? "input-streaming" : "output-available")
            }
          />
          <ToolContent>
            {(toolPart.input || toolPart.args) && (
              <ToolInput input={toolPart.input || toolPart.args} />
            )}
            {(toolPart.output || toolPart.result) && (
              <ToolOutput
                output={
                  typeof (toolPart.output || toolPart.result) === "string"
                    ? toolPart.output || toolPart.result
                    : JSON.stringify(toolPart.output || toolPart.result, null, 2)
                }
                errorText={toolPart.error}
              />
            )}
          </ToolContent>
        </Tool>
      )
      return elements

    default:
      return elements
  }
}
