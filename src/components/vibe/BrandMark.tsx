import { Sparkle } from "lucide-react";

export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-xl ${className}`}
      style={{ backgroundImage: "var(--gradient-brand)" }}
      aria-hidden="true"
    >
      <Sparkle className="size-1/2 text-primary-foreground" strokeWidth={2.5} />
    </span>
  );
}
