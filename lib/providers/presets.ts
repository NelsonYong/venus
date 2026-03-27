import { type PresetConfig, type ProviderName } from './types'

interface PresetEnvMapping {
  provider: ProviderName
  apiKeyEnv: string
  baseURLEnv?: string
  modelEnv?: string
  defaultModel: string
  defaultBaseURL?: string
}

/**
 * Declarative mapping from provider names to environment variables.
 * To add a new preset provider: add one entry here + PROVIDER_FACTORIES in registry.ts
 */
const PRESET_ENV_MAPPINGS: PresetEnvMapping[] = [
  {
    provider: 'deepseek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseURLEnv: 'DEEPSEEK_BASE_URL',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
    defaultBaseURL: 'https://api.deepseek.com',
  },
  {
    provider: 'openai',
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
  },
  {
    provider: 'google',
    apiKeyEnv: 'GOOGLE_API_KEY',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    provider: 'anthropic',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
  },
]

/**
 * Get the default preset configuration (first provider with a configured API key).
 */
export function getDefaultPreset(): PresetConfig {
  for (const mapping of PRESET_ENV_MAPPINGS) {
    const apiKey = process.env[mapping.apiKeyEnv]
    if (apiKey) {
      return {
        provider: mapping.provider,
        modelName: mapping.modelEnv ? (process.env[mapping.modelEnv] || mapping.defaultModel) : mapping.defaultModel,
        apiKey,
        baseURL: mapping.baseURLEnv ? (process.env[mapping.baseURLEnv] || mapping.defaultBaseURL) : mapping.defaultBaseURL,
      }
    }
  }

  // Fallback to deepseek with empty key (will error at runtime)
  return {
    provider: 'deepseek',
    modelName: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  }
}

/**
 * Get preset config for a specific provider (if env vars are configured).
 */
export function getPresetForProvider(provider: ProviderName): PresetConfig | null {
  const mapping = PRESET_ENV_MAPPINGS.find(m => m.provider === provider)
  if (!mapping) return null

  const apiKey = process.env[mapping.apiKeyEnv]
  if (!apiKey) return null

  return {
    provider: mapping.provider,
    modelName: mapping.modelEnv ? (process.env[mapping.modelEnv] || mapping.defaultModel) : mapping.defaultModel,
    apiKey,
    baseURL: mapping.baseURLEnv ? (process.env[mapping.baseURLEnv] || mapping.defaultBaseURL) : mapping.defaultBaseURL,
  }
}

/**
 * Get all available preset providers (those with configured API keys).
 */
export function getAvailablePresets(): PresetConfig[] {
  return PRESET_ENV_MAPPINGS
    .filter(mapping => process.env[mapping.apiKeyEnv])
    .map(mapping => ({
      provider: mapping.provider,
      modelName: mapping.modelEnv ? (process.env[mapping.modelEnv] || mapping.defaultModel) : mapping.defaultModel,
      apiKey: process.env[mapping.apiKeyEnv]!,
      baseURL: mapping.baseURLEnv ? (process.env[mapping.baseURLEnv] || mapping.defaultBaseURL) : mapping.defaultBaseURL,
    }))
}
