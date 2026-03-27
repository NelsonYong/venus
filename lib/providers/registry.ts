import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { type ProviderConfig, type ProviderFactory, type ProviderName } from './types'

/**
 * Declarative provider factory map.
 * To add a new provider: add one entry here + env vars in presets.ts
 */
const PROVIDER_FACTORIES: Record<ProviderName, ProviderFactory> = {
  deepseek: (config) => createDeepSeek({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  }),
  openai: (config) => createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  }),
  google: (config) => createGoogleGenerativeAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  }),
  anthropic: (config) => createAnthropic({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  }),
}

/**
 * Create a language model instance from provider name, model ID, and config.
 * Falls back to OpenAI-compatible adapter for unknown providers.
 */
export function createModel(provider: string, modelId: string, config: ProviderConfig) {
  const factory = PROVIDER_FACTORIES[provider as ProviderName]

  if (factory) {
    return factory(config)(modelId)
  }

  // Fallback: OpenAI-compatible API (Groq, Together AI, Perplexity, etc.)
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })(modelId)
}

/**
 * Create an image model instance from provider name and config.
 */
export function createImageModel(provider: string, modelId: string, config: ProviderConfig) {
  const openaiProvider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })
  return openaiProvider.image(modelId)
}

/**
 * Check if a provider is a known (built-in) provider.
 */
export function isKnownProvider(provider: string): provider is ProviderName {
  return provider in PROVIDER_FACTORIES
}
