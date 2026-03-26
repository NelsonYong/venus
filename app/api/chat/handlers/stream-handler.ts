import { UIMessage, streamText, stepCountIs, convertToModelMessages } from 'ai'
import { buildTools } from '@/tools'
import { type ResolvedModel } from '@/lib/providers'
import { type UploadedAttachment } from '../utils/message-processor'
import { createStreamLifecycleHandlers } from '@/lib/middleware/billing'
import { getMCPTools } from '@/lib/mcp/bridge'
import { withDevTools } from '@/lib/middleware/devtools'

interface StreamHandlerParams {
  messages: UIMessage[]
  userId: string
  conversationId?: string
  resolved: ResolvedModel
  systemPrompt: string
  webSearch: boolean
  startTime: number
  uploadedAttachments?: UploadedAttachment[]
}

export async function handleStreamText({
  messages,
  userId,
  conversationId,
  resolved,
  systemPrompt,
  webSearch,
  startTime,
  uploadedAttachments,
}: StreamHandlerParams) {
  const { model: baseModel, provider, modelName, isPreset } = resolved
  const model = await withDevTools(baseModel)

  const builtinTools = buildTools({ webSearch, generateUI: true })
  const mcpTools = await getMCPTools(userId)
  const tools = { ...builtinTools, ...mcpTools }
  const { onStepFinish, onFinish, getMetadata } = createStreamLifecycleHandlers({
    userId,
    conversationId,
    provider,
    modelName,
    isPreset,
    startTime,
    messages,
    uploadedAttachments,
  })

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    abortSignal: AbortSignal.timeout(600000),
    tools,
    toolChoice: 'auto',
    stopWhen: stepCountIs(20),
    onStepFinish,
    onFinish,
  })

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    messageMetadata: getMetadata,
  })
}
