"use client";

import {
  ArrowUpRightIcon,
  Clock3Icon,
  GaugeIcon,
  Layers3Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MALiveIndicator } from "@/components/kpi/ma-live-indicator";
import { cn } from "@/lib/utils";

type MAKPICardDataAttribution = "live" | "sample" | "none";
type KPIStatus = "excellent" | "good" | "warning" | "critical";

export interface MAKPICardModuleBreakdownItem {
  code: string;
  label: string;
  percentage: number;
}

export interface MAKPICardSideMetric {
  id: string;
  label: string;
  value?: number;
  suffix?: string;
  numerator?: number;
  denominator?: number;
  isEmpty?: boolean;
}

interface MAKPICardProps {
  className?: string;
  kpiCode?: string;
  title: string;
  value: string | number;
  description?: string;
  status?: KPIStatus;
  icon?: React.ReactNode;
  suffix?: string;
  prefix?: string;
  numerator?: number;
  denominator?: number;
  helperText?: string;
  active?: boolean;
  compact?: boolean;
  animationDelayMs?: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  isNotApplicable?: boolean;
  emptyMessage?: string;
  dataAttribution?: MAKPICardDataAttribution;
  strictLiveSlotEmpty?: boolean;
  moduleBreakdown?: MAKPICardModuleBreakdownItem[];
  sideBySideMetrics?: MAKPICardSideMetric[];
  targetPercentage?: number;
  targetDays?: number;
  onClick?: () => void;
}

const statusTheme: Record<
  KPIStatus,
  { label: string; accent: string; soft: string; ring: string; text: string }
> = {
  excellent: {
    label: "On track",
    accent: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    ring: "#10b981",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  good: {
    label: "Good",
    accent: "bg-blue-500",
    soft: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    ring: "#3b82f6",
    text: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    label: "Needs attention",
    accent: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    ring: "#f59e0b",
    text: "text-amber-600 dark:text-amber-400",
  },
  critical: {
    label: "Off track",
    accent: "bg-rose-500",
    soft: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    ring: "#f43f5e",
    text: "text-rose-600 dark:text-rose-400",
  },
};

function CardHeader({
  kpiCode,
  title,
  compact,
  dataAttribution,
  strictLiveSlotEmpty,
  metricKind,
}: {
  kpiCode?: string;
  title: string;
  compact: boolean;
  dataAttribution: MAKPICardDataAttribution;
  strictLiveSlotEmpty?: boolean;
  metricKind: "sla" | "time" | "transparency";
}) {
  const MetricIcon =
    metricKind === "time" ? Clock3Icon : metricKind === "transparency" ? Layers3Icon : GaugeIcon;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {kpiCode && (
            <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-white dark:bg-white dark:text-slate-950">
              {kpiCode}
            </span>
          )}
          {(strictLiveSlotEmpty || dataAttribution === "live") && (
            <MALiveIndicator variant="live" compact={compact} />
          )}
          {dataAttribution === "sample" && <MALiveIndicator variant="sample" compact={compact} />}
        </div>
        <h3 className={cn("max-w-[29rem] font-semibold leading-5 text-slate-800 dark:text-slate-100", compact ? "line-clamp-2 text-xs" : "text-sm")}>
          {title}
        </h3>
      </div>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
        <MetricIcon className="size-5" aria-hidden />
      </div>
    </div>
  );
}

export function MAKPICard({
  className,
  kpiCode,
  title,
  value,
  description,
  status = "good",
  suffix,
  prefix,
  numerator,
  denominator,
  helperText,
  active = false,
  compact = false,
  animationDelayMs = 0,
  isLoading = false,
  isEmpty = false,
  isNotApplicable = false,
  emptyMessage = "No data found",
  dataAttribution = "none",
  strictLiveSlotEmpty = false,
  moduleBreakdown,
  sideBySideMetrics,
  targetPercentage = 90,
  targetDays,
  onClick,
}: MAKPICardProps) {
  const clickable = Boolean(onClick) && !isLoading;
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const isTimeMetric = suffix?.trim().toLowerCase() === "days";
  const isTransparencyMetric = kpiCode === "MA-KPI-8" || Boolean(moduleBreakdown?.length);
  const hasSideBySideMetrics = Boolean(sideBySideMetrics?.length);
  const metricKind = isTimeMetric ? "time" : isTransparencyMetric ? "transparency" : "sla";
  const targetValue = isTimeMetric ? (targetDays ?? 270) : targetPercentage;
  const progressValue = isTimeMetric
    ? Math.max(0, Math.min(100, (targetValue / Math.max(safeValue, 1)) * 100))
    : Math.max(0, Math.min(100, safeValue));
  const delta = isTimeMetric ? targetValue - safeValue : safeValue - targetValue;
  const theme = statusTheme[status];

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!clickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  const shellClass = cn(
    "group relative isolate overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,0.7)] transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/70",
    compact ? "min-h-[178px]" : "min-h-[270px]",
    "animate-in fade-in slide-in-from-bottom-2",
    clickable && "cursor-pointer hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_20px_45px_-25px_rgba(91,33,182,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
    active && "border-violet-400 ring-2 ring-violet-200 dark:ring-violet-900",
    className
  );

  if (isLoading) {
    return (
      <Card className={shellClass} style={{ animationDelay: `${animationDelayMs}ms` }} aria-busy aria-label={`Loading ${title}`}>
        <div className="space-y-5 p-5">
          <div className="flex justify-between gap-4">
            <div className="flex-1 space-y-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-4/5" /></div>
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <div className="flex items-end justify-between gap-4"><Skeleton className="h-12 w-28" /><Skeleton className="size-16 rounded-full" /></div>
          <Skeleton className="h-2 w-full rounded-full" />
          {!compact && <><Skeleton className="h-3 w-2/3" /><Skeleton className="h-9 w-full rounded-xl" /></>}
        </div>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card
        className={cn(shellClass, "border-dashed bg-slate-50/80 dark:bg-slate-950/40")}
        style={{ animationDelay: `${animationDelayMs}ms` }}
        aria-label={`${title}: ${emptyMessage}`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : -1}
      >
        <div className="flex h-full flex-col p-5">
          <CardHeader kpiCode={kpiCode} title={title} compact={compact} dataAttribution={dataAttribution} strictLiveSlotEmpty={strictLiveSlotEmpty} metricKind={metricKind} />
          <div className="mt-6 flex flex-1 flex-col justify-end">
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <p className="font-semibold text-slate-700 dark:text-slate-200">{emptyMessage}</p>
              {!compact && !isNotApplicable && <p className="mt-1 text-xs leading-5 text-slate-500">No metric was returned for the selected product and date range.</p>}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] text-slate-500">{isNotApplicable ? "Not applicable" : "No data"}</Badge>
              {clickable && <span className="flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">View details <ArrowUpRightIcon className="size-3" /></span>}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const comparisonText = isTimeMetric
    ? delta >= 0
      ? `${Math.abs(delta).toFixed(0)} days faster than target`
      : `${Math.abs(delta).toFixed(0)} days slower than target`
    : delta >= 0
      ? `${Math.abs(delta).toFixed(1)} points above target`
      : `${Math.abs(delta).toFixed(1)} points below target`;

  return (
    <Card
      className={shellClass}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : -1}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", theme.accent)} />
      <div className="pointer-events-none absolute -right-12 -top-12 -z-10 size-36 rounded-full bg-violet-100/50 blur-2xl transition-transform duration-500 group-hover:scale-125 dark:bg-violet-900/20" />
      <div className="flex h-full flex-col p-5">
        <CardHeader kpiCode={kpiCode} title={title} compact={compact} dataAttribution={dataAttribution} metricKind={metricKind} />

        {hasSideBySideMetrics ? (
          <div className={cn("mt-5 grid gap-2", compact ? "grid-cols-1" : "grid-cols-2", !compact && (sideBySideMetrics?.length ?? 0) > 4 && "sm:grid-cols-3")}>
            {sideBySideMetrics?.map((item) => (
              <div key={item.id} className={cn("rounded-xl border px-3 py-3", item.isEmpty ? "border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40" : "border-violet-100 bg-violet-50/60 dark:border-violet-900/60 dark:bg-violet-950/25")}>
                <p className="line-clamp-2 min-h-7 text-[9px] font-bold uppercase leading-3.5 tracking-[0.08em] text-slate-500 dark:text-slate-400">{item.label}</p>
                {item.isEmpty ? <p className="mt-2 text-xs font-semibold text-slate-500">Work in progress</p> : <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950 dark:text-white">{item.value?.toFixed(1)}<span className="ml-1 text-xs font-semibold tracking-normal text-slate-500">{item.suffix}</span></p>}
                {!compact && !item.isEmpty && item.numerator !== undefined && item.denominator !== undefined && <p className="mt-1 text-[10px] tabular-nums text-slate-500">{item.numerator.toLocaleString()} of {item.denominator.toLocaleString()}</p>}
              </div>
            ))}
          </div>
        ) : <div className={cn("mt-5 flex items-end justify-between gap-4", compact && "mt-4")}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {isTimeMetric ? "Processing time" : isTransparencyMetric ? "Publication rate" : "On-time completion"}
            </p>
            <div className={cn("mt-1 font-bold tracking-[-0.04em] text-slate-950 dark:text-white", compact ? "text-3xl" : "text-4xl")}>
              {prefix}{value}<span className="ml-1 text-base font-semibold tracking-normal text-slate-500">{suffix}</span>
            </div>
          </div>
          {!compact && !isTimeMetric && (
            <div
              className="grid size-[72px] shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(${theme.ring} ${Math.min(100, safeValue) * 3.6}deg, #e2e8f0 0deg)` }}
              aria-label={`${safeValue}% progress`}
            >
              <div className="grid size-[58px] place-items-center rounded-full bg-white text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{Math.round(safeValue)}%</div>
            </div>
          )}
          {!compact && isTimeMetric && (
            <div className="rounded-xl bg-violet-50 px-3 py-2 text-right dark:bg-violet-950/40">
              <Clock3Icon className="ml-auto size-4 text-violet-600 dark:text-violet-300" />
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Lower is better</p>
            </div>
          )}
        </div>}

        {!hasSideBySideMetrics && <div className={cn("mt-4 space-y-2", compact && "mt-3")}>
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Performance</span>
            <span>
              Target {targetValue}{isTimeMetric ? " days" : "%"}
              {!isTimeMetric && targetDays != null ? ` · SLA ${targetDays} days` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={cn("h-full rounded-full transition-[width] duration-700", theme.accent)} style={{ width: `${progressValue}%` }} />
          </div>
          {!compact && <p className={cn("text-xs font-medium", theme.text)}>{comparisonText}</p>}
        </div>}

        {!compact && moduleBreakdown && moduleBreakdown.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {moduleBreakdown.map((item) => (
              <div key={item.code} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center dark:border-slate-800 dark:bg-slate-900/60" title={`${item.label}: ${item.percentage.toFixed(1)}%`}>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{item.code}</p>
                <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{item.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        )}

        {!compact && description && !moduleBreakdown?.length && (
          <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Badge className={cn("border-0 text-[10px] font-semibold shadow-none", theme.soft)}>{hasSideBySideMetrics ? `${sideBySideMetrics?.length} views` : theme.label}</Badge>
            {numerator !== undefined && denominator !== undefined && denominator > 0 && !compact && (
              <span className="truncate text-[11px] tabular-nums text-slate-500"><strong className="text-slate-700 dark:text-slate-300">{numerator}</strong> of {denominator}</span>
            )}
          </div>
          {clickable && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-violet-700 transition-transform group-hover:translate-x-0.5 dark:text-violet-300">
              Details <ArrowUpRightIcon className="size-3.5" />
            </span>
          )}
        </div>
        {!compact && helperText && <span className="sr-only">{helperText}</span>}
      </div>
    </Card>
  );
}
