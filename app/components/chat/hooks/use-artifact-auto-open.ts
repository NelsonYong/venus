import { useEffect } from "react";
import { UIMessage } from "ai";
import { Artifact } from "@/lib/types/artifact";
import { parseHtmlCodeBlocks } from "../utils";

interface UseArtifactAutoOpenProps {
  messages: UIMessage[];
  isMobile: boolean;
  hasAutoOpenedArtifact: boolean;
  onArtifactOpen?: (artifact: Artifact, previewUrl: string) => void;
  onAutoOpenComplete?: () => void;
}

export function useArtifactAutoOpen({
  messages,
  isMobile,
  hasAutoOpenedArtifact,
  onArtifactOpen,
  onAutoOpenComplete,
}: UseArtifactAutoOpenProps) {
  useEffect(() => {
    // Don't auto-open on mobile
    if (
      isMobile ||
      !onArtifactOpen ||
      !onAutoOpenComplete ||
      hasAutoOpenedArtifact
    ) {
      return;
    }

    // Find the last assistant message and check if it just finished
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "assistant") {
        const metadata = (message as any).metadata;

        // Check if message is marked as finished
        if (metadata?.isFinished === true) {
          // Iterate through all parts to find artifact
          for (const part of message.parts) {
            if (part.type === "text") {
              const parsedBlocks = parseHtmlCodeBlocks(part.text);
              // Find first artifact block
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

                  // Create preview URL
                  const blob = new Blob([block.content], {
                    type: block.type === "svg" ? "image/svg+xml" : "text/html",
                  });
                  const previewUrl = URL.createObjectURL(blob);

                  // Auto-open
                  onArtifactOpen(artifact, previewUrl);
                  onAutoOpenComplete();
                  return;
                }
              }
            }
          }
        }
        // Only check last assistant message
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
}
