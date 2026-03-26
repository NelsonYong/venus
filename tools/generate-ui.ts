import { z } from 'zod'
import { tool } from 'ai'

/**
 * A2UI v0.8 component definition schema.
 * Uses the adjacency-list model: flat list, children by ID reference.
 */
const componentDefinitionSchema = z.object({
  id: z.string().describe('Unique component ID'),
  component: z.record(z.string(), z.record(z.string(), z.unknown())).describe(
    'Component type map, e.g. {"Text": {"text": {"literalString": "Hello"}}}. ' +
    'Available types: Text, Button, TextField, Row, Column, Card, Image, Icon, ' +
    'List, CheckBox, Slider, Tabs, Modal, Divider, DateTimeInput, MultipleChoice'
  ),
})

const surfaceUpdateSchema = z.object({
  surfaceId: z.string().describe('Unique surface ID'),
  root: z.string().describe('ID of the root component'),
  components: z.array(componentDefinitionSchema).describe('Flat list of components'),
  data: z.array(z.object({
    key: z.string(),
    valueString: z.string().optional(),
    valueNumber: z.number().optional(),
    valueBoolean: z.boolean().optional(),
  })).optional().describe('Initial data model entries'),
})

/**
 * Generate UI tool - the model outputs A2UI v0.8 protocol JSON.
 * The frontend renders it as native React components via @a2ui-sdk/react.
 */
export const generateUITool = tool({
  description: `Generate an interactive UI surface using A2UI v0.8 protocol. Use this when the user needs:
- Forms (contact forms, surveys, settings panels)
- Data displays (dashboards, cards, lists)
- Interactive widgets (calculators, timers, quizzes)
- Visual layouts (landing pages, product showcases)

Output A2UI v0.8 format: components as a FLAT adjacency list.
Each component has an "id" and a "component" field like {"Text": {"text": {"literalString": "Hello"}}}.
Container components use "children": {"explicitList": ["child1", "child2"]}.
Buttons use "action": {"name": "submit"}.
Text inputs use "value": {"path": "/formData/fieldName"} for data binding.

Available types: Text, Button, TextField, Row, Column, Card, Image, Icon, List, CheckBox, Slider, Tabs, Modal, Divider, DateTimeInput, MultipleChoice.`,
  inputSchema: z.object({
    surfaces: z.array(surfaceUpdateSchema).describe('One or more UI surfaces to render'),
  }),
  execute: async ({ surfaces }) => ({ surfaces }),
})
