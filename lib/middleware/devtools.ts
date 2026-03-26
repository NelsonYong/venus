import { type LanguageModel, type LanguageModelMiddleware } from 'ai'

/**
 * Wraps a language model with DevTools middleware in development.
 * In production, returns the model unchanged.
 *
 * Usage:
 *   const model = await withDevTools(resolvedModel)
 *
 * Then launch the viewer with: npx @ai-sdk/devtools
 * Open http://localhost:4983 to inspect LLM calls.
 */
export async function withDevTools(model: LanguageModel): Promise<LanguageModel> {
  if (process.env.NODE_ENV !== 'development') {
    return model
  }

  try {
    const mod = await import('@ai-sdk/devtools')
    const middleware = mod.devToolsMiddleware() as LanguageModelMiddleware

    // wrapLanguageModel expects LanguageModelV3; use dynamic import to match
    const { wrapLanguageModel } = await import('ai')
    return wrapLanguageModel({ model: model as any, middleware }) as unknown as LanguageModel
  } catch {
    return model
  }
}
