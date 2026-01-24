import { prisma } from '@/lib/prisma'
import { createModel, createImageModel } from './registry'
import { getDefaultPreset } from './presets'
import { isImageModel, type ResolvedModel } from './types'

/**
 * Resolve a model ID to a ready-to-use language model instance.
 *
 * Resolution order:
 * 1. If modelId provided → look up user's discovered model in DB
 * 2. Otherwise → use default preset from env vars
 *
 * Returns the model instance, provider info, and whether it's a preset.
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

  if (!discoveredModel) {
    throw new ModelNotFoundError(modelId)
  }

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
