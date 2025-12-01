"use client";

import { useState } from "react";
import type { Citation } from "./citations";

interface InlineCitationProps {
  citationNumber: number;
  citation: Citation;
  onCitationClick: (id: number) => void;
}

export function InlineCitation({
  citationNumber,
  citation,
  onCitationClick,
}: InlineCitationProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCitationClick(citation.id);
  };

  return (
    <span className="relative inline-block group">
      <sup
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mx-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded cursor-pointer transition-all duration-200 hover:scale-110 select-none"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {citationNumber}
      </sup>

      {/* 简单的 Tooltip */}
      {showTooltip && citation && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap max-w-xs pointer-events-none"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="font-medium truncate">{citation.title}</div>
          <div className="text-gray-300 dark:text-gray-400 text-[10px] mt-0.5 truncate">
            {new URL(citation.url).hostname}
          </div>
          {/* 箭头 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </div>
        </div>
      )}
    </span>
  );
}

