import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';


export interface ModelConfig {
  provider: string;
  name: string;
  apiKey: string;
  apiEndpoint: string;
  isPreset: boolean;
}

export type ModelType = 'text' | 'image';

/**
 * Image model patterns to detect image generation models
 */
const IMAGE_MODEL_PATTERNS = [
  'dall-e',
  'dalle',
  'gpt-image',
  'imagen',
  'stable-diffusion',
  'midjourney',
  'flux',
  '/image',
  '-image-',
];

/**
 * Check if a model is an image generation model
 */
export function isImageModel(modelName: string): boolean {
  const lowerName = modelName.toLowerCase();
  return IMAGE_MODEL_PATTERNS.some(pattern => lowerName.includes(pattern));
}

/**
 * Get the model type (text or image)
 */
export function getModelType(modelName: string): ModelType {
  return isImageModel(modelName) ? 'image' : 'text';
}

/**
 * Create a model adapter based on the provider (for text/chat models)
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

    case 'google':
      return createGoogleGenerativeAI({
        apiKey: config.isPreset ? process.env.GOOGLE_API_KEY : config.apiKey,
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
 * Create an image model adapter based on the provider
 */
export function createImageModelAdapter(config: ModelConfig) {
  const provider = config.provider.toLowerCase();

  switch (provider) {
    case 'openai':
      const openaiClient = createOpenAI({
        apiKey: config.isPreset ? process.env.OPENAI_API_KEY : config.apiKey,
        baseURL: config.isPreset ? undefined : config.apiEndpoint,
      });
      return openaiClient.image(config.name);

    // For other providers using OpenAI-compatible image API
    default:
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiEndpoint,
      });
      return client.image(config.name);
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
