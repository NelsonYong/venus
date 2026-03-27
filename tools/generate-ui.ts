import { z } from 'zod'
import { tool } from 'ai'

/**
 * A2UI v0.8 component definition schema.
 * Uses the adjacency-list model: flat list, children by ID reference.
 */
const componentDefinitionSchema = z.object({
  id: z.string().describe('Unique component ID'),
  component: z.record(z.string(), z.record(z.string(), z.unknown())).describe(
    'Component type map. See tool description for full reference.'
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
  })).optional().describe('Initial data model entries for binding'),
})

/**
 * Generate UI tool - the model outputs A2UI v0.8 protocol JSON.
 * The frontend renders it as native React components.
 */
export const generateUITool = tool({
  description: `Generate an interactive UI surface. Output A2UI v0.8 format: components as a FLAT adjacency list.

## Value Types
- Static: {"literalString": "Hello"}, {"literalNumber": 42}, {"literalBoolean": true}
- Data-bound: {"path": "/form/fieldName"} — reads/writes reactive surface state
- Initialize state via "data" array: [{"key": "form/name", "valueString": ""}]

## Component Reference

Layout:
- Row — {children: {explicitList: ["id1","id2"]}} horizontal flex
- Column — {children: {explicitList: [...]}} vertical flex
- Card — {title, children: {explicitList: [...]}}
- List — {children: {explicitList: [...]}}
- Divider — no props
- Accordion — {title, children: {explicitList: [...]}} collapsible

Text & Display:
- Text — {text, variant: "h1"|"h2"|"h3"|"caption"|"paragraph"}
- Link — {text, href}
- Code — {text, language}
- Badge — {text, variant: "default"|"secondary"|"destructive"|"outline"}
- Image — {src, alt}
- Avatar — {src, alt, fallback, size: "sm"|"md"|"lg"}
- Progress — {label, value} (0-100, supports binding)

Input (all support data binding via value: {path: "..."}):
- TextField — {label, placeholder, value}
- Textarea — {label, placeholder, rows, value}
- CheckBox — {label, value} (boolean)
- Switch — {label, value} (boolean)
- Slider — {label, min, max, step, value} (number)
- Select — {label, placeholder, options: [{label, value}], value}
- RadioGroup — {label, options: [{label, value}], value}

Feedback:
- Alert — {title, description, variant: "info"|"warning"|"success"|"error"}
- Tooltip — {text, children: {explicitList: [...]}}

Overlay:
- Modal — {title, description, open, children: {explicitList: [...]}}
- Tabs — {items: [{label, id, children: {explicitList: [...]}}], value}

Action:
- Button — {text, variant, action: {name: "submit"}} — sends surface data to model on click

Data:
- Table — {headers: [{literalString: "Name"}, ...], rows: [[{literalString: "Alice"}, ...]]}

## Example
{"surfaces":[{"surfaceId":"form","root":"r","data":[{"key":"form/name","valueString":""}],"components":[
  {"id":"r","component":{"Column":{"children":{"explicitList":["t","n","b"]}}}},
  {"id":"t","component":{"Text":{"text":{"literalString":"Sign Up"},"variant":{"literalString":"h2"}}}},
  {"id":"n","component":{"TextField":{"label":{"literalString":"Name"},"placeholder":{"literalString":"Your name"},"value":{"path":"/form/name"}}}},
  {"id":"b","component":{"Button":{"text":{"literalString":"Submit"},"action":{"name":"submit"}}}}
]}]}`,
  inputSchema: z.object({
    surfaces: z.array(surfaceUpdateSchema).describe('One or more UI surfaces to render'),
  }),
  execute: async ({ surfaces }) => ({ surfaces }),
})
