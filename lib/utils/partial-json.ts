/**
 * Utilities for parsing partial JSON from streaming tool calls.
 * Used to progressively render A2UI surfaces as they stream in.
 */

import { parse as bestEffortParse } from 'best-effort-json-parser'

export interface A2UISurface {
  surfaceId: string
  root: string
  components: Array<{
    id: string
    component: Record<string, Record<string, unknown>>
  }>
  data?: Array<{
    key: string
    valueString?: string
    valueNumber?: number
    valueBoolean?: boolean
  }>
}

interface GenerateUIInput {
  surfaces?: A2UISurface[]
}

/**
 * Check if a surface node has enough data to render.
 * A surface needs at least a surfaceId and root to be useful.
 */
function isCompleteSurface(s: unknown): s is A2UISurface {
  if (!s || typeof s !== 'object') return false
  const surface = s as Record<string, unknown>
  return (
    typeof surface.surfaceId === 'string' &&
    typeof surface.root === 'string' &&
    Array.isArray(surface.components) &&
    surface.components.length > 0
  )
}

/**
 * Check if an individual A2UI component node is complete enough to render.
 */
export function isCompleteComponent(c: unknown): boolean {
  if (!c || typeof c !== 'object') return false
  const comp = c as Record<string, unknown>
  return typeof comp.id === 'string' && comp.component != null
}

/**
 * Extract renderable surfaces from a potentially incomplete tool call input.
 * Filters to only surfaces with enough structure to render.
 */
export function extractCompleteSurfaces(partialInput: unknown): A2UISurface[] {
  if (!partialInput) return []

  let parsed: GenerateUIInput

  if (typeof partialInput === 'string') {
    try {
      parsed = bestEffortParse(partialInput) as GenerateUIInput
    } catch {
      return []
    }
  } else {
    parsed = partialInput as GenerateUIInput
  }

  if (!parsed?.surfaces || !Array.isArray(parsed.surfaces)) return []

  return parsed.surfaces.filter(isCompleteSurface).map((surface) => ({
    ...surface,
    // Only include components that are fully formed
    components: surface.components.filter(isCompleteComponent),
  })) as A2UISurface[]
}
