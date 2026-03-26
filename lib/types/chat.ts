/**
 * Chat message and part type definitions.
 * Strongly typed replacements for `any` used across the chat UI.
 */

import type { UIMessage } from 'ai'
import type { Artifact } from './artifact'

// ---------------------------------------------------------------------------
// Tool call states (mirrors AI SDK 6 states)
// ---------------------------------------------------------------------------

export type ToolCallState =
  | 'partial-call'
  | 'call'
  | 'input-available'
  | 'output-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'error'

// ---------------------------------------------------------------------------
// Message part types
// ---------------------------------------------------------------------------

export interface TextPart {
  type: 'text'
  text: string
}

export interface ReasoningPart {
  type: 'reasoning'
  text: string
  /** Provider-specific reasoning token usage, if available */
  usage?: { reasoningTokens?: number }
}

export interface SourceUrlPart {
  type: 'source-url'
  url: string
  title?: string
}

export interface StepStartPart {
  type: 'step-start'
}

export interface ToolCallPartBase {
  toolCallId: string
  toolName: string
  state: ToolCallState
  input: Record<string, unknown>
  output?: unknown
  errorText?: string
  approval?: { id: string }
}

/**
 * AI SDK 6 static tool part: type = "tool-{toolName}"
 */
export interface StaticToolPart extends ToolCallPartBase {
  type: `tool-${string}`
}

/**
 * AI SDK 6 dynamic tool part
 */
export interface DynamicToolPart extends ToolCallPartBase {
  type: 'dynamic-tool'
}

/**
 * Legacy AI SDK tool invocation part
 */
export interface LegacyToolInvocationPart {
  type: 'tool-invocation'
  toolInvocation: ToolCallPartBase & { args?: Record<string, unknown>; result?: unknown }
}

export type ToolPart = StaticToolPart | DynamicToolPart | LegacyToolInvocationPart

export type MessagePart =
  | TextPart
  | ReasoningPart
  | SourceUrlPart
  | StepStartPart
  | ToolPart

// ---------------------------------------------------------------------------
// Citation
// ---------------------------------------------------------------------------

export interface Citation {
  id: number
  url: string
  title: string
  snippet?: string
  thumbnail?: string
  content?: string
}

// ---------------------------------------------------------------------------
// Uploaded attachment (from user messages)
// ---------------------------------------------------------------------------

export interface UploadedAttachment {
  url: string
  filename: string
  size: number
  type: string
  contentType: string
}

// ---------------------------------------------------------------------------
// Message metadata
// ---------------------------------------------------------------------------

export interface MessageMetadata {
  citations?: Citation[]
  uploadedAttachments?: UploadedAttachment[]
  /** Token usage forwarded from the stream */
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
  maxTokens?: number
}

// ---------------------------------------------------------------------------
// Chat message (extends UIMessage with typed parts + metadata)
// ---------------------------------------------------------------------------

export interface ChatMessage extends Omit<UIMessage, 'parts'> {
  parts: MessagePart[]
  metadata?: MessageMetadata
  data?: {
    uploadedAttachments?: UploadedAttachment[]
  }
}

// ---------------------------------------------------------------------------
// Chat status
// ---------------------------------------------------------------------------

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

// ---------------------------------------------------------------------------
// Tool info extraction helper
// ---------------------------------------------------------------------------

export interface NormalizedToolInfo {
  toolName: string
  toolCallId: string
  approvalId: string
  input: Record<string, unknown>
  output: unknown | undefined
  state: ToolCallState
  errorText?: string
}

/**
 * Extract normalized tool info from any tool part format.
 * Handles AI SDK 6 `tool-{name}`, `dynamic-tool`, and legacy `tool-invocation`.
 */
export function extractToolInfo(part: MessagePart): NormalizedToolInfo | null {
  const type = part.type as string

  if (type.startsWith('tool-') && type !== 'tool-invocation') {
    const p = part as StaticToolPart
    return {
      toolName: type.slice(5),
      toolCallId: p.toolCallId ?? '',
      approvalId: p.approval?.id ?? '',
      input: p.input ?? {},
      output: p.output,
      state: p.state ?? 'input-available',
      errorText: p.errorText,
    }
  }

  if (type === 'dynamic-tool') {
    const p = part as DynamicToolPart
    return {
      toolName: p.toolName ?? 'unknown',
      toolCallId: p.toolCallId ?? '',
      approvalId: p.approval?.id ?? '',
      input: p.input ?? {},
      output: p.output,
      state: p.state ?? 'input-available',
      errorText: p.errorText,
    }
  }

  if (type === 'tool-invocation') {
    const p = part as LegacyToolInvocationPart
    const inv = p.toolInvocation ?? (p as any)
    return {
      toolName: inv.toolName ?? 'tool',
      toolCallId: inv.toolCallId ?? '',
      approvalId: inv.approval?.id ?? '',
      input: inv.input ?? inv.args ?? {},
      output: inv.output ?? inv.result,
      state: inv.state ?? 'input-available',
      errorText: inv.errorText,
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Artifact panel state (shared between layout & message renderer)
// ---------------------------------------------------------------------------

export interface ArtifactPanelState {
  artifact: Artifact
  previewUrl: string
  isOpen: boolean
}
