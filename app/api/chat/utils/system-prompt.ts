import { getCompressedContext } from '@/lib/redis';

const BASE_SYSTEM_PROMPT = `you are a helpful assistant that uses ReAct (Reasoning and Acting) decision-making pattern to solve problems systematically.

When using web search results, you MUST cite your sources using [citation:number] format in your response. For example:
- "According to recent reports[citation:1], ..."
- "Research shows[citation:2][citation:3] that..."
- "The latest information indicates[citation:1] ..."

Always include citation numbers in your answer to show which sources you're referencing.`;

const WEB_SEARCH_CITATION_REMINDER = `

IMPORTANT: When you receive search results, they will be numbered [1], [2], etc. You must use the format [citation:1], [citation:2] in your response to cite the sources.`;

/**
 * Build system prompt with optional web search and context compression
 */
export async function buildSystemPrompt(
  webSearch: boolean,
  conversationId?: string
): Promise<string> {
  let systemPrompt = BASE_SYSTEM_PROMPT;

  // Add web search citation reminder if enabled
  if (webSearch) {
    systemPrompt += WEB_SEARCH_CITATION_REMINDER;
  }

  // Add compressed context if available
  if (conversationId) {
    try {
      const compressedContext = await getCompressedContext(conversationId);

      if (compressedContext) {
        systemPrompt = `${systemPrompt}

Previous conversation summary:
${compressedContext}

Use this summary as context for the current conversation.`;
      }
    } catch (error) {
      console.error('Error loading compressed context:', error);
      // Fall back to base prompt if loading fails
    }
  }

  return systemPrompt;
}
