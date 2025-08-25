import { createDeepSeek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const deepSeek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});
const languageModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: deepSeek(languageModel),
    system: 'You are a helpful assistant. output in markdown format.',
    messages: convertToModelMessages(messages),
    abortSignal: AbortSignal.timeout(30000),
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
    },
    stopWhen: stepCountIs(5),
  });
  return result.toUIMessageStreamResponse();
}