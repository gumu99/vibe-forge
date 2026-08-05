import { History, Lightbulb, RotateCcw } from "lucide-react";

import type { Version } from "@/lib/vibe/useStudio";
import { PromptComposer } from "./PromptComposer";

function timeAgo(timestamp: number) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export function BuildSidebar({
  versions,
  activeId,
  onRestore,
  onSubmit,
  onStop,
  busy,
  error,
  streamTitle,
}: {
  versions: Version[];
  activeId: string | null;
  onRestore: (id: string) => void;
  onSubmit: (value: string) => void;
  onStop: () => void;
  busy: boolean;
  error: string | null;
  streamTitle: string;
}) {
  const active = versions.find((version) => version.id === activeId) ?? null;

  return (
    <aside className="flex h-full min-h-0 flex-col border-hairline lg:border-r">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <History className="size-3.5 text-muted-foreground" />
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Build history
        </h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {versions.length} version{versions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {versions.map((version) => {
          const isActive = version.id === activeId;
          return (
            <article
              key={version.id}
              className={`rounded-xl border p-3 transition-colors duration-200 ${
                isActive
                  ? "border-primary/40 bg-surface-raised"
                  : "border-hairline bg-surface/50 hover:border-hairline hover:bg-surface-raised/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                  {version.label}
                </span>
                <span className="truncate text-xs font-medium">{version.title}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {timeAgo(version.createdAt)}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{version.prompt}</p>
              {!isActive && (
                <button
                  type="button"
                  onClick={() => onRestore(version.id)}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-primary"
                >
                  <RotateCcw className="size-3" />
                  Restore &amp; continue here
                </button>
              )}
            </article>
          );
        })}

        {busy && (
          <div className="rounded-xl border border-hairline bg-surface/50 p-3">
            <p className="text-xs shimmer-text">
              {streamTitle ? `Building ${streamTitle}…` : "Thinking through the build…"}
            </p>
          </div>
        )}
      </div>

      {active && (active.notes || active.ideas.length > 0) && (
        <div className="border-t border-hairline p-3">
          {active.notes && <p className="text-xs text-muted-foreground">{active.notes}</p>}
          {active.ideas.length > 0 && (
            <>
              <div className="mt-3 flex items-center gap-1.5">
                <Lightbulb className="size-3.5 text-accent" />
                <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Suggested next steps
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {active.ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    disabled={busy}
                    onClick={() => onSubmit(idea)}
                    className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-40"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="border-t border-hairline p-3">
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
    </aside>
  );
}
