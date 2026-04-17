import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { JsonView } from "./JsonView";

export function JsonFormatter() {
  const [input, setInput] = useState<string>(
    `{\n  "name": "Lovable",\n  "active": true,\n  "count": 42,\n  "tags": ["json", "diff", "tools"],\n  "meta": { "nested": { "ok": null } }\n}`,
  );

  const parsed = useMemo(() => {
    if (!input.trim()) return { ok: true as const, value: undefined };
    try {
      return { ok: true as const, value: JSON.parse(input) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
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
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleFormat} disabled={!parsed.ok}>Format</Button>
          <Button variant="secondary" onClick={handleMinify} disabled={!parsed.ok}>Minify</Button>
          <Button variant="outline" onClick={handleCopy}>Copy</Button>
          <Button variant="ghost" onClick={() => setInput("")}>Clear</Button>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="Paste your JSON here..."
          className="min-h-[480px] font-mono text-sm"
        />
        {!parsed.ok && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {parsed.error}
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 min-h-[480px] overflow-auto">
        {parsed.ok ? (
          parsed.value === undefined ? (
            <p className="text-sm text-muted-foreground">Output will appear here.</p>
          ) : (
            <JsonView value={parsed.value} />
          )
        ) : (
          <p className="text-sm text-muted-foreground">Fix errors to preview JSON.</p>
        )}
      </div>
    </div>
  );
}
