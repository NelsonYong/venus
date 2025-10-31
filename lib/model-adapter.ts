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
  switch (config.provider.toLowerCase()) {
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

    // Add more providers as needed
    // case 'anthropic':
    //   return createAnthropic({...})(config.name);

    default:
      throw new Error(`Unsupported model provider: ${config.provider}`);
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
