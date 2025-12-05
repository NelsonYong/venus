import { z } from 'zod';
import { tool } from 'ai';
import { performWebSearch, formatSearchResultsWithCitations } from '@/lib/search-tool';

/**
 * 思维链步骤工具 - 用于展示 AI 的思考过程
 */
export const thinkingStepTool = tool({
  description: 'Use this tool to show your thinking process step by step. Call this tool when you need to break down a complex problem or show your reasoning. Each call represents one step in your thought process.',
  inputSchema: z.object({
    stepType: z.enum(['chain-of-thought', 'task']).describe('Type of thinking: "chain-of-thought" for complex reasoning, "task" for specific operations'),
    title: z.string().describe('Title of the thinking process or task'),
    stepId: z.string().describe('Unique ID for this step (e.g., "step1", "step2")'),
    label: z.string().describe('Label or name of this step'),
    description: z.string().optional().describe('Optional detailed description of this step'),
    status: z.enum(['pending', 'active', 'complete']).describe('Status of this step'),
    searchResults: z.array(z.object({
      title: z.string(),
      url: z.string().optional(),
    })).optional().describe('Optional search results for this step'),
    files: z.array(z.string()).optional().describe('Optional file names for task steps'),
  }),
  execute: async (params) => {
    // 这个工具只是用于传递思维过程，不需要实际执行
    return {
      success: true,
      step: params,
    };
  },
});

/**
 * Weather tool - simulates weather data
 */
export const weatherTool = tool({
  description: 'Get the current weather information for a specific location. Use this tool when the user asks about weather conditions, temperature, or weather forecasts. Think about what location information you have or need before calling this tool.',
  inputSchema: z.object({
    location: z.string().describe('The city or location name to get weather for. IMPORTANT: Use the SAME LANGUAGE as the user\'s question (e.g., if user asks in Chinese "北京天气", use "北京", NOT "Beijing")'),
  }),
  execute: async ({ location }) => {
    return {
      location,
      temperature: 72 + Math.floor(Math.random() * 21) - 10,
      condition: 'sunny',
      humidity: 60 + Math.floor(Math.random() * 20),
    };
  },
});

/**
 * Web search tool - 返回结构化的搜索结果和引用信息
 */
export const webSearchTool = tool({
  description: 'Search the web for current information, news, facts, or any information that requires up-to-date knowledge. Use this tool when: 1) The user asks about recent events or current information, 2) You need to verify facts or get the latest data, 3) The question requires information beyond your training data. Think carefully about what search query would best help answer the user\'s question.',
  inputSchema: z.object({
    query: z.string().describe('A clear and specific search query. IMPORTANT: Use the SAME LANGUAGE as the user\'s question (e.g., if user asks in Chinese "React 19的优势", use "React 19的优势" or "React 19 优势", NOT "React 19 advantages")'),
  }),
  execute: async ({ query }) => {
    try {
      const searchResults = await performWebSearch(query, 5);
      const { text, citations } = formatSearchResultsWithCitations(searchResults);

      // 返回结构化数据，包含文本和引用信息
      return {
        text,
        citations,
      };
    } catch (error) {
      return {
        text: `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`,
        citations: [],
      };
    }
  },
});

/**
 * Build tools object based on configuration
 */
export function buildTools(options: { webSearch?: boolean; enableThinking?: boolean }) {
  const tools: any = {
    weather: weatherTool,
  };

  if (options.webSearch) {
    tools.webSearch = webSearchTool;
  }

  // 默认启用思维链功能
  if (options.enableThinking !== false) {
    tools.thinkingStep = thinkingStepTool;
  }

  return tools;
}
