import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const OPEN: Record<string, string> = { "{": "}", "[": "]", "(": ")" };
const CLOSE: Record<string, string> = { "}": "{", "]": "[", ")": "(" };

/**
 * Find the index of the bracket matching the one at `pos` in `text`.
 * Returns -1 if no match.
 */
function findMatchingBracket(text: string, pos: number): number {
  const ch = text[pos];
  if (!ch) return -1;
  if (!(ch in OPEN) && !(ch in CLOSE)) return -1;
  const pairs = computePairs(text);
  return pairs.get(pos) ?? -1;
}

/** Compute bracket pair map for the entire text once. */
function computePairs(text: string): Map<number, number> {
  const pairs = new Map<number, number>();
  const stack: number[] = [];
  let inStr = false;
  let strCh = "";
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c in OPEN) stack.push(i);
    else if (c in CLOSE) {
      const open = stack.pop();
      if (open === undefined) continue;
      if (OPEN[text[open]] !== c) continue;
      pairs.set(open, i);
      pairs.set(i, open);
    }
  }
  return pairs;
}

type Pos = { left: number; top: number; height: number };

/**
 * Measure the pixel position of a character index inside a textarea by
 * mirroring its computed style into a hidden div.
 */
function measureCharPosition(
  textarea: HTMLTextAreaElement,
  mirror: HTMLDivElement,
  index: number,
): Pos | null {
  if (index < 0 || index > textarea.value.length) return null;
  const cs = window.getComputedStyle(textarea);
  // Copy relevant styles to mirror
  const props = [
    "boxSizing", "width", "height", "overflowX", "overflowY",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize",
    "fontFamily", "lineHeight", "letterSpacing", "textTransform", "wordSpacing",
    "textIndent", "whiteSpace", "wordWrap", "overflowWrap", "tabSize",
  ] as const;
  for (const p of props) {
    // @ts-expect-error index style by name
    mirror.style[p] = cs[p];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "0";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";

  const before = textarea.value.substring(0, index);
  const charText = textarea.value.substring(index, index + 1) || ".";
  mirror.textContent = "";
  const span1 = document.createElement("span");
  span1.textContent = before;
  const span2 = document.createElement("span");
  span2.textContent = charText;
  mirror.appendChild(span1);
  mirror.appendChild(span2);

  const mirrorRect = mirror.getBoundingClientRect();
  const spanRect = span2.getBoundingClientRect();
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;

  return {
    left: spanRect.left - mirrorRect.left,
    top: spanRect.top - mirrorRect.top,
    height: lineHeight,
  };
}

export function JsonEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Determine which bracket position (in text) is "next to" the cursor.
  // Prefer the char immediately before the caret, then at caret.
  const bracketIndex: number = (() => {
    if (!value) return -1;
    const before = caret - 1;
    if (before >= 0) {
      const c = value[before];
      if (c in OPEN || c in CLOSE) return before;
    }
    if (caret < value.length) {
      const c = value[caret];
      if (c in OPEN || c in CLOSE) return caret;
    }
    return -1;
  })();

  const matchIndex = bracketIndex >= 0 ? findMatchingBracket(value, bracketIndex) : -1;

  const [highlights, setHighlights] = useState<{
    a: Pos | null;
    b: Pos | null;
  }>({ a: null, b: null });

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    if (bracketIndex < 0 || matchIndex < 0) {
      setHighlights({ a: null, b: null });
      return;
    }
    const a = measureCharPosition(ta, mirror, bracketIndex);
    const b = measureCharPosition(ta, mirror, matchIndex);
    setHighlights({ a, b });
  }, [bracketIndex, matchIndex, value, scrollTop, scrollLeft]);

  // Sync overlay scroll with textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onScroll = () => {
      setScrollTop(ta.scrollTop);
      setScrollLeft(ta.scrollLeft);
    };
    ta.addEventListener("scroll", onScroll);
    return () => ta.removeEventListener("scroll", onScroll);
  }, []);

  const updateCaret = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    setCaret(ta.selectionStart);
  };

  // Compute the connecting line geometry.
  // We draw a vertical line on the left side of the matched-bracket column,
  // matching the indent guide convention from code editors.
  const line = (() => {
    const { a, b } = highlights;
    if (!a || !b) return null;
    // Don't draw a line if the brackets are on the same line.
    if (Math.abs(a.top - b.top) < a.height * 0.5) return null;
    const top = Math.min(a.top, b.top) + a.height;
    const bottom = Math.max(a.top, b.top);
    // Use the left edge of the opening bracket as the guide column.
    const leftBracketIndex = bracketIndex < matchIndex ? bracketIndex : matchIndex;
    const leftPos = leftBracketIndex === bracketIndex ? a : b;
    return {
      top,
      height: Math.max(0, bottom - top),
      left: leftPos.left,
    };
  })();

  return (
    <div className={cn("relative", className)}>
      {/* Hidden mirror for measurements */}
      <div
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none absolute -z-10 opacity-0"
      />
      {/* Overlay for bracket highlights + connecting line */}
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          style={{
            transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
            position: "absolute",
            inset: 0,
          }}
        >
          {highlights.a && (
            <span
              className="absolute rounded-sm bg-primary/20 ring-1 ring-primary/60"
              style={{
                left: highlights.a.left,
                top: highlights.a.top,
                width: `1ch`,
                height: highlights.a.height,
              }}
            />
          )}
          {highlights.b && (
            <span
              className="absolute rounded-sm bg-primary/20 ring-1 ring-primary/60"
              style={{
                left: highlights.b.left,
                top: highlights.b.top,
                width: `1ch`,
                height: highlights.b.height,
              }}
            />
          )}
          {line && (
            <span
              className="absolute border-l border-primary/50"
              style={{
                left: line.left,
                top: line.top,
                height: line.height,
              }}
            />
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={updateCaret}
        onClick={updateCaret}
        onSelect={updateCaret}
        onFocus={updateCaret}
        spellCheck={false}
        placeholder={placeholder}
        className={cn(
          "relative z-10 w-full resize-y bg-transparent font-mono text-sm",
          "rounded-md border border-input px-3 py-2 shadow-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "min-h-[480px]",
        )}
      />
    </div>
  );
}
