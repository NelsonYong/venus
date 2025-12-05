"use client";

import { Artifact } from "@/lib/types/artifact";
import { FileCode, ExternalLink } from "lucide-react";

interface ArtifactPreviewProps {
  artifact: Artifact;
  onClick: (previewUrl: string) => void;
}

export function ArtifactPreview({ artifact, onClick }: ArtifactPreviewProps) {
  if (!artifact.previewable) {
    return null;
  }

  const getPreviewUrl = () => {
    if (!artifact) return "";

    if (artifact.type === "html") {
      const blob = new Blob([artifact.code], { type: "text/html" });
      return URL.createObjectURL(blob);
    }
    if (artifact.type === "svg") {
      const htmlWrapper = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: white;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${artifact.code}
</body>
</html>`;
      const blob = new Blob([htmlWrapper], { type: "text/html" });
      return URL.createObjectURL(blob);
    }
    // For markdown, no preview URL needed (will be rendered in sidebar)
    if (artifact.type === "markdown") {
      return "";
    }
    return "";
  };

  const previewUrl = getPreviewUrl();
  const onClickExternalLink = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <div
      className="my-2 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-pointer group overflow-hidden"
      onClick={() => onClick(previewUrl)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Icon and Title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary">
              <FileCode className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-card-foreground">
                  {artifact.title || `${artifact.type.toUpperCase()} Preview`}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {artifact.type.toUpperCase()} Document • Click to preview
              </p>

              {/* Code Preview */}
              {/* <div className="mt-3 p-2 rounded bg-muted/50 text-xs font-mono text-muted-foreground overflow-hidden">
                <pre className="truncate">{getCodePreview()}</pre>
                <span className="text-[10px]">...</span>
              </div> */}
            </div>
          </div>

          {/* Open Icon */}
          <div className="mt-1 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink
              className="w-4 h-4 text-muted-foreground"
              onClick={onClickExternalLink}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
