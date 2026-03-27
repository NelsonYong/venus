import { weatherTool } from './weather'
import { webSearchTool } from './web-search'
import { askUserTool } from './ask-user'
import { generateUITool } from './generate-ui'

export { weatherTool } from './weather'
export { webSearchTool } from './web-search'
export { askUserTool } from './ask-user'
export { generateUITool } from './generate-ui'

export interface BuildToolsOptions {
  webSearch?: boolean
  generateUI?: boolean
}

/**
 * Build the tools object for the agent based on configuration.
 * Always includes: weather, askUser, generateUI
 * Conditionally includes: webSearch
 */
export function buildTools(options: BuildToolsOptions = {}) {
  const tools: Record<string, any> = {
    weather: weatherTool,
    askUser: askUserTool,
    generateUI: generateUITool,
  }

  if (options.webSearch) {
    tools.webSearch = webSearchTool
  }

  return tools
}
