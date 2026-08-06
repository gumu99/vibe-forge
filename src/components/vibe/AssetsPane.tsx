import { useState } from "react";
import { Download, ImagePlus, Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import { downloadDataUrl, type ImageAsset } from "@/lib/vibe/sandbox";

export function AssetsPane({
  assets,
  maxAssets,
  onRegenerate,
  onAdd,
}: {
  assets: ImageAsset[];
  maxAssets: number;
  onRegenerate: (slot: string, prompt?: string) => void;
  onAdd: (prompt: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const ready = assets.filter((asset) => asset.status === "ready").length;
  const full = assets.length >= maxAssets;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <span className="text-xs text-muted-foreground">
          Generated images
          {assets.length ? ` · ${ready}/${assets.length} ready` : ""}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {assets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This build didn&apos;t need any imagery. Add one below and reference it in the code as{" "}
            <code className="font-mono text-xs">__VIBE_IMG_custom-1__</code>.
          </p>
        )}

        {assets.map((asset) => (
          <article
            key={asset.slot}
            className="flex gap-3 rounded-xl border border-hairline bg-surface-raised/40 p-3"
          >
            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
              {asset.dataUrl ? (
                <img
                  src={asset.dataUrl}
                  alt={asset.prompt}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  {asset.status === "error" ? (
                    <TriangleAlert className="size-4 text-destructive" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] text-primary">{asset.slot}</p>
              <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{asset.prompt}</p>
              {asset.error && <p className="mt-1 text-[11px] text-destructive">{asset.error}</p>}

              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onRegenerate(asset.slot)}
                  disabled={asset.status === "pending"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <RefreshCw className="size-3" />
                  {asset.status === "error" ? "Retry" : "Regenerate"}
                </button>
                {asset.dataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadDataUrl(`${asset.slot}.png`, asset.dataUrl!)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Download className="size-3" />
                    Save
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim() || full) return;
          onAdd(draft);
          setDraft("");
        }}
        className="flex shrink-0 items-center gap-2 border-t border-hairline p-3"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={full ? `Limit of ${maxAssets} images reached` : "Describe another image…"}
          disabled={full}
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={full || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
        >
          <ImagePlus className="size-3.5" />
          Generate
        </button>
      </form>
    </section>
  );
}
