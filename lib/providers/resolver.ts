import { prisma } from '@/lib/prisma'
import { createModel, createImageModel, isKnownProvider } from './registry'
import { getDefaultPreset, getPresetForProvider } from './presets'
import { isImageModel, type ResolvedModel, type ProviderName } from './types'

/**
 * Resolve a model ID to a ready-to-use language model instance.
 *
 * Resolution order:
 * 1. If modelId provided → look up user's discovered model in DB
 * 2. If DB lookup fails → try parsing "provider/model" and use env-var API key
 * 3. Otherwise → use default preset from env vars
 */
export async function resolveModel(
  modelId: string | undefined,
  userId: string
): Promise<ResolvedModel> {
  if (modelId) {
    return resolveUserModel(modelId, userId)
  }
  return resolveDefaultModel()
}

async function resolveUserModel(modelId: string, userId: string): Promise<ResolvedModel> {
  // Step 1: try DB lookup (user-configured providers)
  const discoveredModel = await prisma.discoveredModel.findFirst({
    where: {
      modelId,
      isEnabled: true,
      provider: {
        userId,
        status: 'ACTIVE',
      },
    },
    include: {
      provider: true,
    },
  })

  if (discoveredModel) {
    const provider = discoveredModel.provider.provider
    const modelName = discoveredModel.modelName
    const config = {
      apiKey: discoveredModel.provider.apiKey,
      baseURL: discoveredModel.provider.apiEndpoint || undefined,
    }

    if (isImageModel(modelName)) {
      return {
        model: createImageModel(provider, modelName, config) as any,
        provider,
        modelName,
        isPreset: false,
        isImageModel: true,
      }
    }

    return {
      model: createModel(provider, modelName, config),
      provider,
      modelName,
      isPreset: false,
      isImageModel: false,
    }
  }

  // Step 2: try parsing "provider/modelName" and use env-var preset
  const resolved = resolveFromModelIdString(modelId)
  if (resolved) return resolved

  throw new ModelNotFoundError(modelId)
}

/**
 * Parse a "provider/modelName" string and create the model using
 * the env-var API key for that provider.
 */
function resolveFromModelIdString(modelId: string): ResolvedModel | null {
  const slashIndex = modelId.indexOf('/')
  if (slashIndex === -1) return null

  const providerName = modelId.slice(0, slashIndex)
  const modelName = modelId.slice(slashIndex + 1)

  if (!providerName || !modelName) return null
  if (!isKnownProvider(providerName)) return null

  const preset = getPresetForProvider(providerName as ProviderName)
  if (!preset) return null

  const config = {
    apiKey: preset.apiKey,
    baseURL: preset.baseURL,
  }

  if (isImageModel(modelName)) {
    return {
      model: createImageModel(providerName, modelName, config) as any,
      provider: providerName,
      modelName,
      isPreset: true,
      isImageModel: true,
    }
  }

  return {
    model: createModel(providerName, modelName, config),
    provider: providerName,
    modelName,
    isPreset: true,
    isImageModel: false,
  }
}

function resolveDefaultModel(): ResolvedModel {
  const preset = getDefaultPreset()
  const config = {
    apiKey: preset.apiKey,
    baseURL: preset.baseURL,
  }

  if (isImageModel(preset.modelName)) {
    return {
      model: createImageModel(preset.provider, preset.modelName, config) as any,
      provider: preset.provider,
      modelName: preset.modelName,
      isPreset: true,
      isImageModel: true,
    }
  }

  return {
    model: createModel(preset.provider, preset.modelName, config),
    provider: preset.provider,
    modelName: preset.modelName,
    isPreset: true,
    isImageModel: false,
  }
}

export class ModelNotFoundError extends Error {
  constructor(modelId: string) {
    super(`Model not found or not accessible: ${modelId}`)
    this.name = 'ModelNotFoundError'
  }
}
