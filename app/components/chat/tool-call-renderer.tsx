"use client"

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { useChatContext } from "@/app/contexts/chat-context"
import { extractToolInfo } from "@/lib/types/chat"
import { WeatherView } from "./tool-views/weather-view"
import { WebSearchView } from "./tool-views/web-search-view"
import { AskUserView } from "./tool-views/ask-user-view"
import { GenerateUIView } from "./tool-views/generate-ui-view"
import { ToolApprovalView } from "./tool-views/tool-approval-view"
import type { MessagePart } from "@/lib/types/chat"

interface ToolCallRendererProps {
  part: MessagePart
  messageId: string
  partIndex: number
}

export function ToolCallRenderer({ part, messageId, partIndex }: ToolCallRendererProps) {
  const { status, actions } = useChatContext()
  const toolInfo = extractToolInfo(part)

  if (!toolInfo) return null

  const { toolName, approvalId, input, output, state, errorText } = toolInfo
  const key = `${messageId}-${partIndex}`

  const handleToolApproval = approvalId
    ? (approved: boolean, reason?: string) =>
        actions.addToolApprovalResponse({ id: approvalId, approved, reason })
    : undefined

  // Specialized tool views — cast input/output to the shapes each view expects
  switch (toolName) {
    case "weather":
      return (
        <WeatherView
          key={key}
          input={input as any}
          output={output as any}
          state={state}
        />
      )

    case "webSearch":
      return (
        <WebSearchView
          key={key}
          input={input as any}
          output={output as any}
          state={state}
        />
      )

    case "askUser":
      return (
        <AskUserView
          key={key}
          input={input as any}
          output={output as any}
          state={state}
          onApprove={
            handleToolApproval
              ? (response) => handleToolApproval(response.approved, response.data)
              : undefined
          }
        />
      )

    case "generateUI":
      return (
        <GenerateUIView
          key={key}
          input={input as any}
          output={output as any}
          state={state}
        />
      )
  }

  // Generic approval view for any tool in approval-requested state
  if (state === "approval-requested") {
    return (
      <ToolApprovalView
        key={key}
        toolName={toolName}
        input={input}
        state={state}
        onApprove={handleToolApproval ? () => handleToolApproval(true) : undefined}
        onDeny={handleToolApproval ? () => handleToolApproval(false) : undefined}
      />
    )
  }

  // Generic tool display fallback
  return (
    <Tool key={key} defaultOpen={status === "streaming"}>
      <ToolHeader type={toolName as any} state={state as any} />
      <ToolContent>
        {input && Object.keys(input).length > 0 && <ToolInput input={input} />}
        {output != null && (
          <ToolOutput
            output={typeof output === "string" ? output : JSON.stringify(output, null, 2)}
            errorText={errorText}
          />
        )}
      </ToolContent>
    </Tool>
  )
}
