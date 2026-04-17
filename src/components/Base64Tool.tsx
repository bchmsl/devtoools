import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/use-local-storage";

type Mode = "encode" | "decode";

function encode(s: string): string {
  try {
    // Handle Unicode safely
    return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  } catch {
    return "";
  }
}

function decode(s: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const bin = atob(s.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function Base64Tool() {
  const [mode, setMode] = useLocalStorage<Mode>("devtoools.base64.mode", "encode");
  const [input, setInput] = useLocalStorage<string>("devtoools.base64.input", "Hello, Lovable!");

  const output = useMemo(() => {
    if (!input) return { ok: true as const, value: "" };
    if (mode === "encode") return { ok: true as const, value: encode(input) };
    return decode(input);
  }, [input, mode]);

  const handleCopy = async () => {
    if (output.ok) {
      await navigator.clipboard.writeText(output.value);
      toast.success("Copied to clipboard");
    }
  };

  const handleSwap = () => {
    if (output.ok) {
      setInput(output.value);
      setMode(mode === "encode" ? "decode" : "encode");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            size="sm"
            variant={mode === "encode" ? "default" : "ghost"}
            onClick={() => setMode("encode")}
          >
            Encode
          </Button>
          <Button
            size="sm"
            variant={mode === "decode" ? "default" : "ghost"}
            onClick={() => setMode("decode")}
          >
            Decode
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleSwap} disabled={!output.ok}>
          Swap ⇅
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={!output.ok}>
          Copy output
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="b64-in">Input ({mode === "encode" ? "plain text" : "base64"})</Label>
          <Textarea
            id="b64-in"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="min-h-[320px] font-mono text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Output ({mode === "encode" ? "base64" : "plain text"})</Label>
          <div className="min-h-[320px] rounded-lg border bg-card p-3 font-mono text-sm whitespace-pre-wrap break-all overflow-auto">
            {output.ok ? (
              output.value || (
                <span className="text-muted-foreground">Output will appear here.</span>
              )
            ) : (
              <span className="text-destructive">{output.error}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
