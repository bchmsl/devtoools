import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonFormatter } from "@/components/JsonFormatter";
import { TextDiff } from "@/components/TextDiff";
import { Base64Tool } from "@/components/Base64Tool";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Braces, Diff, Binary } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DevToools — JSON Formatter & Text Diff" },
      {
        name: "description",
        content:
          "Free in-browser JSON formatter with collapsible tree view and a side-by-side text diff tool.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">DevToools</h1>
            <p className="mt-1 text-muted-foreground">
              Lightweight utilities for everyday development.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Tabs defaultValue="json" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="json" className="gap-2">
              <Braces className="h-4 w-4" /> JSON Formatter
            </TabsTrigger>
            <TabsTrigger value="diff" className="gap-2">
              <Diff className="h-4 w-4" /> Text Diff
            </TabsTrigger>
            <TabsTrigger value="base64" className="gap-2">
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
    </main>
  );
}
