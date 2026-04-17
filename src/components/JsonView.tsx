import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

// ---------------------------------------------------------------------------
// Match enumeration
// ---------------------------------------------------------------------------
// A "match" is one occurrence of the query inside either a key or a primitive
// value. Each match has a stable global index (document order) and a path
// describing which ancestors must be open for it to be visible.

type MatchInfo = {
  /** Path of ancestor object/array node ids (joined keys) that must be open. */
  ancestorPath: string[];
  /** Path key of the leaf (key string or primitive value position). */
  leafPathKey: string;
  /** Whether the match is on a key (vs. a primitive value). */
  isKey: boolean;
  /** Local index of this occurrence within the leaf's text. */
  localIndex: number;
};

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

function collectMatches(
  value: Json,
  q: string,
  ancestorPath: string[],
  pathKey: string,
  out: MatchInfo[],
): void {
  if (!q) return;
  if (value === null) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value);
    const n = countOccurrences(text, q);
    for (let i = 0; i < n; i++) {
      out.push({ ancestorPath, leafPathKey: pathKey, isKey: false, localIndex: i });
    }
    return;
  }
  if (Array.isArray(value)) {
    const childAncestor = [...ancestorPath, pathKey];
    for (let i = 0; i < value.length; i++) {
      collectMatches(value[i], q, childAncestor, pathKey ? `${pathKey}.${i}` : String(i), out);
    }
    return;
  }
  const childAncestor = [...ancestorPath, pathKey];
  for (const [k, v] of Object.entries(value)) {
    const childPath = pathKey ? `${pathKey}.${k}` : k;
    const n = countOccurrences(k, q);
    for (let i = 0; i < n; i++) {
      out.push({ ancestorPath: childAncestor, leafPathKey: childPath, isKey: true, localIndex: i });
    }
    collectMatches(v, q, childAncestor, childPath, out);
  }
}

// ---------------------------------------------------------------------------
// Highlight + Primitive
// ---------------------------------------------------------------------------

type RegisterRef = (globalIdx: number, el: HTMLElement | null) => void;

function Highlight({
  text,
  query,
  matchIndices,
  activeMatchIndex,
  registerRef,
}: {
  text: string;
  query: string;
  /** Global indices of each match within `text`, in order. */
  matchIndices: number[];
  activeMatchIndex: number;
  registerRef: RegisterRef;
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
        const globalIdx = matchIndices[localMatch] ?? -1;
        localMatch++;
        const isActive = globalIdx === activeMatchIndex;
        return (
          <mark
            key={idx}
            ref={(el) => {
              if (globalIdx >= 0) registerRef(globalIdx, el);
            }}
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
  matchIndices,
  activeMatchIndex,
  registerRef,
}: {
  value: Exclude<Json, object>;
  query: string;
  matchIndices: number[];
  activeMatchIndex: number;
  registerRef: RegisterRef;
}) {
  if (value === null) return <span className="text-json-null">null</span>;
  if (typeof value === "string")
    return (
      <span className="text-json-string">
        "
        <Highlight
          text={value}
          query={query}
          matchIndices={matchIndices}
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
          matchIndices={matchIndices}
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
          matchIndices={matchIndices}
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

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

function Node({
  value,
  depth = 0,
  expandSignal,
  collapseSignal,
  query,
  pathKey,
  /** Map from leaf path key + scope ("key" | "value") → list of global indices. */
  keyMatches,
  valueMatches,
  /** Set of pathKeys that should be force-open because a match lives inside them. */
  openPaths,
  activeMatchIndex,
  registerRef,
}: {
  value: Json;
  depth?: number;
  expandSignal: number;
  collapseSignal: number;
  query: string;
  pathKey: string;
  keyMatches: Map<string, number[]>;
  valueMatches: Map<string, number[]>;
  openPaths: Set<string> | null;
  activeMatchIndex: number;
  registerRef: RegisterRef;
}) {
  const [open, setOpen] = useState(depth < 2);
  const lowerQ = query.toLowerCase();

  useEffect(() => {
    if (expandSignal > 0) setOpen(true);
  }, [expandSignal]);

  useEffect(() => {
    if (collapseSignal > 0) setOpen(false);
  }, [collapseSignal]);

  // While searching, force this node open iff a match lives inside it.
  // When the query clears we leave the user's manual state alone.
  useEffect(() => {
    if (!lowerQ || !openPaths) return;
    setOpen(openPaths.has(pathKey));
  }, [lowerQ, openPaths, pathKey]);

  if (value === null || typeof value !== "object") {
    return (
      <Primitive
        value={value as Exclude<Json, object>}
        query={lowerQ}
        matchIndices={valueMatches.get(pathKey) ?? []}
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

  return (
    <span>
      <Collapsible open={open} setOpen={setOpen} bracket={isArray ? "[]" : "{}"} size={entries.length} />
      {open && (
        <div className="border-l border-border/60 ml-2 pl-3">
          {entries.map(([k, v], i) => {
            const childPath = pathKey ? `${pathKey}.${k}` : k;
            return (
              <div key={k} className="leading-6">
                {!isArray && (
                  <>
                    <span className="text-json-key">
                      "
                      <Highlight
                        text={k}
                        query={lowerQ}
                        matchIndices={keyMatches.get(childPath) ?? []}
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
                  pathKey={childPath}
                  keyMatches={keyMatches}
                  valueMatches={valueMatches}
                  openPaths={openPaths}
                  activeMatchIndex={activeMatchIndex}
                  registerRef={registerRef}
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

// ---------------------------------------------------------------------------
// JsonView
// ---------------------------------------------------------------------------

export function JsonView({
  value,
  expandSignal = 0,
  collapseSignal = 0,
  query = "",
  activeMatchIndex = 0,
  onMatchCountChange,
  onActiveMatchChange,
  scrollContainerRef,
  scrollbarTopOffset = 0,
}: {
  value: Json;
  expandSignal?: number;
  collapseSignal?: number;
  query?: string;
  activeMatchIndex?: number;
  onMatchCountChange?: (count: number) => void;
  onActiveMatchChange?: (idx: number) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  scrollbarTopOffset?: number;
}) {
  const refs = useRef<Map<number, HTMLElement>>(new Map());
  const lowerQ = query.toLowerCase();

  const { matches, keyMatches, valueMatches, openPaths } = useMemo(() => {
    const all: MatchInfo[] = [];
    if (lowerQ) collectMatches(value, lowerQ, [], "", all);
    const keyM = new Map<string, number[]>();
    const valM = new Map<string, number[]>();
    const opens = new Set<string>();
    all.forEach((m, globalIdx) => {
      const target = m.isKey ? keyM : valM;
      const existing = target.get(m.leafPathKey);
      if (existing) existing.push(globalIdx);
      else target.set(m.leafPathKey, [globalIdx]);
      for (const a of m.ancestorPath) opens.add(a);
    });
    return {
      matches: all,
      keyMatches: keyM,
      valueMatches: valM,
      openPaths: lowerQ ? opens : null,
    };
  }, [value, lowerQ]);

  const totalMatches = matches.length;

  useEffect(() => {
    onMatchCountChange?.(totalMatches);
  }, [totalMatches, onMatchCountChange]);

  refs.current = new Map();
  const registerRef: RegisterRef = (globalIdx, el) => {
    if (el) refs.current.set(globalIdx, el);
  };

  useEffect(() => {
    if (!lowerQ || totalMatches === 0) return;
    let cancelled = false;
    const tryScroll = (attempt: number) => {
      if (cancelled) return;
      const el = refs.current.get(activeMatchIndex);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (attempt < 8) window.setTimeout(() => tryScroll(attempt + 1), 40);
    };
    const id = window.setTimeout(() => tryScroll(0), 30);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [lowerQ, activeMatchIndex, totalMatches]);

  // Tick positions as fractions of scroll container's content height.
  const [tickPositions, setTickPositions] = useState<number[]>([]);
  const [tickRev, setTickRev] = useState(0);
  useEffect(() => {
    setTickRev((n) => n + 1);
  }, [lowerQ, totalMatches, value, expandSignal, collapseSignal]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || totalMatches === 0 || !lowerQ) {
      setTickPositions([]);
      return;
    }
    const id = window.setTimeout(() => {
      const containerRect = container.getBoundingClientRect();
      const totalScroll = container.scrollHeight;
      if (totalScroll <= 0) return;
      const positions: number[] = [];
      for (let i = 0; i < totalMatches; i++) {
        const el = refs.current.get(i);
        if (!el) {
          positions.push(-1);
          continue;
        }
        const r = el.getBoundingClientRect();
        const y = r.top - containerRect.top + container.scrollTop + r.height / 2;
        positions.push(y / totalScroll);
      }
      setTickPositions(positions);
    }, 80);
    return () => window.clearTimeout(id);
  }, [tickRev, lowerQ, totalMatches, scrollContainerRef]);

  return (
    <>
      <div className="font-mono text-sm whitespace-pre-wrap break-words">
        <Node
          value={value}
          expandSignal={expandSignal}
          collapseSignal={collapseSignal}
          query={query}
          pathKey=""
          keyMatches={keyMatches}
          valueMatches={valueMatches}
          openPaths={openPaths}
          activeMatchIndex={activeMatchIndex}
          registerRef={registerRef}
        />
      </div>
      {lowerQ && totalMatches > 0 && tickPositions.length > 0 && (
        <MatchTickOverlay
          positions={tickPositions}
          activeIndex={activeMatchIndex}
          topOffset={scrollbarTopOffset}
          onTickClick={(idx) => onActiveMatchChange?.(idx)}
        />
      )}
    </>
  );
}

function MatchTickOverlay({
  positions,
  activeIndex,
  topOffset,
  onTickClick,
}: {
  positions: number[];
  activeIndex: number;
  topOffset: number;
  onTickClick: (idx: number) => void;
}) {
  return (
    <div
      className="pointer-events-none sticky float-right z-20"
      style={{
        top: topOffset,
        right: 0,
        width: 12,
        height: `calc(100vh - ${topOffset}px)`,
        maxHeight: `calc(100% - ${topOffset}px)`,
        marginTop: -topOffset,
      }}
      aria-hidden="true"
    >
      <div className="relative w-full h-full">
        {positions.map((frac, i) => {
          if (frac < 0) return null;
          const isActive = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onTickClick(i)}
              aria-label={`Jump to match ${i + 1}`}
              className={cn(
                "pointer-events-auto absolute right-0 rounded-sm transition-colors",
                isActive ? "bg-primary" : "bg-primary/50 hover:bg-primary/80",
              )}
              style={{
                top: `calc(${frac * 100}% - 1px)`,
                height: isActive ? 4 : 2,
                width: isActive ? 12 : 8,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
