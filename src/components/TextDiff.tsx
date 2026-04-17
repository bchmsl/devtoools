import { useMemo, useState } from "react";
import { diffLines, diffWordsWithSpace, type Change } from "diff";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "lines" | "words";

function DiffView({ changes }: { changes: Change[] }) {
  return (
    <div className="font-mono text-sm whitespace-pre-wrap break-words rounded-lg border bg-card p-4 min-h-[200px]">
      {changes.length === 0 ? (
        <span className="text-muted-foreground">No differences.</span>
      ) : (
        changes.map((c, i) => (
          <span
            key={i}
            className={cn(
              c.added && "bg-diff-add-bg text-diff-add-fg",
              c.removed && "bg-diff-remove-bg text-diff-remove-fg line-through decoration-diff-remove-fg/60",
            )}
          >
            {c.value}
          </span>
        ))
      )}
    </div>
  );
}

export function TextDiff() {
  const [a, setA] = useState("The quick brown fox jumps over the lazy dog.");
  const [b, setB] = useState("The quick red fox leaps over a sleepy dog.");
  const [mode, setMode] = useState<Mode>("words");

  const changes = useMemo(
    () => (mode === "lines" ? diffLines(a, b) : diffWordsWithSpace(a, b)),
    [a, b, mode],
  );

  const stats = useMemo(() => {
    let added = 0,
      removed = 0;
    for (const c of changes) {
      if (c.added) added += c.value.length;
      else if (c.removed) removed += c.value.length;
    }
    return { added, removed };
  }, [changes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            size="sm"
            variant={mode === "words" ? "default" : "ghost"}
            onClick={() => setMode("words")}
          >
            Word diff
          </Button>
          <Button
            size="sm"
            variant={mode === "lines" ? "default" : "ghost"}
            onClick={() => setMode("lines")}
          >
            Line diff
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="text-diff-add-fg">+{stats.added}</span>{" "}
          <span className="text-diff-remove-fg">−{stats.removed}</span>
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setA(""); setB(""); }}>
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="diff-a">Original</Label>
          <Textarea
            id="diff-a"
            value={a}
            onChange={(e) => setA(e.target.value)}
            spellCheck={false}
            className="min-h-[260px] font-mono text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="diff-b">Changed</Label>
          <Textarea
            id="diff-b"
            value={b}
            onChange={(e) => setB(e.target.value)}
            spellCheck={false}
            className="min-h-[260px] font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Result</Label>
        <DiffView changes={changes} />
      </div>
    </div>
  );
}
