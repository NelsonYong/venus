import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';

export interface ModelConfig {
  provider: string;
  name: string;
  apiKey: string;
  apiEndpoint: string;
  isPreset: boolean;
}

/**
 * Create a model adapter based on the provider
 */
export function createModelAdapter(config: ModelConfig) {
  const provider = config.provider.toLowerCase();

  switch (provider) {
    case 'deepseek':
      return createDeepSeek({
        apiKey: config.isPreset ? process.env.DEEPSEEK_API_KEY : config.apiKey,
        baseURL: config.isPreset ? process.env.DEEPSEEK_BASE_URL : config.apiEndpoint,
      })(config.name);

    case 'openai':
      return createOpenAI({
        apiKey: config.isPreset ? process.env.OPENAI_API_KEY : config.apiKey,
        baseURL: config.isPreset ? undefined : config.apiEndpoint,
      })(config.name);

    // For other providers using OpenAI-compatible API
    // Examples: Groq, Together AI, Perplexity, etc.
    default:
      // Use OpenAI adapter for OpenAI-compatible APIs
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiEndpoint,
      })(config.name);
  }
}

/**
 * Get default model configuration from environment
 */
export function getDefaultModelConfig(): ModelConfig {
  return {
    provider: 'deepseek',
    name: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    apiEndpoint: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    isPreset: true,
  };
}
