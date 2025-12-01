"use client";

import { BookOpen } from "lucide-react";

export interface Citation {
  id: number;
  url: string;
  title: string;
  snippet?: string;
  thumbnail?: string;
}

interface CitationsProps {
  citations: Citation[];
  onOpenSidebar: () => void;
}

export function Citations({ citations, onOpenSidebar }: CitationsProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  // 过滤出有缩略图的引用
  const citationsWithThumbnails = citations.filter((c) => c.thumbnail);

  return (
    <div className="mt-4 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>{citations.length} 个引用来源</span>
        </div>
        <button
          onClick={onOpenSidebar}
          className="text-xs text-foreground hover:text-primary font-medium transition-colors underline underline-offset-2"
        >
          查看全部
        </button>
      </div>

      {/* 缩略图网格 */}
      {citationsWithThumbnails.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {citationsWithThumbnails.slice(0, 4).map((citation) => (
            <button
            key={citation.id}
              onClick={onOpenSidebar}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-ring transition-all"
            >
                <img
                  src={citation.thumbnail}
                  alt={citation.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                  e.currentTarget.style.display = "none";
                  }}
                />
              {/* 引用编号角标 */}
              <div className="absolute top-1 left-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium text-primary-foreground bg-primary rounded-full shadow">
                  {citation.id}
              </div>
            </button>
        ))}
          {/* 如果还有更多缩略图，显示 +N */}
          {citationsWithThumbnails.length > 4 && (
            <button
              onClick={onOpenSidebar}
              className="aspect-square rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground font-medium text-sm transition-colors"
            >
              +{citationsWithThumbnails.length - 4}
            </button>
          )}
      </div>
      )}
    </div>
  );
}
