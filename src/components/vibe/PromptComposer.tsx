import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

type Props = {
  onSubmit: (value: string) => void;
  onStop: () => void;
  busy: boolean;
  placeholder?: string;
  size?: "hero" | "compact";
  autoFocus?: boolean;
};

export const PromptComposer = forwardRef<HTMLTextAreaElement, Props>(function PromptComposer(
  { onSubmit, onStop, busy, placeholder, size = "compact", autoFocus = true },
  _ref,
) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, size === "hero" ? 220 : 160)}px`;
  }, [value, size]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="group relative rounded-2xl border border-hairline bg-surface-raised/70 p-2 backdrop-blur transition-shadow duration-300 focus-within:shadow-[var(--shadow-glow)]"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={size === "hero" ? 3 : 2}
        placeholder={placeholder ?? "Describe a change — “add a dark mode toggle and a search bar”"}
        className={`w-full resize-none bg-transparent px-3 pt-2 pb-10 text-foreground placeholder:text-muted-foreground/70 focus:outline-none ${
          size === "hero" ? "text-base md:text-lg" : "text-sm"
        }`}
      />
      <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between">
        <span className="text-[11px] tracking-wide text-muted-foreground/70">
          Enter to send · Shift + Enter for a new line
        </span>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-surface text-foreground transition-colors hover:bg-muted"
            aria-label="Stop generating"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Generate"
          >
            <ArrowUp className="size-4" strokeWidth={2.6} />
          </button>
        )}
      </div>
    </form>
  );
});
