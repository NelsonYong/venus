import { Response } from "@/components/ai-elements/response";
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
import { Artifact } from "@/lib/types/artifact";
import { ArtifactPreview } from "./artifact-preview";
import { parseHtmlCodeBlocks } from "./utils";

interface MessagePartsRendererProps {
  part: any;
  messageId: string;
  partIndex: number;
  status: string;
  isMobile: boolean;
  messageCitations: any[];
  onCitationClick: (citationId: number) => void;
  onArtifactPreviewClick: (artifact: Artifact, previewUrl: string) => void;
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
  const elements: React.ReactElement[] = [];

  switch (part.type) {
    case "text":
      // Mobile: render plain text without parsing artifacts
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
        );
        return elements;
      }

      // Desktop: Parse HTML/SVG/Markdown code blocks
      const parsedBlocks = parseHtmlCodeBlocks(part.text);

      elements.push(
        <div key={`${messageId}-${partIndex}`} className="w-full">
          {parsedBlocks.map((block, blockIndex) => {
            if (
              block.type === "html" ||
              block.type === "svg" ||
              block.type === "markdown"
            ) {
              // Render artifact preview
              const artifact: Artifact = {
                id: block.id || `${block.type}-${blockIndex}`,
                type: block.type,
                title: block.filename || `${block.type.toUpperCase()} Preview`,
                language: block.type,
                code: block.content,
                previewable: true,
              };
              return (
                <ArtifactPreview
                  key={block.id || `${messageId}-${partIndex}-${blockIndex}`}
                  artifact={artifact}
                  onClick={(previewUrl) =>
                    onArtifactPreviewClick(artifact, previewUrl)
                  }
                />
              );
            } else {
              // Render text content
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
              );
            }
          })}
        </div>
      );
      return elements;

    case "tool-weather":
    case "tool-webSearch":
      const toolPart = part as any;
      elements.push(
        <Tool key={`${messageId}-${partIndex}`} defaultOpen={status === "streaming"}>
          <ToolHeader
            type={part.type}
            state={
              toolPart.state ||
              (status === "streaming" ? "input-streaming" : "output-available")
            }
          />
          <ToolContent>
            {toolPart.input && <ToolInput input={toolPart.input} />}
            {toolPart.output && (
              <ToolOutput
                output={
                  typeof toolPart.output === "string"
                    ? toolPart.output
                    : JSON.stringify(toolPart.output, null, 2)
                }
                errorText={toolPart.error}
              />
            )}
          </ToolContent>
        </Tool>
      );
      return elements;

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
      );
      return elements;

    case "tool-call":
    case "tool-result":
      const genericToolPart = part as any;
      elements.push(
        <Tool key={`${messageId}-${partIndex}`} defaultOpen={status === "streaming"}>
          <ToolHeader
            type={genericToolPart.toolName || genericToolPart.toolCallId || "tool"}
            state={
              genericToolPart.state ||
              (status === "streaming" ? "input-streaming" : "output-available")
            }
          />
          <ToolContent>
            {(genericToolPart.input || genericToolPart.args) && (
              <ToolInput input={genericToolPart.input || genericToolPart.args} />
            )}
            {(genericToolPart.output || genericToolPart.result) && (
              <ToolOutput
                output={
                  typeof (genericToolPart.output || genericToolPart.result) ===
                  "string"
                    ? genericToolPart.output || genericToolPart.result
                    : JSON.stringify(
                        genericToolPart.output || genericToolPart.result,
                        null,
                        2
                      )
                }
                errorText={genericToolPart.error}
              />
            )}
          </ToolContent>
        </Tool>
      );
      return elements;

    default:
      // Handle other tool call formats
      if (part.toolCallId || part.type?.startsWith("tool-")) {
        const toolName =
          part.type?.replace("tool-", "") || part.toolName || "tool";

        // Skip thinkingStep (already aggregated and rendered)
        if (toolName === "thinkingStep") {
          return elements;
        }

        elements.push(
          <Tool key={`${messageId}-${partIndex}`} defaultOpen={status === "streaming"}>
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
                    typeof (part.output || part.result) === "string"
                      ? part.output || part.result
                      : JSON.stringify(part.output || part.result, null, 2)
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
}
