"use client";

import { cn } from "@/lib/utils";

export type MALiveIndicatorVariant = "live" | "sample";

interface MALiveIndicatorProps {
  variant: MALiveIndicatorVariant;
  /** Applies to outer pill wrapper */
  className?: string;
  /** Shorter label in tight card headers */
  compact?: boolean;
}

export function MALiveIndicator({
  variant,
  className,
  compact = false,
}: MALiveIndicatorProps) {
  const isLive = variant === "live";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide leading-none shrink-0",
        isLive
          ? "border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-400"
          : "border-muted-foreground/25 bg-muted/50 text-muted-foreground",
        className
      )}
      title={
        isLive
          ? "Metric value comes from the connected reporting API."
          : "Sample / illustrative values — not wired to the live KPI API."
      }
    >
      <span
        className={cn(
          "h-1 w-1 rounded-full",
          isLive ? "bg-emerald-500 shadow-[0_0_6px_rgb(52,211,153)] animate-pulse" : "bg-muted-foreground/50"
        )}
        aria-hidden
      />
      {compact ? (isLive ? "API" : "Demo") : isLive ? "Live" : "Sample"}
    </span>
  );
}
