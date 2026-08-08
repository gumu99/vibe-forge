import { Boxes, Gauge, ShieldCheck } from "lucide-react";

import { BrandMark } from "./BrandMark";
import { PromptComposer } from "./PromptComposer";

const EXAMPLES = [
  "A habit tracker with streaks, weekly charts and confetti",
  "A pricing page for an AI analytics startup with a plan comparison",
  "A kanban board with drag-free keyboard-friendly task moves",
  "An expense splitter for trips with per-person balances",
];

const PILLARS = [
  { icon: Gauge, title: "Instant builds", copy: "Streamed straight into a live preview." },
  { icon: Boxes, title: "Prompt to update", copy: "Refine anything by describing it." },
  { icon: ShieldCheck, title: "Own the code", copy: "Clean, exportable, dependency-free HTML." },
];

export function Landing({
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
    <main className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-aura" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="font-display text-[15px] font-semibold tracking-tight">Vibe Coder</span>
        </div>
        <span className="rounded-full border border-hairline px-3 py-1 text-[11px] text-muted-foreground">
          Session workspace
        </span>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1 text-[11px] tracking-wide text-muted-foreground uppercase">
            Natural language → working app
          </span>
          <h1 className="mt-6 text-4xl leading-[1.05] font-semibold md:text-6xl">
            Describe it once.
            <br />
            <span className="text-gradient">Ship it in seconds.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Vibe Coder turns a sentence into a complete, working app — live preview, editable
            source, prompt-driven iteration and one-click export.
          </p>
        </div>

        <div className="mt-9 animate-rise [animation-delay:80ms]">
          <PromptComposer
            onSubmit={onSubmit}
            onStop={onStop}
            busy={busy}
            size="hero"
            placeholder="Build me a…  (e.g. a minimalist invoice generator with PDF-style preview)"
          />
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
            >
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onSubmit(example)}
                disabled={busy}
                className="rounded-full border border-hairline bg-surface/60 px-3.5 py-1.5 text-left text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-foreground disabled:opacity-40"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-4 animate-rise [animation-delay:160ms] sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="panel p-4">
              <pillar.icon className="size-4 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{pillar.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{pillar.copy}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-10 mt-auto px-6 py-5 text-center md:px-10">
        <p className="text-[11px] text-muted-foreground/60">Created by Saurav</p>
      </footer>
    </main>
  );
}
