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
    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <BookOpen className="w-4 h-4" />
          <span>{citations.length} 个引用来源</span>
        </div>
        <button
          onClick={onOpenSidebar}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
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
              className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all"
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
              <div className="absolute top-1 left-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-full shadow">
                  {citation.id}
              </div>
            </button>
        ))}
          {/* 如果还有更多缩略图，显示 +N */}
          {citationsWithThumbnails.length > 4 && (
            <button
              onClick={onOpenSidebar}
              className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-sm transition-colors"
            >
              +{citationsWithThumbnails.length - 4}
            </button>
          )}
      </div>
      )}
    </div>
  );
}
