"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MAKPICardProps {
  kpiCode?: string;
  title: string;
  value: string | number;
  description?: string;
  status?: "excellent" | "good" | "warning" | "critical";
  icon?: React.ReactNode;
  suffix?: string;
  prefix?: string;
  numerator?: number;
  denominator?: number;
  helperText?: string;
  active?: boolean;
  compact?: boolean;
  animationDelayMs?: number;
  /** When true, shows a pulsing skeleton for the full card (no dummy metrics). */
  isLoading?: boolean;
  onClick?: () => void;
}

export function MAKPICard({
  kpiCode,
  title,
  value,
  description,
  status = "good",
  icon,
  suffix,
  prefix,
  numerator,
  denominator,
  helperText,
  active = false,
  compact = false,
  animationDelayMs = 0,
  isLoading = false,
  onClick,
}: MAKPICardProps) {
  const statusColors = {
    excellent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    good: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    critical: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
  };

  const clickable = Boolean(onClick) && !isLoading;
  const numericValue = Number(value);
  const safeNumericValue = Number.isFinite(numericValue) ? numericValue : 0;
  const targetValue = suffix === "%" ? 90 : 150;
  const progressValue =
    suffix === "%"
      ? Math.max(0, Math.min(100, safeNumericValue))
      : Math.max(0, Math.min(100, (targetValue / Math.max(safeNumericValue, 1)) * 100));
  const delta = suffix === "%" ? safeNumericValue - targetValue : targetValue - safeNumericValue;

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!clickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  if (isLoading) {
    return (
      <Card
        className={cn(
          "group relative overflow-hidden border transition-all duration-300",
          compact ? "min-h-[150px]" : "min-h-[205px]",
          "animate-in fade-in slide-in-from-bottom-2"
        )}
        style={{ animationDelay: `${animationDelayMs}ms` }}
        aria-busy
        aria-label={`Loading ${title}`}
      >
        <CardHeader className={cn("space-y-2 pb-2", compact && "pb-1")}>
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="space-y-2 flex-1 min-w-0">
              {kpiCode && <Skeleton className="h-5 w-20 rounded-md" />}
              <Skeleton className={cn("h-4 w-full max-w-[220px]", compact && "max-w-[160px]")} />
            </div>
            {icon && <Skeleton className="h-6 w-6 shrink-0 rounded-md" />}
          </div>
          {!compact && <Skeleton className="h-3 w-full max-w-[280px] mt-1" />}
        </CardHeader>
        <CardContent className="space-y-3 relative z-10">
          <Skeleton className={cn("h-9 w-28", compact && "h-8 w-24")} />
          <div className={cn("space-y-1", compact && "space-y-0.5")}>
            <Skeleton className="h-1.5 w-full rounded-full" />
            {!compact && <Skeleton className="h-3 w-48" />}
          </div>
          <Skeleton className="h-4 w-24" />
          {!compact && <Skeleton className="h-3 w-36" />}
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            {!compact && <Skeleton className="h-3 w-24" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all duration-300",
        compact ? "min-h-[150px]" : "min-h-[205px]",
        "animate-in fade-in slide-in-from-bottom-2",
        clickable &&
          "cursor-pointer hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40",
        active && "border-primary bg-primary/5 shadow-md"
      )}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : -1}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-indigo-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardHeader className={cn("space-y-2 pb-2", compact && "pb-1")}>
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="space-y-2">
            {kpiCode && (
              <span className="inline-flex rounded-md border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {kpiCode}
              </span>
            )}
            <CardTitle className={cn("font-semibold leading-5", compact ? "text-xs" : "text-sm")}>
              {title}
            </CardTitle>
          </div>
          {icon && <div className="mt-1 text-muted-foreground">{icon}</div>}
        </div>
        {!compact && description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3 relative z-10">
        <div className={cn("font-bold tracking-tight tabular-nums", compact ? "text-2xl" : "text-3xl")}>
          {prefix}
          {value}
          {suffix}
        </div>
        <div className={cn("space-y-1", compact && "space-y-0.5")}>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                status === "excellent" && "bg-emerald-500",
                status === "good" && "bg-blue-500",
                status === "warning" && "bg-amber-500",
                status === "critical" && "bg-rose-500"
              )}
              style={{ width: `${progressValue}%` }}
            />
          </div>
          {!compact && (
            <p className="text-[11px] text-muted-foreground">
              {suffix === "%"
                ? delta >= 0
                  ? `${delta.toFixed(1)}% above 90% SLA target`
                  : `${Math.abs(delta).toFixed(1)}% below 90% SLA target`
                : delta >= 0
                ? `${delta.toFixed(0)} days faster than 150-day target`
                : `${Math.abs(delta).toFixed(0)} days slower than 150-day target`}
            </p>
          )}
        </div>
        {numerator !== undefined && denominator !== undefined && denominator > 0 && (
          <div className="text-xs text-muted-foreground tabular-nums">
            {numerator} / {denominator}
          </div>
        )}
        {!compact && helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className={cn("text-[10px]", statusColors[status])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          {clickable && !compact && (
            <span className="text-[11px] text-muted-foreground">
              Click to drill down
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

