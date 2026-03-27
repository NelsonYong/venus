"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import {
  Layout,
  Loader2,
  InfoIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComponentDef {
  id: string;
  component: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

interface DataEntry {
  key: string;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
}

interface SurfaceData {
  surfaceId: string;
  root?: string;
  components?: ComponentDef[];
  data?: DataEntry[];
}

interface GenerateUIInput {
  surfaces?: SurfaceData[];
}

export interface GenerateUIViewProps {
  input: GenerateUIInput;
  output?: GenerateUIInput;
  state: string;
  onAction?: (
    surfaceId: string,
    actionName: string,
    data: Record<string, unknown>,
  ) => void;
}

// ---------------------------------------------------------------------------
// Surface State — reactive data store per surface
// ---------------------------------------------------------------------------

interface SurfaceStateValue {
  /** Current data snapshot */
  data: Record<string, unknown>;
  /** Read a value by path (e.g. "/form/name" → data["form/name"]) */
  get: (path: string) => unknown;
  /** Write a value by path */
  set: (path: string, value: unknown) => void;
}

const SurfaceStateContext = createContext<SurfaceStateValue>({
  data: {},
  get: () => undefined,
  set: () => {},
});

function useSurfaceState() {
  return useContext(SurfaceStateContext);
}

function parseInitialData(entries?: DataEntry[]): Record<string, unknown> {
  const init: Record<string, unknown> = {};
  if (entries) {
    for (const entry of entries) {
      const key = entry.key.startsWith("/") ? entry.key.slice(1) : entry.key;
      if (entry.valueString !== undefined) init[key] = entry.valueString;
      else if (entry.valueNumber !== undefined) init[key] = entry.valueNumber;
      else if (entry.valueBoolean !== undefined) init[key] = entry.valueBoolean;
    }
  }
  return init;
}

function SurfaceStateProvider({
  initialData,
  children,
}: {
  initialData?: DataEntry[];
  children: React.ReactNode;
}) {
  // Only initialize once — ignore prop changes during streaming to avoid state resets
  const [data, setData] = useState<Record<string, unknown>>(() =>
    parseInitialData(initialData),
  );
  const initialized = useRef(false);

  // Merge new initial data keys that don't exist yet (streaming may add new fields)
  useEffect(() => {
    if (initialized.current || !initialData) return;
    initialized.current = true;
    const parsed = parseInitialData(initialData);
    setData((prev) => {
      const merged = { ...prev };
      let changed = false;
      for (const [k, v] of Object.entries(parsed)) {
        if (!(k in merged)) {
          merged[k] = v;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [initialData]);

  const get = useCallback(
    (path: string) => {
      const key = path.startsWith("/") ? path.slice(1) : path;
      return data[key];
    },
    [data],
  );

  const set = useCallback((path: string, value: unknown) => {
    const key = path.startsWith("/") ? path.slice(1) : path;
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const ctx = useMemo(() => ({ data, get, set }), [data, get, set]);

  return (
    <SurfaceStateContext.Provider value={ctx}>
      {children}
    </SurfaceStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Universal field state — replaces all per-component Bound* wrappers
// ---------------------------------------------------------------------------

/**
 * Parse a ComponentDef into typeName + props, or null if invalid.
 * Pure function — safe to call before hooks.
 */
function parseComponentDef(
  comp: ComponentDef,
): { typeName: string; props: Record<string, unknown> } | null {
  if (!comp.component || typeof comp.component !== "object") return null;
  const entries = Object.entries(comp.component);
  if (entries.length === 0) return null;
  const [typeName, rawProps] = entries[0];
  if (!typeName) return null;
  const props = (rawProps && typeof rawProps === "object" ? rawProps : {}) as Record<
    string,
    unknown
  >;
  return { typeName, props };
}

/**
 * Universal hook for field state management.
 * If `bindPath` is non-null, reads/writes surface state (shared reactive store).
 * Otherwise, falls back to component-local state.
 * Always controlled — never switches between controlled/uncontrolled.
 */
function useFieldState(
  bindPath: string | null,
  defaultValue: unknown = "",
): [unknown, (v: unknown) => void] {
  const { get, set } = useSurfaceState();
  const [local, setLocal] = useState<unknown>(defaultValue);
  const value = bindPath ? (get(bindPath) ?? defaultValue) : local;
  const setValue = useCallback(
    (v: unknown) => {
      if (bindPath) set(bindPath, v);
      else setLocal(v);
    },
    [bindPath, set],
  );
  return [value, setValue];
}

// ---------------------------------------------------------------------------
// Value resolution — reads literals OR bound state values
// ---------------------------------------------------------------------------

/**
 * Resolve an A2UI value descriptor to a display string.
 * Supports: literalString, literalNumber, literalBoolean, path (data binding).
 * When `stateGetter` is provided, `{path}` reads live state instead of showing the key.
 */
function resolveValue(
  val: unknown,
  stateGetter?: (path: string) => unknown,
): string {
  if (!val || typeof val !== "object") return String(val ?? "");
  const v = val as Record<string, unknown>;
  if ("literalString" in v) return String(v.literalString);
  if ("literalNumber" in v) return String(v.literalNumber);
  if ("literalBoolean" in v) return String(v.literalBoolean);
  if ("path" in v) {
    if (stateGetter) {
      const stateVal = stateGetter(String(v.path));
      if (stateVal !== undefined) return String(stateVal);
    }
    return ""; // path exists but no value yet
  }
  return JSON.stringify(val);
}

/**
 * Extract the binding path from a value descriptor, if it's a data-bound value.
 */
function getBindingPath(val: unknown): string | null {
  if (!val || typeof val !== "object") return null;
  const v = val as Record<string, unknown>;
  if ("path" in v) return String(v.path);
  return null;
}

// ---------------------------------------------------------------------------
// Render Component — recursive, stateful
// ---------------------------------------------------------------------------

function RenderComponent({
  comp,
  allComponents,
  onAction,
  surfaceId,
}: {
  comp: ComponentDef;
  allComponents: Map<string, ComponentDef>;
  onAction?: GenerateUIViewProps["onAction"];
  surfaceId: string;
}) {
  const state = useSurfaceState();

  // Parse before hooks — pure function, safe for conditional hook guard
  const parsed = parseComponentDef(comp);

  // Extract binding paths (null when no binding or invalid component)
  const valueBind = parsed ? getBindingPath(parsed.props.value) : null;
  const openBind = parsed ? getBindingPath(parsed.props.open) : null;

  // Universal state hooks — always called, constant count per render
  const [fieldValue, setFieldValue] = useFieldState(valueBind, "");
  const [openValue, setOpenValue] = useFieldState(openBind, true);

  if (!parsed) return null;

  const { typeName, props } = parsed;

  // Resolve value with state binding
  const rv = (val: unknown) => resolveValue(val, state.get);

  const childrenDef = props.children as
    | { explicitList?: string[]; template?: unknown }
    | undefined;
  const childIds = childrenDef?.explicitList ?? [];

  const renderChildren = () =>
    childIds.map((cid) => {
      const child = allComponents.get(String(cid));
      if (!child) return null;
      return (
        <RenderComponent
          key={child.id}
          comp={child}
          allComponents={allComponents}
          onAction={onAction}
          surfaceId={surfaceId}
        />
      );
    });

  switch (typeName) {
    // =======================================================================
    // TEXT & DISPLAY
    // =======================================================================
    case "Text": {
      const text = rv(props.text);
      const variant = rv(props.variant);
      if (variant === "h1") return <h1 className="text-2xl font-bold">{text}</h1>;
      if (variant === "h2") return <h2 className="text-xl font-semibold">{text}</h2>;
      if (variant === "h3") return <h3 className="text-lg font-medium">{text}</h3>;
      if (variant === "caption")
        return <small className="text-xs text-muted-foreground">{text}</small>;
      return <p className="text-sm">{text}</p>;
    }

    case "Link": {
      const text = rv(props.text);
      const href = rv(props.href);
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {text || href}
        </a>
      );
    }

    case "Code": {
      const text = rv(props.text);
      const language = rv(props.language);
      return (
        <pre className="rounded-md bg-muted p-3 overflow-auto">
          <code className="text-xs font-mono" data-language={language || undefined}>
            {text}
          </code>
        </pre>
      );
    }

    case "Badge": {
      const text = rv(props.text);
      const variant = rv(props.variant);
      const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        default: "default",
        secondary: "secondary",
        destructive: "destructive",
        outline: "outline",
        success: "default",
        warning: "secondary",
      };
      return (
        <Badge variant={variantMap[variant] ?? "default"} className="px-2.5 py-0.5">
          {text}
        </Badge>
      );
    }

    case "Image": {
      const src = rv(props.src);
      const alt = rv(props.alt);
      return src ? <img src={src} alt={alt || ""} className="rounded-md max-w-full" /> : null;
    }

    case "Avatar": {
      const src = rv(props.src);
      const alt = rv(props.alt);
      const fallback = rv(props.fallback) || alt?.charAt(0)?.toUpperCase() || "?";
      const size = rv(props.size);
      const sizeClass = size === "lg" ? "size-12" : size === "sm" ? "size-6" : "size-8";
      return (
        <Avatar className={sizeClass}>
          {src ? <AvatarImage src={src} alt={alt || ""} /> : null}
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      );
    }

    case "Progress": {
      const label = rv(props.label);
      const value = valueBind
        ? Number(fieldValue ?? 0)
        : Number(rv(props.value)) || 0;
      return (
        <div className="space-y-1.5">
          {label && (
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground">{value}%</span>
            </div>
          )}
          <Progress value={value} />
        </div>
      );
    }

    // =======================================================================
    // INPUT — all use universal useFieldState
    // =======================================================================
    case "Button": {
      const text = rv(props.text);
      const variant = rv(props.variant);
      const action = props.action as
        | { name?: string; context?: unknown[] }
        | undefined;
      const buttonVariant =
        variant === "destructive"
          ? "destructive"
          : variant === "ghost"
            ? "ghost"
            : variant === "secondary"
              ? "secondary"
              : "outline";
      return (
        <Button
          size="sm"
          variant={buttonVariant as any}
          onClick={() => {
            if (action?.name && onAction) {
              onAction(surfaceId, action.name, { ...state.data });
            }
          }}
        >
          {text || "Button"}
        </Button>
      );
    }

    case "TextField": {
      const label = rv(props.label);
      const placeholder = rv(props.placeholder);
      return (
        <div className="space-y-1.5">
          {label && <label className="text-sm font-medium">{label}</label>}
          <Input
            value={String(fieldValue ?? "")}
            onChange={(e) => setFieldValue(e.target.value)}
            placeholder={placeholder}
          />
        </div>
      );
    }

    case "Textarea":
    case "TextArea": {
      const label = rv(props.label);
      const placeholder = rv(props.placeholder);
      const rows = Number(rv(props.rows)) || 3;
      return (
        <div className="space-y-1.5">
          {label && <label className="text-sm font-medium">{label}</label>}
          <Textarea
            value={String(fieldValue ?? "")}
            onChange={(e) => setFieldValue(e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
        </div>
      );
    }

    case "CheckBox": {
      const label = rv(props.label);
      const id = `checkbox-${comp.id}`;
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={Boolean(fieldValue)}
            onCheckedChange={(val) => setFieldValue(val === true)}
          />
          <label
            htmlFor={id}
            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        </div>
      );
    }

    case "Switch": {
      const label = rv(props.label);
      const id = `switch-${comp.id}`;
      return (
        <div className="flex items-center gap-2">
          <Switch
            id={id}
            checked={Boolean(fieldValue)}
            onCheckedChange={(val) => setFieldValue(val)}
          />
          <label htmlFor={id} className="text-sm leading-none">
            {label}
          </label>
        </div>
      );
    }

    case "Slider": {
      const label = rv(props.label);
      const min = Number(rv(props.min)) || 0;
      const max = Number(rv(props.max)) || 100;
      const step = Number(rv(props.step)) || 1;
      const numValue = Number(fieldValue) || min;
      return (
        <div className="space-y-1.5">
          {label && (
            <div className="flex justify-between text-sm">
              <label className="font-medium">{label}</label>
              <span className="text-muted-foreground">{numValue}</span>
            </div>
          )}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={numValue}
            onChange={(e) => setFieldValue(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      );
    }

    case "Select": {
      const label = rv(props.label);
      const placeholder = rv(props.placeholder) || "Select...";
      const options = (props.options ?? []) as Array<{
        label?: unknown;
        value?: unknown;
      }>;
      return (
        <div className="space-y-1.5">
          {label && <label className="text-sm font-medium">{label}</label>}
          <Select
            value={String(fieldValue ?? "")}
            onValueChange={(val) => setFieldValue(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt, i) => (
                <SelectItem
                  key={String(opt.value ?? i)}
                  value={String(opt.value ?? i)}
                >
                  {rv(opt.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "RadioGroup": {
      const label = rv(props.label);
      const options = (props.options ?? []) as Array<{
        label?: unknown;
        value?: unknown;
      }>;
      const name = `radio-${comp.id}`;
      const selected = String(fieldValue ?? "");
      return (
        <fieldset className="space-y-2">
          {label && <legend className="text-sm font-medium">{label}</legend>}
          {options.map((opt, i) => {
            const val = String(opt.value ?? i);
            return (
              <label key={val} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={name}
                  value={val}
                  checked={selected === val}
                  onChange={() => setFieldValue(val)}
                  className="size-4 border-primary text-primary focus:ring-primary"
                />
                <span>{rv(opt.label)}</span>
              </label>
            );
          })}
        </fieldset>
      );
    }

    // =======================================================================
    // LAYOUT
    // =======================================================================
    case "Row":
      return (
        <div className="flex items-center gap-3 flex-wrap">
          {renderChildren()}
        </div>
      );

    case "Column": {
      const kids = renderChildren();
      return (
        <div className="flex flex-col gap-2">
          {kids.length > 0 ? kids : null}
        </div>
      );
    }

    case "Card": {
      const title = rv(props.title);
      return (
        <Card>
          {title && (
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
          )}
          <CardContent className="space-y-2">{renderChildren()}</CardContent>
        </Card>
      );
    }

    case "List":
      return <div className="space-y-1">{renderChildren()}</div>;

    case "Divider":
      return <Separator className="my-2" />;

    case "Tabs": {
      const rawItems = (props.items ?? []) as Array<{
        label?: unknown;
        id?: unknown;
        children?: { explicitList?: string[] };
      }>;
      const items = rawItems.map((item, i) => ({
        id: rv(item.id) || String(i),
        label: rv(item.label) || `Tab ${i + 1}`,
        childIds: (item.children?.explicitList ?? []).map(String),
      }));
      const activeTab = String(fieldValue) || items[0]?.id || "0";
      const activeItem = items.find((it) => it.id === activeTab);
      const activeChildIds = activeItem?.childIds ?? [];
      return (
        <div className="space-y-2">
          <div className="flex gap-1 border-b">
            {items.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-none border-b-2 transition-colors",
                  item.id === activeTab
                    ? "border-primary text-primary"
                    : "border-transparent hover:border-primary/50",
                )}
                onClick={() => setFieldValue(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {activeChildIds.map((cid) => {
            const child = allComponents.get(cid);
            if (!child) return null;
            return (
              <RenderComponent
                key={child.id}
                comp={child}
                allComponents={allComponents}
                onAction={onAction}
                surfaceId={surfaceId}
              />
            );
          })}
        </div>
      );
    }

    case "Accordion":
    case "Collapsible": {
      const title = rv(props.title);
      return (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex w-full justify-between px-3 py-2">
              <span className="text-sm font-medium">{title}</span>
              <ChevronDownIcon className="size-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pt-1 pb-2 space-y-2">
            {renderChildren()}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // =======================================================================
    // FEEDBACK & OVERLAY
    // =======================================================================
    case "Alert": {
      const title = rv(props.title);
      const description = rv(props.description);
      const variant = rv(props.variant);
      const iconMap: Record<string, React.ReactNode> = {
        info: <InfoIcon className="size-4" />,
        warning: <AlertTriangleIcon className="size-4" />,
        success: <CheckCircleIcon className="size-4" />,
        error: <AlertTriangleIcon className="size-4" />,
      };
      return (
        <Alert
          variant={
            variant === "error" || variant === "destructive" ? "destructive" : "default"
          }
        >
          {iconMap[variant] ?? <InfoIcon className="size-4" />}
          {title && <AlertTitle>{title}</AlertTitle>}
          {description && <AlertDescription>{description}</AlertDescription>}
          {renderChildren()}
        </Alert>
      );
    }

    case "Tooltip": {
      const text = rv(props.text);
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{renderChildren()}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    case "Modal":
    case "Dialog": {
      const title = rv(props.title);
      const description = rv(props.description);
      const isOpen = openBind ? Boolean(openValue) : rv(props.open) !== "false";
      return (
        <Dialog
          open={isOpen}
          onOpenChange={(val) => setOpenValue(val)}
        >
          <DialogContent showCloseButton={!!openBind}>
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            <div className="space-y-2">{renderChildren()}</div>
            <DialogFooter />
          </DialogContent>
        </Dialog>
      );
    }

    // =======================================================================
    // TABLE
    // =======================================================================
    case "Table": {
      const headers = (props.headers ?? []) as Array<unknown>;
      const rows = (props.rows ?? []) as Array<Array<unknown>>;
      return (
        <div className="w-full overflow-auto rounded-md border">
          <table className="w-full text-sm">
            {headers.length > 0 && (
              <thead>
                <tr className="border-b bg-muted/50">
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      {rv(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b last:border-0">
                  {(Array.isArray(row) ? row : []).map((cell, ci) => (
                    <td key={ci} className="px-3 py-2">
                      {rv(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // =======================================================================
    // FALLBACK
    // =======================================================================
    default:
      return (
        <div className="text-xs text-muted-foreground p-2 border rounded">
          [{typeName}] {renderChildren()}
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Surface Renderer — wraps components in state provider
// ---------------------------------------------------------------------------

const SurfaceRenderer = memo(function SurfaceRenderer({
  surface,
  onAction,
}: {
  surface: SurfaceData;
  onAction?: GenerateUIViewProps["onAction"];
}) {
  const rawComponents = surface.components;
  if (!rawComponents || !Array.isArray(rawComponents)) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Waiting for components...
      </div>
    );
  }
  const components = rawComponents.filter(
    (c): c is ComponentDef =>
      !!c &&
      typeof c === "object" &&
      !!c.id &&
      !!c.component &&
      typeof c.component === "object",
  );
  const compMap = new Map<string, ComponentDef>();
  for (const c of components) {
    compMap.set(c.id, c);
  }

  const referencedIds = new Set<string>();
  for (const c of components) {
    const entries = Object.entries(c.component);
    if (entries.length === 0) continue;
    const [, cProps] = entries[0];
    if (cProps && typeof cProps === "object") {
      const ch = cProps.children as { explicitList?: string[] } | undefined;
      if (ch?.explicitList) {
        for (const id of ch.explicitList) referencedIds.add(id);
      }
      // Also collect tab children
      const items = (cProps as Record<string, unknown>).items as
        | Array<{ children?: { explicitList?: string[] } }>
        | undefined;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.children?.explicitList) {
            for (const id of item.children.explicitList) referencedIds.add(id);
          }
        }
      }
    }
  }

  const rootId = surface.root;
  let rootComps: ComponentDef[];
  if (rootId && compMap.has(rootId)) {
    rootComps = [compMap.get(rootId)!];
  } else {
    rootComps = components.filter((c) => !referencedIds.has(c.id));
  }
  if (rootComps.length === 0) rootComps = components;

  return (
    <SurfaceStateProvider initialData={surface.data}>
      <div className="space-y-3">
        {rootComps.map((comp) => (
          <RenderComponent
            key={comp.id}
            comp={comp}
            allComponents={compMap}
            onAction={onAction}
            surfaceId={surface.surfaceId}
          />
        ))}
      </div>
    </SurfaceStateProvider>
  );
});

// ---------------------------------------------------------------------------
// Main View — throttled streaming + memoized rendering
// ---------------------------------------------------------------------------

const RENDER_INTERVAL_MS = 600;

function countComponents(surfaces: SurfaceData[]): number {
  return surfaces.reduce((sum, s) => sum + (s.components?.length ?? 0), 0);
}

export function GenerateUIView({
  input,
  output,
  state,
  onAction,
}: GenerateUIViewProps) {
  const isStreaming = state === "input-streaming" || state === "partial-call";

  // FIX 1: Stable callback ref — never changes identity, so useMemo deps don't bust
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const stableOnAction = useCallback(
    (surfaceId: string, actionName: string, data: Record<string, unknown>) => {
      onActionRef.current?.(surfaceId, actionName, data);
    },
    [],
  );

  const bestRef = useRef<SurfaceData[]>([]);
  const latestRef = useRef<SurfaceData[]>([]);
  const [rendered, setRendered] = useState<SurfaceData[]>([]);
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  // FIX 2: Move side effects out of render body into a ref-update effect
  const outputSurfaces = output?.surfaces;
  const inputSurfaces = input?.surfaces;

  // Compute live surfaces (pure derivation, no side effects)
  const liveSurfaces = useMemo(
    () =>
      outputSurfaces && outputSurfaces.length > 0
        ? outputSurfaces
        : inputSurfaces && inputSurfaces.length > 0
          ? inputSurfaces
          : [],
    [outputSurfaces, inputSurfaces],
  );

  // Update refs safely — runs after render, not during
  useEffect(() => {
    if (countComponents(liveSurfaces) >= countComponents(bestRef.current)) {
      bestRef.current = liveSurfaces;
    }
    latestRef.current = liveSurfaces.length > 0 ? liveSurfaces : bestRef.current;
  });

  // Throttled state update
  useEffect(() => {
    if (!isStreaming) {
      // Streaming ended — flush final data
      setRendered(latestRef.current);
      return;
    }
    // First paint
    if (latestRef.current.length > 0) {
      setRendered(latestRef.current);
    }
    const timer = setInterval(() => {
      if (latestRef.current.length > 0) {
        setRendered([...latestRef.current]);
      }
    }, RENDER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isStreaming]);

  // FIX 3: useMemo only depends on rendered + isStreaming (stable stableOnAction)
  const surfaceElements = useMemo(
    () =>
      rendered.map((surface, idx) => (
        <div
          key={surface.surfaceId || `surface-${idx}`}
          className={cn(
            "rounded-xl border bg-card p-5 shadow-sm overflow-hidden transition-opacity",
            isStreaming && "opacity-80",
          )}
        >
          <SurfaceRenderer surface={surface} onAction={stableOnAction} />
        </div>
      )),
    [rendered, isStreaming, stableOnAction],
  );

  if (rendered.length === 0 && latestRef.current.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Layout className="h-4 w-4" />
        <span>Generating interface...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isStreaming && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Building UI...</span>
        </div>
      )}
      {surfaceElements}
    </div>
  );
}
