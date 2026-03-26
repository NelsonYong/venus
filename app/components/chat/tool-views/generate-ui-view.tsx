"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Layout, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ComponentDef {
  id: string;
  component: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

interface SurfaceData {
  surfaceId: string;
  root?: string;
  components?: ComponentDef[];
  data?: Array<{
    key: string;
    valueString?: string;
    valueNumber?: number;
    valueBoolean?: boolean;
  }>;
}

interface GenerateUIInput {
  surfaces?: SurfaceData[];
}

interface GenerateUIViewProps {
  input: GenerateUIInput;
  output?: GenerateUIInput;
  state: string;
  onAction?: (
    surfaceId: string,
    actionName: string,
    context: Record<string, unknown>,
  ) => void;
}

function resolveValue(val: unknown): string {
  if (!val || typeof val !== "object") return String(val ?? "");
  const v = val as Record<string, unknown>;
  if ("literalString" in v) return String(v.literalString);
  if ("literalNumber" in v) return String(v.literalNumber);
  if ("literalBoolean" in v) return String(v.literalBoolean);
  if ("path" in v) return String(v.path);
  return JSON.stringify(val);
}

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
  if (!comp.component || typeof comp.component !== "object") return null;
  const entries = Object.entries(comp.component);
  if (entries.length === 0) return null;
  const [typeName, rawProps] = entries[0];
  if (!typeName) return null;
  const props = (rawProps && typeof rawProps === "object" ? rawProps : {}) as Record<string, unknown>;

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
    case "Text": {
      const text = resolveValue(props.text);
      const variant = resolveValue(props.variant);
      if (variant === "h1")
        return <h1 className="text-2xl font-bold">{text}</h1>;
      if (variant === "h2")
        return <h2 className="text-xl font-semibold">{text}</h2>;
      if (variant === "h3")
        return <h3 className="text-lg font-medium">{text}</h3>;
      if (variant === "caption")
        return <small className="text-xs text-muted-foreground">{text}</small>;
      return <p className="text-sm">{text}</p>;
    }

    case "Button": {
      const text = resolveValue(props.text);
      const action = props.action as
        | { name?: string; context?: unknown[] }
        | undefined;
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (action?.name && onAction) {
              onAction(surfaceId, action.name, {});
            }
          }}
        >
          {text || "Button"}
        </Button>
      );
    }

    case "TextField": {
      const label = resolveValue(props.label);
      const placeholder = resolveValue(props.placeholder);
      return (
        <div className="space-y-1">
          {label && <label className="text-sm font-medium">{label}</label>}
          <input
            type="text"
            placeholder={placeholder}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      );
    }

    case "CheckBox": {
      const label = resolveValue(props.label);
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="rounded" />
          <span>{label}</span>
        </label>
      );
    }

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
      const title = resolveValue(props.title);
      return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          {title && <div className="font-medium mb-2">{title}</div>}
          <div className="space-y-2">{renderChildren()}</div>
        </div>
      );
    }

    case "List":
      return <div className="space-y-1">{renderChildren()}</div>;

    case "Divider":
      return <hr className="border-border my-2" />;

    case "Image": {
      const src = resolveValue(props.src);
      const alt = resolveValue(props.alt);
      return src ? (
        <img src={src} alt={alt || ""} className="rounded-md max-w-full" />
      ) : null;
    }

    case "Slider": {
      const label = resolveValue(props.label);
      return (
        <div className="space-y-1">
          {label && <label className="text-sm font-medium">{label}</label>}
          <input type="range" className="w-full" />
        </div>
      );
    }

    case "Tabs": {
      const items = (props.items ?? []) as Array<{
        label?: unknown;
        id?: unknown;
      }>;
      return (
        <div className="flex gap-1 border-b">
          {items.map((item, i) => (
            <button
              key={String(item.id ?? i)}
              className="px-3 py-1.5 text-sm border-b-2 border-transparent hover:border-primary transition-colors"
            >
              {resolveValue(item.label)}
            </button>
          ))}
        </div>
      );
    }

    default:
      return (
        <div className="text-xs text-muted-foreground p-2 border rounded">
          [{typeName}] {renderChildren()}
        </div>
      );
  }
}

function SurfaceRenderer({
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
    const [, props] = entries[0];
    if (props && typeof props === "object") {
      const ch = props.children as { explicitList?: string[] } | undefined;
      if (ch?.explicitList) {
        for (const id of ch.explicitList) referencedIds.add(id);
      }
    }
  }

  // Root = explicit root OR components not referenced as children
  const rootId = surface.root;
  let rootComps: ComponentDef[];
  if (rootId && compMap.has(rootId)) {
    rootComps = [compMap.get(rootId)!];
  } else {
    rootComps = components.filter((c) => !referencedIds.has(c.id));
  }

  if (rootComps.length === 0) rootComps = components;

  return (
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
  );
}

const RENDER_INTERVAL_MS = 600;

function countComponents(surfaces: SurfaceData[]): number {
  return surfaces.reduce(
    (sum, s) => sum + (s.components?.length ?? 0),
    0,
  );
}

export function GenerateUIView({
  input,
  output,
  state,
  onAction,
}: GenerateUIViewProps) {
  const isStreaming = state === "input-streaming" || state === "partial-call";

  // Refs updated every render (cheap) to hold the latest data
  const bestRef = useRef<SurfaceData[]>([]);
  const latestRef = useRef<SurfaceData[]>([]);

  // State that drives the actual expensive rendering — updated at
  // a throttled rate during streaming so we don't freeze the page.
  const [rendered, setRendered] = useState<SurfaceData[]>([]);

  // --- compute best surfaces (cheap ref work, no DOM) ---
  const outputSurfaces = output?.surfaces;
  const inputSurfaces = input?.surfaces;
  const liveSurfaces =
    outputSurfaces && outputSurfaces.length > 0
      ? outputSurfaces
      : inputSurfaces && inputSurfaces.length > 0
        ? inputSurfaces
        : [];

  if (countComponents(liveSurfaces) >= countComponents(bestRef.current)) {
    bestRef.current = liveSurfaces;
  }
  latestRef.current =
    liveSurfaces.length > 0 ? liveSurfaces : bestRef.current;

  // --- throttled state update ---
  useEffect(() => {
    if (!isStreaming) {
      // streaming ended — flush final data immediately
      setRendered(latestRef.current);
      return;
    }

    // first paint
    if (latestRef.current.length > 0) {
      setRendered(latestRef.current);
    }

    const timer = setInterval(() => {
      if (latestRef.current.length > 0) {
        // shallow copy so React sees a new reference
        setRendered([...latestRef.current]);
      }
    }, RENDER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isStreaming]);

  // --- memoised heavy rendering so parent re-renders are free ---
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
          <SurfaceRenderer surface={surface} onAction={onAction} />
        </div>
      )),
    [rendered, isStreaming, onAction],
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
