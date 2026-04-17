import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonFormatter } from "@/components/JsonFormatter";
import { TextDiff } from "@/components/TextDiff";
import { Base64Tool } from "@/components/Base64Tool";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Braces, Diff, Binary, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DevToools — JSON Formatter, Text Diff & Base64" },
      {
        name: "description",
        content:
          "Free in-browser developer utilities: JSON formatter with collapsible tree, side-by-side text diff, and Base64 encoder/decoder.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="relative min-h-screen bg-background">
      {/* Decorative gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{ background: "var(--gradient-hero)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={logo}
              alt="DevToools logo"
              width={56}
              height={56}
              className="h-12 w-12 rounded-xl sm:h-14 sm:w-14"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            />
            <div>
              <h1
                className="bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                DevToools
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Lightweight utilities for everyday development
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <div
          className="rounded-2xl border bg-card p-4 sm:p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Tabs defaultValue="json" className="w-full">
            <TabsList className="mb-6 h-auto flex-wrap gap-1 bg-muted/60 p-1">
              <TabsTrigger value="json" className="gap-2 data-[state=active]:shadow-sm">
                <Braces className="h-4 w-4" /> JSON Formatter
              </TabsTrigger>
              <TabsTrigger value="diff" className="gap-2 data-[state=active]:shadow-sm">
                <Diff className="h-4 w-4" /> Text Diff
              </TabsTrigger>
              <TabsTrigger value="base64" className="gap-2 data-[state=active]:shadow-sm">
                <Binary className="h-4 w-4" /> Base64
              </TabsTrigger>
            </TabsList>

            <TabsContent value="json">
              <JsonFormatter />
            </TabsContent>
            <TabsContent value="diff">
              <TextDiff />
            </TabsContent>
            <TabsContent value="base64">
              <Base64Tool />
            </TabsContent>
          </Tabs>
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Built for developers · 100% client-side · Your data never leaves the browser
        </footer>
      </div>
    </main>
  );
}
