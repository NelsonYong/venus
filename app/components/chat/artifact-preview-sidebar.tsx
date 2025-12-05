"use client";

import { useEffect, useState } from "react";
import {
  X,
  Code,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  Maximize2Icon,
  MousePointerClickIcon,
  RefreshCcwIcon,
  Minimize2Icon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { Artifact } from "@/lib/types/artifact";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewConsole,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { Button } from "@/components/ui/button";
import { Response } from "@/components/ai-elements/response";

interface ArtifactPreviewSidebarProps {
  artifact: Artifact | null;
  previewUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtifactPreviewSidebar({
  artifact,
  previewUrl,
  isOpen,
  onClose,
}: ArtifactPreviewSidebarProps) {
  const [showCode, setShowCode] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (fullscreen) {
          setFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, fullscreen, onClose]);


  // Reset code view when artifact changes
  useEffect(() => {
    setShowCode(false);
    setPreviewKey((prev) => prev + 1);
  }, [artifact?.id]);

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyCode = async () => {
    if (artifact?.code) {
      try {
        await navigator.clipboard.writeText(artifact.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy code:", error);
      }
    }
  };

  if (!artifact) {
    return null;
  }

  return (
    <>
      {/* Fullscreen overlay for fullscreen mode */}
      {fullscreen && (
        <div
          className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50"
          onClick={onClose}
        />
      )}

      {/* Sidebar - embedded in layout, not floating */}
      <div
        className={`${
          fullscreen
            ? "fixed inset-0 z-50 border-l border-border"
            : "h-full w-full"
        } bg-background overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div>
            {showCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="h-8 text-xs"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-4 h-4 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCode(!showCode)}
              className="h-8 text-xs"
            >
              <Code className="w-4 h-4 mr-1" />
              {showCode ? "Preview" : "Code"}
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-57px)]">
          {showCode ? (
            <div className="h-full overflow-y-auto">
              <pre className="p-4 text-sm bg-muted h-full">
                <code className={`language-${artifact.language}`}>
                  {artifact.code}
                </code>
              </pre>
            </div>
          ) : artifact.type === "markdown" ? (
            // Render Markdown using Streamdown
            <div className="h-full overflow-y-auto p-6 bg-background">
              <div className="max-w-4xl mx-auto">
                <Response
                  shikiTheme={["github-light", "github-dark"]}
                  className="markdown prose prose-sm dark:prose-invert max-w-none"
                >
                  {artifact.code}
                </Response>
              </div>
            </div>
          ) : (
            // Render HTML/SVG in WebPreview
            <WebPreview
              key={previewKey}
              defaultUrl={previewUrl}
              className="h-full"
              onUrlChange={(url) => console.log("URL changed to:", url)}
            >
              <WebPreviewNavigation>
                <WebPreviewNavigationButton
                  onClick={() => console.log("Go back")}
                  tooltip="Go back"
                  disabled
                >
                  <ArrowLeftIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton
                  onClick={() => console.log("Go forward")}
                  tooltip="Go forward"
                  disabled
                >
                  <ArrowRightIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton
                  onClick={() => setPreviewKey((prev) => prev + 1)}
                  tooltip="Reload"
                >
                  <RefreshCcwIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewUrl readOnly />
                <WebPreviewNavigationButton
                  onClick={() => console.log("Select")}
                  tooltip="Select element"
                  disabled
                >
                  <MousePointerClickIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton
                  onClick={handleOpenInNewTab}
                  tooltip="Open in new tab"
                >
                  <ExternalLinkIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton
                  onClick={() => setFullscreen(!fullscreen)}
                  tooltip={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {fullscreen ? (
                    <Minimize2Icon className="size-4" />
                  ) : (
                    <Maximize2Icon className="size-4" />
                  )}
                </WebPreviewNavigationButton>
              </WebPreviewNavigation>
              <WebPreviewBody sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin" />
              <WebPreviewConsole />
            </WebPreview>
          )}
        </div>
      </div>
    </>
  );
}
