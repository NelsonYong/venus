import { z } from 'zod'
import { tool } from 'ai'
import { performWebSearch, formatSearchResultsWithCitations } from '@/lib/search-tool'

/**
 * Weather tool - simulates weather data
 */
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

/**
 * Web search tool - returns structured results with citations
 */
export const webSearchTool = tool({
  description: 'Search the web for current information. Use when: 1) User asks about recent events, 2) Need to verify facts, 3) Question requires up-to-date knowledge.',
  inputSchema: z.object({
    query: z.string().describe('Search query. Use the SAME LANGUAGE as the user\'s question.'),
  }),
  execute: async ({ query }) => {
    try {
      const searchResults = await performWebSearch(query, 5)
      const { text, citations } = formatSearchResultsWithCitations(searchResults)
      return { text, citations }
    } catch (error) {
      return {
        text: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        citations: [],
      }
    }
  },
})

/**
 * Build tools object based on configuration.
 * thinkingStepTool removed - use sendReasoning: true in toUIMessageStreamResponse instead.
 */
export function buildTools(options: { webSearch?: boolean }) {
  const tools: Record<string, any> = {
    weather: weatherTool,
  }

  if (options.webSearch) {
    tools.webSearch = webSearchTool
  }

  return tools
}
