"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Citation } from "./citations";
import { useTranslation } from "@/app/contexts/i18n-context";

interface CitationsSidebarProps {
  citations: Citation[];
  isOpen: boolean;
  onClose: () => void;
  highlightedId?: number;
}

export function CitationsSidebar({
  citations,
  isOpen,
  onClose,
  highlightedId,
}: CitationsSidebarProps) {
  const { t } = useTranslation();
  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 侧边栏 */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {t("chat.citations.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {citations.length} {t("chat.citations.sources")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label={t("chat.citations.close")}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 引用列表 */}
        <div className="overflow-y-auto h-[calc(100%-73px)] p-4">
          <div className="space-y-4">
            {citations.map((citation) => {
              const isHighlighted = highlightedId === citation.id;

              return (
                <div
                  key={citation.id}
                  id={`citation-${citation.id}`}
                  className={`
                    group p-4 rounded-lg border transition-all duration-300
                    ${
                      isHighlighted
                        ? "border-primary bg-accent ring-2 ring-ring/50"
                        : "border-border hover:border-muted-foreground/30"
                    }
                  `}
                >
                  {/* 缩略图 */}
                  {citation.thumbnail && (
                    <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={citation.thumbnail}
                        alt={citation.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.parentElement!.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* 内容 */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span
                        className={`
                          shrink-0 inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full transition-colors
                          ${
                            isHighlighted
                              ? "text-primary-foreground bg-primary"
                              : "text-secondary-foreground bg-secondary"
                          }
                        `}
                      >
                        {citation.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-card-foreground mb-1">
                          {citation.title}
                        </h3>
                        {citation.snippet && (
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {citation.snippet}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 链接 */}
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 underline underline-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate">
                        {new URL(citation.url).hostname}
                      </span>
                      <ExternalLink className="shrink-0 w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
