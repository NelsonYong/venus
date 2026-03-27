"use client"

import { useState } from "react"
import { HelpCircle, Check, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AskUserOption {
  id: string
  label: string
  description?: string
}

interface AskUserInput {
  question: string
  options?: AskUserOption[]
  allowMultiple?: boolean
  allowFreeText?: boolean
}

interface AskUserViewProps {
  input: AskUserInput
  output?: AskUserInput
  state: string
  onApprove?: (response: { approved: boolean; data?: string }) => void
}

export function AskUserView({ input, output, state, onApprove }: AskUserViewProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [freeText, setFreeText] = useState("")

  const data = output ?? input
  if (!data) return null

  if (state === "partial-call" || state === "input-streaming") {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground animate-pulse">
        <HelpCircle className="h-4 w-4" />
        <span>Preparing question...</span>
      </div>
    )
  }

  const isWaitingForResponse = state === "approval-requested" || state === "input-available"
  const isResolved = state === "output-available" || state === "approval-responded"

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev)
      if (data.allowMultiple) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      } else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = () => {
    if (!onApprove) return

    let responseData: string
    if (selectedOptions.size > 0) {
      const selected = Array.from(selectedOptions)
      const labels = selected.map(
        (id) => data.options?.find((o) => o.id === id)?.label ?? id
      )
      responseData = labels.join(", ")
    } else {
      responseData = freeText
    }

    onApprove({ approved: true, data: responseData })
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm max-w-md">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm font-medium leading-relaxed">{data.question}</p>
      </div>

      {data.options && data.options.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.options.map((option, idx) => (
            <button
              key={option.id || `option-${idx}`}
              onClick={() => isWaitingForResponse && toggleOption(option.id)}
              disabled={!isWaitingForResponse}
              className={cn(
                "w-full text-left rounded-lg border p-3 transition-all",
                selectedOptions.has(option.id)
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-accent/50",
                !isWaitingForResponse && "opacity-70 cursor-default"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    selectedOptions.has(option.id)
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  )}
                >
                  {selectedOptions.has(option.id) && (
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {data.allowFreeText !== false && isWaitingForResponse && (
        <div className="mb-4">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Or type your answer here..."
            className="w-full rounded-lg border bg-background p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
          />
        </div>
      )}

      {isWaitingForResponse && (
        <Button
          onClick={handleSubmit}
          disabled={selectedOptions.size === 0 && !freeText.trim()}
          className="w-full"
          size="sm"
        >
          Submit Answer
        </Button>
      )}

      {isResolved && (
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Check className="h-3 w-3" />
          <span>Response submitted</span>
        </div>
      )}
    </div>
  )
}
