"use client"

import { useState } from "react"
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatContext } from "@/app/contexts/chat-context"

interface ErrorBannerProps {
  error: Error | undefined
  mobile?: boolean
}

export function ErrorBanner({ error, mobile = false }: ErrorBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const { actions } = useChatContext()

  if (!error) return null

  return (
    <div
      className={cn(
        "shrink-0 border rounded-lg mx-auto mt-3 overflow-hidden",
        "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        "text-red-800 dark:text-red-200",
        mobile ? "mx-2 mobile-error-banner" : "max-w-4xl px-4"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">
          {error.message || "An unexpected error occurred"}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => actions.regenerate()}
            className="p-1 rounded hover:bg-red-200/50 dark:hover:bg-red-800/50 transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-red-200/50 dark:hover:bg-red-800/50 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      {expanded && error.stack && (
        <div className="px-3 pb-2.5 border-t border-red-200/50 dark:border-red-700/50">
          <pre className="text-xs mt-2 whitespace-pre-wrap break-all opacity-70 max-h-32 overflow-y-auto">
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  )
}
