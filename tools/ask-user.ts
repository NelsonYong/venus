import { z } from 'zod'
import { tool } from 'ai'

/**
 * Ask User tool - lets the model proactively ask the user for clarification,
 * choices, or additional information. Uses the needsApproval protocol to
 * pause execution and wait for user input.
 */
export const askUserTool = tool({
  description: 'Ask the user a clarifying question. ONLY use when you genuinely cannot proceed without their input — e.g., the request has 2+ equally valid interpretations, or a critical detail is missing. Do NOT use for yes/no questions, minor ambiguity, or when a reasonable default exists. Keep questions focused: one question at a time, with clear concise options.',
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
