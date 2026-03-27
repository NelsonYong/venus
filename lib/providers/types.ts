import { LanguageModel } from 'ai'

export type ProviderName = 'deepseek' | 'openai' | 'google' | 'anthropic'

export interface ProviderConfig {
  apiKey: string
  baseURL?: string
}

export interface ResolvedModel {
  model: LanguageModel
  provider: string
  modelName: string
  isPreset: boolean
  isImageModel: boolean
}

export interface PresetConfig {
  provider: ProviderName
  modelName: string
  apiKey: string
  baseURL?: string
}

export type ProviderFactory = (config: ProviderConfig) => {
  (modelId: string): LanguageModel
}

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
]

export function isImageModel(modelName: string): boolean {
  const lowerName = modelName.toLowerCase()
  return IMAGE_MODEL_PATTERNS.some(pattern => lowerName.includes(pattern))
}
