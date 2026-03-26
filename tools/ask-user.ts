import { z } from 'zod'
import { tool } from 'ai'

/**
 * Ask User tool - lets the model proactively ask the user for clarification,
 * choices, or additional information. Uses the needsApproval protocol to
 * pause execution and wait for user input.
 */
export const askUserTool = tool({
  description: 'When you need user clarification, a choice between options, or additional information to proceed, call this tool. Present clear options when possible. Use this instead of guessing the user\'s intent.',
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
    options: z.array(z.object({
      id: z.string().describe('Unique option identifier'),
      label: z.string().describe('Display label for the option'),
      description: z.string().optional().describe('Optional description for more context'),
    })).optional().describe('Structured options for the user to choose from'),
    allowMultiple: z.boolean().optional().default(false).describe('Whether the user can select multiple options'),
    allowFreeText: z.boolean().optional().default(true).describe('Whether the user can type a free-form answer'),
  }),
  needsApproval: true,
  execute: async (input) => input,
})
