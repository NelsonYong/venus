import { ToolLoopAgent, InferAgentUIMessage, type LanguageModel } from 'ai'
import { z } from 'zod'
import { buildTools } from '@/tools'

export const chatAgentCallOptionsSchema = z.object({
  userId: z.string(),
  conversationId: z.string().optional(),
  webSearch: z.boolean().default(false),
  systemPrompt: z.string(),
  model: z.custom<LanguageModel>(),
})

/**
 * Create a chat agent for a specific model.
 *
 * The model is provided at call time because it depends on the user's
 * selected provider / model configuration. The agent handles the full
 * tool-loop automatically: calling tools, collecting results, and
 * continuing until the model is done or 20 steps are reached.
 */
export function createChatAgent(model: LanguageModel) {
  return new ToolLoopAgent({
    model,
    callOptionsSchema: chatAgentCallOptionsSchema,

    prepareCall: ({ options, ...settings }) => ({
      ...settings,
      instructions: options.systemPrompt,
      tools: buildTools({ webSearch: options.webSearch, generateUI: true }),
    }),

    tools: buildTools({ webSearch: false, generateUI: true }),
  })
}

export type ChatAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createChatAgent>>
