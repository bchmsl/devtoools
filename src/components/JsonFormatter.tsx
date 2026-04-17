import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { JsonView } from "./JsonView";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/use-local-storage";

const DEFAULT_JSON = `{\n  "name": "Lovable",\n  "active": true,\n  "count": 42,\n  "tags": ["json", "diff", "tools"],\n  "meta": { "nested": { "ok": null } }\n}`;

export function JsonFormatter() {
  const [input, setInput] = useLocalStorage<string>("devtoools.json.input", DEFAULT_JSON);
  const [expandSignal, setExpandSignal] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [search, setSearch] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatch, setActiveMatch] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset active match when the search term changes.
  useEffect(() => {
    setActiveMatch(0);
  }, [search]);

  const goPrev = () => {
    if (matchCount === 0) return;
    setActiveMatch((i) => (i - 1 + matchCount) % matchCount);
  };
  const goNext = () => {
    if (matchCount === 0) return;
    setActiveMatch((i) => (i + 1) % matchCount);
  };

  const parsed = useMemo(() => {
    if (!input.trim()) return { ok: true as const, value: undefined };
    try {
      return { ok: true as const, value: JSON.parse(input) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [input]);

  const stats = useMemo(() => {
    const bytes = new Blob([input]).size;
    const lines = input ? input.split("\n").length : 0;
    return { chars: input.length, bytes, lines };
  }, [input]);

  const handleFormat = () => {
    if (parsed.ok && parsed.value !== undefined) {
      setInput(JSON.stringify(parsed.value, null, 2));
    }
  };

  const handleMinify = () => {
    if (parsed.ok && parsed.value !== undefined) {
      setInput(JSON.stringify(parsed.value));
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(input);
    toast.success("Copied to clipboard");
  };

  const handleCopyFormatted = async () => {
    if (parsed.ok && parsed.value !== undefined) {
      await navigator.clipboard.writeText(JSON.stringify(parsed.value, null, 2));
      toast.success("Formatted JSON copied");
    }
  };

  const handleDownload = () => {
    if (!parsed.ok || parsed.value === undefined) return;
    const blob = new Blob([JSON.stringify(parsed.value, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInput(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleFormat} disabled={!parsed.ok}>Format</Button>
          <Button variant="secondary" onClick={handleMinify} disabled={!parsed.ok}>Minify</Button>
          <Button variant="outline" onClick={handleCopy}>Copy</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Upload</Button>
          <Button variant="outline" onClick={handleDownload} disabled={!parsed.ok || parsed.value === undefined}>
            Download
          </Button>
          <Button variant="ghost" onClick={() => setInput("")}>Clear</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,.txt"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="Paste your JSON here..."
          className="min-h-[480px] font-mono text-sm"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {stats.lines} lines · {stats.chars} chars · {stats.bytes} B
          </span>
          {parsed.ok && parsed.value !== undefined && (
            <span className="text-json-boolean">Valid JSON</span>
          )}
        </div>
        {!parsed.ok && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {parsed.error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpandSignal((n) => n + 1)}
            disabled={!parsed.ok || parsed.value === undefined}
          >
            Expand all
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCollapseSignal((n) => n + 1)}
            disabled={!parsed.ok || parsed.value === undefined}
          >
            Collapse all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyFormatted}
            disabled={!parsed.ok || parsed.value === undefined}
            className="ml-auto"
          >
            Copy formatted
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) goPrev();
                  else goNext();
                }
              }}
              placeholder="Search keys and values..."
              disabled={!parsed.ok || parsed.value === undefined}
              className="pl-8 pr-20"
            />
            {search && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {matchCount === 0 ? "0/0" : `${activeMatch + 1}/${matchCount}`}
                </span>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={goPrev}
            disabled={!search || matchCount === 0}
            aria-label="Previous match"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={goNext}
            disabled={!search || matchCount === 0}
            aria-label="Next match"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <div className="rounded-lg border bg-card p-4 min-h-[480px] overflow-auto">
          {parsed.ok ? (
            parsed.value === undefined ? (
              <p className="text-sm text-muted-foreground">Output will appear here.</p>
            ) : (
              <JsonView
                value={parsed.value}
                expandSignal={expandSignal}
                collapseSignal={collapseSignal}
                query={search}
                activeMatchIndex={activeMatch}
                onMatchCountChange={setMatchCount}
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Fix errors to preview JSON.</p>
          )}
        </div>
      </div>
    </div>
  );
}
