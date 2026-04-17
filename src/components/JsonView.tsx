import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function Highlight({
  text,
  query,
  firstMatchRef,
  className,
}: {
  text: string;
  query: string;
  firstMatchRef?: (el: HTMLElement | null) => void;
  className?: string;
}) {
  if (!query) return <span className={className}>{text}</span>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push({ text: text.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false });
    parts.push({ text: text.slice(idx, idx + q.length), match: true });
    i = idx + q.length;
  }
  let assignedRef = false;
  return (
    <span className={className}>
      {parts.map((p, idx) => {
        if (p.match) {
          const isFirst = !assignedRef;
          assignedRef = true;
          return (
            <mark
              key={idx}
              ref={isFirst ? firstMatchRef : undefined}
              className="rounded-sm bg-primary/30 text-foreground"
            >
              {p.text}
            </mark>
          );
        }
        return <span key={idx}>{p.text}</span>;
      })}
    </span>
  );
}

function Primitive({
  value,
  query,
  firstMatchRef,
}: {
  value: Exclude<Json, object>;
  query: string;
  firstMatchRef?: (el: HTMLElement | null) => void;
}) {
  if (value === null) return <span className="text-json-null">null</span>;
  if (typeof value === "string")
    return (
      <span className="text-json-string">
        "<Highlight text={value} query={query} firstMatchRef={firstMatchRef} />"
      </span>
    );
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

function nodeMatches(value: Json, q: string, key?: string): boolean {
  if (!q) return false;
  if (key !== undefined && key.toLowerCase().includes(q)) return true;
  if (value === null) return false;
  if (typeof value === "string") return value.toLowerCase().includes(q);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value).toLowerCase().includes(q);
  if (Array.isArray(value)) return value.some((v) => nodeMatches(v, q));
  return Object.entries(value).some(([k, v]) => nodeMatches(v, q, k));
}

function Node({
  value,
  depth = 0,
  expandSignal,
  collapseSignal,
  query,
  parentKey,
  firstMatchRef,
}: {
  value: Json;
  depth?: number;
  expandSignal: number;
  collapseSignal: number;
  query: string;
  parentKey?: string;
  firstMatchRef?: (el: HTMLElement | null) => void;
}) {
  const lowerQ = query.toLowerCase();
  const hasMatchInside =
    lowerQ && value !== null && typeof value === "object"
      ? nodeMatches(value, lowerQ)
      : false;

  const [open, setOpen] = useState(depth < 2);

  useEffect(() => {
    if (expandSignal > 0) setOpen(true);
  }, [expandSignal]);

  useEffect(() => {
    if (collapseSignal > 0) setOpen(false);
  }, [collapseSignal]);

  // When searching: open if contains a match, close if not
  useEffect(() => {
    if (!lowerQ) return;
    setOpen(hasMatchInside);
  }, [lowerQ, hasMatchInside]);

  if (value === null || typeof value !== "object") {
    const selfMatches =
      lowerQ &&
      ((parentKey !== undefined && parentKey.toLowerCase().includes(lowerQ)) ||
        (typeof value === "string" && value.toLowerCase().includes(lowerQ)) ||
        ((typeof value === "number" || typeof value === "boolean") &&
          String(value).toLowerCase().includes(lowerQ)));
    return (
      <Primitive
        value={value as Exclude<Json, object>}
        query={lowerQ}
        firstMatchRef={selfMatches ? firstMatchRef : undefined}
      />
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as Json[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, Json>);

  if (entries.length === 0) {
    return <span className="text-json-punctuation">{isArray ? "[]" : "{}"}</span>;
  }

  // In search mode, only render entries that match (or contain matches)
  const visibleEntries = lowerQ
    ? entries.filter(([k, v]) => nodeMatches(v, lowerQ, isArray ? undefined : k))
    : entries;

  return (
    <span>
      <Collapsible
        open={open}
        setOpen={setOpen}
        bracket={isArray ? "[]" : "{}"}
        size={lowerQ ? visibleEntries.length : entries.length}
      />
      {open && (
        <div className="border-l border-border/60 ml-2 pl-3">
          {visibleEntries.map(([k, v], i) => (
            <div key={k} className="leading-6">
              {!isArray && (
                <>
                  <span className="text-json-key">
                    "<Highlight text={k} query={lowerQ} firstMatchRef={firstMatchRef} />"
                  </span>
                  <span className="text-json-punctuation">: </span>
                </>
              )}
              <Node
                value={v}
                depth={depth + 1}
                expandSignal={expandSignal}
                collapseSignal={collapseSignal}
                query={query}
                parentKey={isArray ? undefined : k}
                firstMatchRef={firstMatchRef}
              />
              {i < visibleEntries.length - 1 && (
                <span className="text-json-punctuation">,</span>
              )}
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
  query = "",
}: {
  value: Json;
  expandSignal?: number;
  collapseSignal?: number;
  query?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstMatchElRef = useRef<HTMLElement | null>(null);
  const assignedRef = useRef(false);

  // Reset assignment tracking on each render pass driven by query changes
  assignedRef.current = false;

  const setFirstMatch = useMemo(
    () => (el: HTMLElement | null) => {
      if (!assignedRef.current && el) {
        assignedRef.current = true;
        firstMatchElRef.current = el;
      }
    },
    [],
  );

  useEffect(() => {
    if (!query) return;
    // Wait for DOM to settle after expand/collapse changes
    const t = setTimeout(() => {
      const el = firstMatchElRef.current;
      if (el && containerRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [query, value]);

  return (
    <div ref={containerRef} className="font-mono text-sm whitespace-pre-wrap break-words">
      <Node
        value={value}
        expandSignal={expandSignal}
        collapseSignal={collapseSignal}
        query={query}
        firstMatchRef={setFirstMatch}
      />
    </div>
  );
}
