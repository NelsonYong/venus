"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Citation } from "./citations";

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
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 侧边栏 */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              引用来源
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {citations.length} 个来源
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
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
                        ? "border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/50"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }
                  `}
                >
                  {/* 缩略图 */}
                  {citation.thumbnail && (
                    <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
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
                          flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full transition-colors
                          ${
                            isHighlighted
                              ? "text-blue-700 dark:text-blue-300 bg-blue-200 dark:bg-blue-800"
                              : "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"
                          }
                        `}
                      >
                        {citation.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {citation.title}
                        </h3>
                        {citation.snippet && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
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
                      className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate">{new URL(citation.url).hostname}</span>
                      <ExternalLink className="flex-shrink-0 w-3.5 h-3.5" />
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

