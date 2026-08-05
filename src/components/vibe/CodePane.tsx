import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { downloadHtml, slugify } from "@/lib/vibe/sandbox";

export function CodePane({
  code,
  streaming,
  title,
}: {
  code: string;
  streaming: boolean;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [code, streaming]);

  const lines = code ? code.split("\n") : [];

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">
          {slugify(title, "app")}.html
          {code ? ` · ${lines.length} lines` : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!code}
            onClick={async () => {
              await navigator.clipboard.writeText(code);
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
            disabled={!code}
            onClick={() => downloadHtml(`${slugify(title)}.html`, code)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Download className="size-3.5" />
            Export
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-[oklch(0.13_0.01_264)]">
        {code ? (
          <pre className="min-w-full p-4 font-mono text-[12.5px] leading-relaxed">
            <code className="text-foreground/85">{code}</code>
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="max-w-xs text-sm text-muted-foreground">
              Generated source will stream here, ready to copy or export.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
