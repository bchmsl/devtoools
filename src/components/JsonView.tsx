import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function Highlight({
  text,
  query,
  matchStartIndex,
  activeMatchIndex,
  registerRef,
}: {
  text: string;
  query: string;
  matchStartIndex: number; // global index of the first match within this text
  activeMatchIndex: number;
  registerRef: (globalIdx: number, el: HTMLElement | null) => void;
}) {
  if (!query) return <span>{text}</span>;
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
  let localMatch = 0;
  return (
    <span>
      {parts.map((p, idx) => {
        if (!p.match) return <span key={idx}>{p.text}</span>;
        const globalIdx = matchStartIndex + localMatch;
        localMatch++;
        const isActive = globalIdx === activeMatchIndex;
        return (
          <mark
            key={idx}
            ref={(el) => registerRef(globalIdx, el)}
            className={cn(
              "rounded-sm text-foreground",
              isActive ? "bg-primary/70 ring-2 ring-primary" : "bg-primary/30",
            )}
          >
            {p.text}
          </mark>
        );
      })}
    </span>
  );
}

function Primitive({
  value,
  query,
  matchStartIndex,
  activeMatchIndex,
  registerRef,
}: {
  value: Exclude<Json, object>;
  query: string;
  matchStartIndex: number;
  activeMatchIndex: number;
  registerRef: (globalIdx: number, el: HTMLElement | null) => void;
}) {
  if (value === null) return <span className="text-json-null">null</span>;
  if (typeof value === "string")
    return (
      <span className="text-json-string">
        "
        <Highlight
          text={value}
          query={query}
          matchStartIndex={matchStartIndex}
          activeMatchIndex={activeMatchIndex}
          registerRef={registerRef}
        />
        "
      </span>
    );
  if (typeof value === "number")
    return (
      <span className="text-json-number">
        <Highlight
          text={String(value)}
          query={query}
          matchStartIndex={matchStartIndex}
          activeMatchIndex={activeMatchIndex}
          registerRef={registerRef}
        />
      </span>
    );
  if (typeof value === "boolean")
    return (
      <span className="text-json-boolean">
        <Highlight
          text={String(value)}
          query={query}
          matchStartIndex={matchStartIndex}
          activeMatchIndex={activeMatchIndex}
          registerRef={registerRef}
        />
      </span>
    );
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

function nodeMatches(value: Json, q: string): boolean {
  if (!q) return false;
  if (value === null) return false;
  if (typeof value === "string") return value.toLowerCase().includes(q);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value).toLowerCase().includes(q);
  if (Array.isArray(value)) return value.some((v) => nodeMatches(v, q));
  return Object.entries(value).some(
    ([k, v]) => k.toLowerCase().includes(q) || nodeMatches(v, q),
  );
}

function countOccurrences(text: string, q: string): number {
  if (!q) return 0;
  const lower = text.toLowerCase();
  let i = 0;
  let count = 0;
  while (i < lower.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) break;
    count++;
    i = idx + q.length;
  }
  return count;
}

// Total match count across all keys and primitive values, in document order.
export function countMatches(value: Json, q: string): number {
  if (!q) return 0;
  if (value === null) return 0;
  if (typeof value === "string") return countOccurrences(value, q);
  if (typeof value === "number" || typeof value === "boolean")
    return countOccurrences(String(value), q);
  if (Array.isArray(value))
    return value.reduce<number>((sum, v) => sum + countMatches(v, q), 0);
  return Object.entries(value).reduce<number>(
    (sum, [k, v]) => sum + countOccurrences(k, q) + countMatches(v, q),
    0,
  );
}

// Cursor object so we can assign sequential global indices during render.
type MatchCursor = { idx: number };

function Node({
  value,
  depth = 0,
  expandSignal,
  collapseSignal,
  query,
  cursor,
  activeMatchIndex,
  registerRef,
}: {
  value: Json;
  depth?: number;
  expandSignal: number;
  collapseSignal: number;
  query: string;
  cursor: MatchCursor;
  activeMatchIndex: number;
  registerRef: (globalIdx: number, el: HTMLElement | null) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const lowerQ = query.toLowerCase();

  useEffect(() => {
    if (expandSignal > 0) setOpen(true);
  }, [expandSignal]);

  useEffect(() => {
    if (collapseSignal > 0) setOpen(false);
  }, [collapseSignal]);

  // When searching: open nodes that contain matches, collapse those that don't.
  useEffect(() => {
    if (!lowerQ) return;
    if (value !== null && typeof value === "object") {
      setOpen(nodeMatches(value, lowerQ));
    }
  }, [lowerQ, value]);

  if (value === null || typeof value !== "object") {
    const startIdx = cursor.idx;
    const text =
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : "";
    cursor.idx += countOccurrences(text, lowerQ);
    return (
      <Primitive
        value={value as Exclude<Json, object>}
        query={lowerQ}
        matchStartIndex={startIdx}
        activeMatchIndex={activeMatchIndex}
        registerRef={registerRef}
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

  // If this branch is closed, advance the cursor by the number of hidden matches
  // so subsequent siblings still get correct global indices.
  if (!open) {
    cursor.idx += countMatches(value, lowerQ);
    return (
      <span>
        <Collapsible open={open} setOpen={setOpen} bracket={isArray ? "[]" : "{}"} size={entries.length} />
      </span>
    );
  }

  return (
    <span>
      <Collapsible open={open} setOpen={setOpen} bracket={isArray ? "[]" : "{}"} size={entries.length} />
      <div className="border-l border-border/60 ml-2 pl-3">
        {entries.map(([k, v], i) => {
          const keyStartIdx = cursor.idx;
          if (!isArray) cursor.idx += countOccurrences(k, lowerQ);
          return (
            <div key={k} className="leading-6">
              {!isArray && (
                <>
                  <span className="text-json-key">
                    "
                    <Highlight
                      text={k}
                      query={lowerQ}
                      matchStartIndex={keyStartIdx}
                      activeMatchIndex={activeMatchIndex}
                      registerRef={registerRef}
                    />
                    "
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
                cursor={cursor}
                activeMatchIndex={activeMatchIndex}
                registerRef={registerRef}
              />
              {i < entries.length - 1 && <span className="text-json-punctuation">,</span>}
            </div>
          );
        })}
        <span className="text-json-punctuation">{isArray ? "]" : "}"}</span>
      </div>
    </span>
  );
}

export function JsonView({
  value,
  expandSignal = 0,
  collapseSignal = 0,
  query = "",
  activeMatchIndex = 0,
  onMatchCountChange,
}: {
  value: Json;
  expandSignal?: number;
  collapseSignal?: number;
  query?: string;
  activeMatchIndex?: number;
  onMatchCountChange?: (count: number) => void;
}) {
  const refs = useRef<Map<number, HTMLElement>>(new Map());
  const lowerQ = query.toLowerCase();

  const totalMatches = useMemo(() => countMatches(value, lowerQ), [value, lowerQ]);

  useEffect(() => {
    onMatchCountChange?.(totalMatches);
  }, [totalMatches, onMatchCountChange]);

  // Reset ref map on each render pass (refs get re-registered during render).
  refs.current = new Map();
  const registerRef = (globalIdx: number, el: HTMLElement | null) => {
    if (el) refs.current.set(globalIdx, el);
  };

  useEffect(() => {
    if (!lowerQ || totalMatches === 0) return;
    const id = window.setTimeout(() => {
      const el = refs.current.get(activeMatchIndex);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [lowerQ, activeMatchIndex, totalMatches, value]);

  const cursor: MatchCursor = { idx: 0 };

  return (
    <div className="font-mono text-sm whitespace-pre-wrap break-words">
      <Node
        value={value}
        expandSignal={expandSignal}
        collapseSignal={collapseSignal}
        query={query}
        cursor={cursor}
        activeMatchIndex={activeMatchIndex}
        registerRef={registerRef}
      />
    </div>
  );
}
