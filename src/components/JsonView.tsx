import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function Primitive({ value }: { value: Exclude<Json, object> }) {
  if (value === null) return <span className="text-json-null">null</span>;
  if (typeof value === "string")
    return <span className="text-json-string">"{value}"</span>;
  if (typeof value === "number")
    return <span className="text-json-number">{value}</span>;
  if (typeof value === "boolean")
    return <span className="text-json-boolean">{String(value)}</span>;
  return null;
}

function Collapsible({
  open,
  setOpen,
  bracket,
  size,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  bracket: "{}" | "[]";
  size: number;
}) {
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="inline-flex items-center gap-1 rounded hover:bg-accent/60 px-1 -mx-1"
    >
      <ChevronRight
        className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-90")}
      />
      <span className="text-json-punctuation">{bracket[0]}</span>
      {!open && (
        <span className="text-muted-foreground text-xs">
          {size} {bracket === "{}" ? (size === 1 ? "key" : "keys") : size === 1 ? "item" : "items"}
        </span>
      )}
      {!open && <span className="text-json-punctuation">{bracket[1]}</span>}
    </button>
  );
}

function Node({
  value,
  depth = 0,
  expandSignal,
  collapseSignal,
}: {
  value: Json;
  depth?: number;
  expandSignal: number;
  collapseSignal: number;
}) {
  const [open, setOpen] = useState(depth < 2);

  useEffect(() => {
    if (expandSignal > 0) setOpen(true);
  }, [expandSignal]);

  useEffect(() => {
    if (collapseSignal > 0) setOpen(false);
  }, [collapseSignal]);

  if (value === null || typeof value !== "object") {
    return <Primitive value={value as Exclude<Json, object>} />;
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as Json[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, Json>);

  if (entries.length === 0) {
    return <span className="text-json-punctuation">{isArray ? "[]" : "{}"}</span>;
  }

  return (
    <span>
      <Collapsible
        open={open}
        setOpen={setOpen}
        bracket={isArray ? "[]" : "{}"}
        size={entries.length}
      />
      {open && (
        <div className="border-l border-border/60 ml-2 pl-3">
          {entries.map(([k, v], i) => (
            <div key={k} className="leading-6">
              {!isArray && (
                <>
                  <span className="text-json-key">"{k}"</span>
                  <span className="text-json-punctuation">: </span>
                </>
              )}
              <Node
                value={v}
                depth={depth + 1}
                expandSignal={expandSignal}
                collapseSignal={collapseSignal}
              />
              {i < entries.length - 1 && <span className="text-json-punctuation">,</span>}
            </div>
          ))}
          <span className="text-json-punctuation">{isArray ? "]" : "}"}</span>
        </div>
      )}
    </span>
  );
}

export function JsonView({
  value,
  expandSignal = 0,
  collapseSignal = 0,
}: {
  value: Json;
  expandSignal?: number;
  collapseSignal?: number;
}) {
  return (
    <div className="font-mono text-sm whitespace-pre-wrap break-words">
      <Node value={value} expandSignal={expandSignal} collapseSignal={collapseSignal} />
    </div>
  );
}
