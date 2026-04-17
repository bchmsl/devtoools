import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function Highlight({
  text,
  query,
  isFirst,
  firstMatchRef,
}: {
  text: string;
  query: string;
  isFirst?: boolean;
  firstMatchRef?: React.RefObject<HTMLElement | null>;
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
  let markIdx = 0;
  return (
    <span>
      {parts.map((p, idx) => {
        if (!p.match) return <span key={idx}>{p.text}</span>;
        const attachRef = isFirst && markIdx === 0;
        markIdx++;
        return (
          <mark
            key={idx}
            ref={attachRef ? (firstMatchRef as React.RefObject<HTMLElement>) : undefined}
            className="rounded-sm bg-primary/30 text-foreground"
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
  isFirstMatch,
  firstMatchRef,
}: {
  value: Exclude<Json, object>;
  query: string;
  isFirstMatch?: boolean;
  firstMatchRef?: React.RefObject<HTMLElement | null>;
}) {
  if (value === null) return <span className="text-json-null">null</span>;
  if (typeof value === "string")
    return (
      <span className="text-json-string">
        "<Highlight text={value} query={query} isFirst={isFirstMatch} firstMatchRef={firstMatchRef} />"
      </span>
    );
  if (typeof value === "number")
    return (
      <span className="text-json-number">
        <Highlight text={String(value)} query={query} isFirst={isFirstMatch} firstMatchRef={firstMatchRef} />
      </span>
    );
  if (typeof value === "boolean")
    return (
      <span className="text-json-boolean">
        <Highlight text={String(value)} query={query} isFirst={isFirstMatch} firstMatchRef={firstMatchRef} />
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

// Find the path (array of keys/indices) to the first match in document order.
function findFirstMatchPath(value: Json, q: string, path: string[] = []): string[] | null {
  if (!q) return null;
  if (value === null) return null;
  if (typeof value === "string") return value.toLowerCase().includes(q) ? path : null;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value).toLowerCase().includes(q) ? path : null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const r = findFirstMatchPath(value[i], q, [...path, String(i)]);
      if (r) return r;
    }
    return null;
  }
  for (const [k, v] of Object.entries(value)) {
    if (k.toLowerCase().includes(q)) return [...path, k];
    const r = findFirstMatchPath(v, q, [...path, k]);
    if (r) return r;
  }
  return null;
}

function Node({
  value,
  depth = 0,
  expandSignal,
  collapseSignal,
  query,
  pathKey,
  firstMatchPathKey,
  firstMatchRef,
}: {
  value: Json;
  depth?: number;
  expandSignal: number;
  collapseSignal: number;
  query: string;
  pathKey: string;
  firstMatchPathKey: string | null;
  firstMatchRef: React.RefObject<HTMLElement | null>;
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
    return (
      <Primitive
        value={value as Exclude<Json, object>}
        query={lowerQ}
        isFirstMatch={!!lowerQ && pathKey === firstMatchPathKey}
        firstMatchRef={firstMatchRef}
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
          {entries.map(([k, v], i) => {
            const childPath = pathKey ? `${pathKey}.${k}` : k;
            const isKeyFirstMatch =
              !!lowerQ && !isArray && childPath === firstMatchPathKey && k.toLowerCase().includes(lowerQ);
            return (
              <div key={k} className="leading-6">
                {!isArray && (
                  <>
                    <span className="text-json-key">
                      "
                      <Highlight
                        text={k}
                        query={lowerQ}
                        isFirst={isKeyFirstMatch}
                        firstMatchRef={firstMatchRef}
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
                  pathKey={childPath}
                  firstMatchPathKey={firstMatchPathKey}
                  firstMatchRef={firstMatchRef}
                />
                {i < entries.length - 1 && <span className="text-json-punctuation">,</span>}
              </div>
            );
          })}
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
  const firstMatchRef = useRef<HTMLElement | null>(null);
  const lowerQ = query.toLowerCase();

  const firstMatchPathKey = lowerQ
    ? (() => {
        const path = findFirstMatchPath(value, lowerQ);
        return path ? path.join(".") : null;
      })()
    : null;

  useEffect(() => {
    if (!lowerQ || !firstMatchPathKey) return;
    // Wait for nodes to expand/collapse before scrolling.
    const id = window.setTimeout(() => {
      firstMatchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [lowerQ, firstMatchPathKey]);

  return (
    <div className="font-mono text-sm whitespace-pre-wrap break-words">
      <Node
        value={value}
        expandSignal={expandSignal}
        collapseSignal={collapseSignal}
        query={query}
        pathKey=""
        firstMatchPathKey={firstMatchPathKey}
        firstMatchRef={firstMatchRef}
      />
    </div>
  );
}
