"use client"

import { ShieldAlert, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ToolApprovalViewProps {
  toolName: string
  input: Record<string, unknown>
  state: string
  onApprove?: () => void
  onDeny?: () => void
}

export function ToolApprovalView({
  toolName,
  input,
  state,
  onApprove,
  onDeny,
}: ToolApprovalViewProps) {
  const isWaiting = state === "approval-requested"
  const isApproved = state === "output-available"

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium">Tool Approval Required</span>
      </div>

      <div className="mb-3">
        <div className="text-xs text-muted-foreground mb-1">Tool</div>
        <div className="text-sm font-mono bg-muted/50 rounded px-2 py-1">
          {toolName}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-muted-foreground mb-1">Parameters</div>
        <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-40">
          {JSON.stringify(input, null, 2)}
        </pre>
      </div>

      {isWaiting && (
        <div className="flex gap-2">
          <Button onClick={onApprove} size="sm" className="flex-1 gap-1">
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            onClick={onDeny}
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Deny
          </Button>
        </div>
      )}

      {isApproved && (
        <div className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          <span>Approved and executed</span>
        </div>
      )}
    </div>
  )
}
