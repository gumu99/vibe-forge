import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Code2, Download, Eye, Images, Pencil, Plus, X } from "lucide-react";

import { AssetsPane } from "@/components/vibe/AssetsPane";
import { BrandMark } from "@/components/vibe/BrandMark";
import { BuildSidebar } from "@/components/vibe/BuildSidebar";
import { CodePane } from "@/components/vibe/CodePane";
import { Landing } from "@/components/vibe/Landing";
import { PreviewPane } from "@/components/vibe/PreviewPane";
import { PromptComposer } from "@/components/vibe/PromptComposer";
import {
  applyAssets,
  bundleProject,
  downloadHtml,
  downloadProjectZip,
  slugify,
} from "@/lib/vibe/sandbox";
import { useStudio } from "@/lib/vibe/useStudio";

const TITLE = "Vibe Coder — Describe an idea, get a working app";
const DESCRIPTION =
  "Vibe Coder turns natural language into complete, working apps with live preview, editable source, prompt-driven iteration and one-click export.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VibeCoder,
});

function VibeCoder() {
  const studio = useStudio();
  const [tab, setTab] = useState<"preview" | "code" | "assets">("preview");
  const [editing, setEditing] = useState(false);

  const busy = studio.status === "streaming";
  const hasProject = studio.versions.length > 0 || busy;

  if (!hasProject) {
    return (
      <Landing onSubmit={studio.generate} onStop={studio.stop} busy={busy} error={studio.error} />
    );
  }

  const code = busy && studio.streamCode ? studio.streamCode : (studio.activeVersion?.code ?? "");
  const title = studio.activeVersion?.title || studio.streamTitle || "Untitled app";
  const assets = studio.activeVersion?.assets ?? [];
  const files =
    busy && studio.streamFiles.length ? studio.streamFiles : (studio.activeVersion?.files ?? []);
  const multiFile = files.length > 1;
  const exportCode = applyAssets(bundleProject(code, files), assets);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark className="size-7" />
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold">{title}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {busy ? "Generating…" : `Vibe Coder · ${studio.versions.length} versions`}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-hairline p-0.5 lg:hidden">
            {(
              [
                ["preview", Eye, "Preview"],
                ["code", Code2, `Code${files.length ? ` (${files.length})` : ""}`],
                ["assets", Images, "Images"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  tab === id
                    ? "bg-surface-raised text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || !studio.activeVersion}
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
          >
            <Pencil className="size-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            type="button"
            disabled={!code}
            onClick={() =>
              multiFile
                ? void downloadProjectZip(slugify(title), files, assets)
                : downloadHtml(`${slugify(title)}.html`, exportCode)
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{multiFile ? "Download ZIP" : "Export"}</span>
          </button>
          <button
            type="button"
            onClick={studio.reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:brightness-110"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New build</span>
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_1fr]">
        <div className="hidden min-h-0 lg:flex lg:flex-col">
          <BuildSidebar
            versions={studio.versions}
            activeId={studio.activeId}
            onRestore={studio.restore}
            onSubmit={studio.generate}
            onStop={studio.stop}
            busy={busy}
            error={studio.error}
            streamTitle={studio.streamTitle}
          />
        </div>

        <div className="grid min-h-0 lg:grid-cols-2">
          <div
            className={`min-h-0 border-hairline lg:border-r ${tab === "preview" ? "block" : "hidden"} lg:block`}
          >
            <PreviewPane code={code} streaming={busy} title={title} assets={assets} files={files} />
          </div>
          <div className={`flex min-h-0 flex-col ${tab === "preview" ? "hidden" : "flex"} lg:flex`}>
            <div className="hidden items-center gap-1 border-b border-hairline px-3 py-2 lg:flex">
              {(
                [
                  ["code", Code2, `Code${files.length ? ` (${files.length})` : ""}`],
                  ["assets", Images, `Images${assets.length ? ` (${assets.length})` : ""}`],
                ] as const
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                    tab === id
                      ? "bg-surface-raised text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {tab === "assets" ? (
                <AssetsPane
                  assets={assets}
                  maxAssets={studio.maxAssets}
                  onRegenerate={studio.regenerateAsset}
                  onAdd={studio.addAsset}
                />
              ) : (
                <CodePane
                  files={files}
                  code={code}
                  streaming={busy}
                  title={title}
                  assets={assets}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-hairline p-3 lg:hidden">
        <BuildSidebarMobileComposer
          onSubmit={studio.generate}
          onStop={studio.stop}
          busy={busy}
          error={studio.error}
        />
      </div>

      {editing && (
        <EditDialog
          title={title}
          busy={busy}
          onClose={() => setEditing(false)}
          onSubmit={(value) => {
            setEditing(false);
            studio.generate(value);
          }}
        />
      )}

      <div className="pointer-events-none fixed right-4 bottom-4 z-50 hidden lg:block">
        <span className="text-[10px] text-muted-foreground/40">Created by Saurav</span>
      </div>
    </div>
  );
}

function EditDialog({
  title,
  busy,
  onClose,
  onSubmit,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit this project"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-hairline bg-surface-raised p-5 shadow-[var(--shadow-glow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Edit this project</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Continues from where “{title}” left off — describe only what should change.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <PromptComposer
          onSubmit={onSubmit}
          onStop={() => {}}
          busy={busy}
          placeholder="e.g. Make the primary button red and add a dark mode toggle"
        />
      </div>
    </div>
  );
}

function BuildSidebarMobileComposer({
  onSubmit,
  onStop,
  busy,
  error,
}: {
  onSubmit: (value: string) => void;
  onStop: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div>
      {error && (
        <p
          role="alert"
          className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
        >
          {error}
        </p>
      )}
      <PromptComposer onSubmit={onSubmit} onStop={onStop} busy={busy} />
    </div>
  );
}
