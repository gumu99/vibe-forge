import { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, RotateCw, Smartphone, Tablet } from "lucide-react";

import { buildSrcDoc } from "@/lib/vibe/sandbox";

type Device = "desktop" | "tablet" | "mobile";

const WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

const OPTIONS: { id: Device; label: string; icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

export function PreviewPane({
  code,
  streaming,
  title,
}: {
  code: string;
  streaming: boolean;
  title: string;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [nonce, setNonce] = useState(0);
  const lastGoodRef = useRef("");

  const srcDoc = useMemo(() => buildSrcDoc(code), [code]);
  if (srcDoc && !streaming) lastGoodRef.current = srcDoc;

  useEffect(() => {
    if (!streaming) setNonce((value) => value + 1);
  }, [streaming, srcDoc]);

  const rendered = streaming ? lastGoodRef.current : srcDoc || lastGoodRef.current;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="size-2.5 rounded-full bg-muted-foreground/30" />
            <i className="size-2.5 rounded-full bg-muted-foreground/30" />
            <i className="size-2.5 rounded-full bg-muted-foreground/30" />
          </span>
          <span className="truncate text-xs text-muted-foreground">{title || "Preview"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-lg border border-hairline p-0.5">
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDevice(option.id)}
                aria-label={option.label}
                aria-pressed={device === option.id}
                className={`inline-flex size-7 items-center justify-center rounded-md transition-colors ${
                  device === option.id
                    ? "bg-surface-raised text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <option.icon className="size-3.5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setNonce((value) => value + 1)}
            aria-label="Reload preview"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-auto bg-[oklch(0.13_0.01_264)] p-4">
        <div
          className="mx-auto h-full overflow-hidden rounded-xl border border-hairline bg-white transition-[width] duration-500 [transition-timing-function:var(--ease-smooth)]"
          style={{ width: WIDTHS[device], maxWidth: "100%" }}
        >
          {rendered ? (
            <iframe
              key={nonce}
              title="Generated app preview"
              srcDoc={rendered}
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              className="size-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface px-6 text-center">
              <p className="max-w-xs text-sm text-muted-foreground">
                Your app preview will appear here once the first build finishes.
              </p>
            </div>
          )}
        </div>

        {streaming && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-8">
            <span className="rounded-full border border-hairline bg-surface/90 px-4 py-1.5 text-xs shimmer-text backdrop-blur">
              Building your app…
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
