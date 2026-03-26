"use client"

import { Globe, Search, Loader2 } from "lucide-react"

interface WebSearchOutput {
  text: string
  citations: Array<{
    url: string
    title: string
    snippet?: string
  }>
}

interface WebSearchViewProps {
  input: { query: string }
  output?: WebSearchOutput
  state: string
}

export function WebSearchView({ input, output, state }: WebSearchViewProps) {
  if (state === "partial-call" || !output) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Search className="h-4 w-4" />
        <span>Searching: {input.query}</span>
      </div>
    )
  }

  if (!output.citations || output.citations.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
        <Search className="h-4 w-4" />
        <span>Search completed for: {input.query}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" />
        <span>Search results for &ldquo;{input.query}&rdquo;</span>
      </div>
      <div className="space-y-2">
        {output.citations.slice(0, 5).map((citation, idx) => (
          <a
            key={idx}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border p-2.5 hover:bg-accent/50 transition-colors"
          >
            <div className="text-sm font-medium truncate">{citation.title}</div>
            {citation.snippet && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {citation.snippet}
              </div>
            )}
            <div className="text-xs text-blue-500 mt-1 truncate">{citation.url}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
