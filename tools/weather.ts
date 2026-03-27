import { z } from 'zod'
import { tool } from 'ai'

export const weatherTool = tool({
  description: 'Get the current weather information for a specific location.',
  inputSchema: z.object({
    location: z.string().describe('The city or location name. Use the SAME LANGUAGE as the user\'s question.'),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
    condition: 'sunny',
    humidity: 60 + Math.floor(Math.random() * 20),
  }),
})
