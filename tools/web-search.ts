import { z } from 'zod'
import { tool } from 'ai'
import { performWebSearch, formatSearchResultsWithCitations } from '@/lib/search-tool'

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
