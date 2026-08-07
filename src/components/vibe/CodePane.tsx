import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, FileCode2, FolderDown } from "lucide-react";

import type { ProjectFile } from "@/lib/vibe/parse";
import { downloadProjectZip, downloadText, slugify, type ImageAsset } from "@/lib/vibe/sandbox";

function iconTone(path: string): string {
  if (/\.(html?|jsx|tsx)$/i.test(path)) return "text-orange-400";
  if (/\.(css|scss)$/i.test(path)) return "text-sky-400";
  if (/\.(js|ts|mjs)$/i.test(path)) return "text-yellow-400";
  if (/\.py$/i.test(path)) return "text-emerald-400";
  if (/\.(json|ya?ml|toml)$/i.test(path)) return "text-violet-400";
  return "text-muted-foreground";
}

export function CodePane({
  files,
  code,
  streaming,
  title,
  assets = [],
}: {
  files: ProjectFile[];
  code: string;
  streaming: boolean;
  title: string;
  assets?: ImageAsset[];
}) {
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const list = useMemo<ProjectFile[]>(
    () => (files.length > 0 ? files : code ? [{ path: "index.html", content: code }] : []),
    [files, code],
  );

  const active = list.find((file) => file.path === activePath) ?? list[0] ?? null;
  const source = active?.content ?? "";

  useEffect(() => {
    if (streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [source, streaming]);

  const lines = source ? source.split("\n").length : 0;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {active ? active.path : `${slugify(title, "app")}.html`}
          {lines ? ` · ${lines} lines` : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!source}
            onClick={async () => {
              await navigator.clipboard.writeText(source);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            disabled={!active}
            onClick={() => active && downloadText(active.path.split("/").pop()!, active.content)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Download className="size-3.5" />
            File
          </button>
          <button
            type="button"
            disabled={list.length === 0 || zipping}
            onClick={async () => {
              setZipping(true);
              try {
                await downloadProjectZip(slugify(title), list, assets);
              } finally {
                setZipping(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <FolderDown className="size-3.5" />
            {zipping ? "Zipping…" : "ZIP"}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(140px,180px)_1fr]">
        <nav className="min-h-0 overflow-auto border-r border-hairline bg-surface/40 p-2">
          <p className="px-2 pb-1.5 text-[10px] tracking-wider text-muted-foreground uppercase">
            Files {list.length ? `(${list.length})` : ""}
          </p>
          {list.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => setActivePath(file.path)}
              className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-mono text-[11px] transition-colors ${
                active?.path === file.path
                  ? "bg-surface-raised text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCode2 className={`size-3.5 shrink-0 ${iconTone(file.path)}`} />
              <span className="truncate">{file.path}</span>
            </button>
          ))}
          {list.length === 0 && (
            <p className="px-2 text-[11px] text-muted-foreground">No files yet.</p>
          )}
        </nav>

        <div ref={scrollRef} className="min-h-0 overflow-auto bg-[oklch(0.13_0.01_264)]">
          {source ? (
            <pre className="min-w-full p-4 font-mono text-[12.5px] leading-relaxed">
              <code className="text-foreground/85">{source}</code>
            </pre>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="max-w-xs text-sm text-muted-foreground">
                Generated project files will stream here, ready to copy or download.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
