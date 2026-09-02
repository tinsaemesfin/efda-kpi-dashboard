"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3Icon,
  PieChartIcon,
  TrendingUpIcon,
  AreaChartIcon,
  DownloadIcon,
  ActivityIcon,
  TargetIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  CalendarDaysIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { MALiveIndicator } from "@/components/kpi/ma-live-indicator";
import { cn } from "@/lib/utils";
import type { KPIDrillDownData, KPIDimensionView } from "@/types/ma-drilldown";
import type { MAApiFilterParams } from "@/types/ma-api";
import { getMAApiFilterChipLabels } from "@/lib/ma-api/filter-labels";
import {
  useMAProductStandardDrilldownData,
  useMAProductParDrilldownData,
} from "@/hooks/useMAApi";
import {
  buildMAKpi1DrilldownData,
  buildMAKpi2DrilldownData,
  buildMAKpi3DrilldownData,
  buildMAKpi4DrilldownData,
  buildMAKpi8DrilldownData,
} from "@/lib/ma-api/drilldown";
import type { MAKPIId, MAReportProduct } from "@/types/ma-api";

type ChartType = "bar" | "column" | "horizontalBar" | "line" | "area" | "pie" | "doughnut";

interface ChartOption {
  id: ChartType;
  label: string;
  icon: React.ReactNode;
}

const CHART_OPTIONS: ChartOption[] = [
  { id: "bar", label: "Bar", icon: <BarChart3Icon className="h-3.5 w-3.5" /> },
  { id: "horizontalBar", label: "H-Bar", icon: <BarChart3Icon className="h-3.5 w-3.5 rotate-90" /> },
  { id: "line", label: "Line", icon: <TrendingUpIcon className="h-3.5 w-3.5" /> },
  { id: "area", label: "Area", icon: <AreaChartIcon className="h-3.5 w-3.5" /> },
  { id: "pie", label: "Pie", icon: <PieChartIcon className="h-3.5 w-3.5" /> },
  { id: "doughnut", label: "Donut", icon: <PieChartIcon className="h-3.5 w-3.5" /> },
];

const PALETTE = [
  "#6366f1", "#22c55e", "#f59e0b", "#0ea5e9", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#ec4899", "#64748b",
];

function pickBestFitChart(view: KPIDimensionView): ChartType {
  const count = view.data.length;
  const label = view.label.toLowerCase();

  if (label.includes("internal regulatory pathway")) return "bar";
  if (label.includes("processing time")) return "pie";
  if (label.includes("regulatory outcome")) return "line";
  if (label.includes("reliance pathway")) return "bar";
  if (count <= 4) return "doughnut";
  if (count <= 6) return "bar";
  return "horizontalBar";
}

interface MADrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: KPIDrillDownData;
  drilldownSource?: MAReportProduct;
  /** Snapshot of page date filters at open time; fetch runs only while open. */
  filters?: MAApiFilterParams;
}

interface CategoryChartCardProps {
  view: KPIDimensionView;
  defaultChartType: ChartType;
}

function CategoryChartCard({ view, defaultChartType }: CategoryChartCardProps) {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);

  const chartData = useMemo(
    () =>
      view.data.map((item) => ({
        name: item.category,
        percentage: item.percentage ?? (item.total > 0 ? (item.count / item.total) * 100 : 0),
        onTime: item.count,
        total: item.total,
        targetDays: item.targetDays,
      })),
    [view.data]
  );

  const topPerformer = useMemo(
    () => [...chartData].sort((a, b) => b.percentage - a.percentage)[0],
    [chartData]
  );

  const totalOnTime = useMemo(() => chartData.reduce((s, d) => s + d.onTime, 0), [chartData]);
  const totalAll = useMemo(() => chartData.reduce((s, d) => s + d.total, 0), [chartData]);
  const overallPct = totalAll > 0 ? (totalOnTime / totalAll) * 100 : 0;
  const targetDays = useMemo(
    () => [...new Set(chartData.map((item) => item.targetDays).filter((value): value is number => value != null))],
    [chartData]
  );
  const targetDaysLabel = targetDays.length === 1
    ? ` · SLA ${targetDays[0]} days`
    : targetDays.length > 1
      ? " · mixed SLAs"
      : "";

  const renderChart = useCallback(() => {
    if (!chartData.length) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No data available
        </div>
      );
    }

    const sorted = [...chartData].sort((a, b) => b.total - a.total).slice(0, 10);

    if (chartType === "pie" || chartType === "doughnut") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={chartType === "doughnut" ? 55 : 0}
              outerRadius={95}
              paddingAngle={2}
              label={({ name, percent }) => {
                const safeName = String(name ?? "");
                const labelName = safeName.length > 14 ? `${safeName.slice(0, 12)}...` : safeName;
                return `${labelName} ${((percent ?? 0) * 100).toFixed(0)}%`;
              }}
              labelLine={{ strokeWidth: 1 }}
            >
              {sorted.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(_value, _name, entry) => {
                const payload = entry?.payload as
                  | { name?: string; percentage?: number; onTime?: number; total?: number; targetDays?: number }
                  | undefined;
                if (!payload) return ["No data", "Value"];
                return [
                  `${payload.onTime ?? 0}/${payload.total ?? 0} (${(payload.percentage ?? 0).toFixed(1)}%)${payload.targetDays != null ? ` · SLA ${payload.targetDays} days` : ""}`,
                  payload.name ?? "Category",
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "horizontalBar") {
      return (
        <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 38)}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <Tooltip
              formatter={(value, _name, entry) => {
                const payload = entry?.payload as { onTime?: number; total?: number } | undefined;
                return [
                  `${Number(value).toFixed(1)}% (${payload?.onTime ?? 0}/${payload?.total ?? 0})`,
                  "On-time",
                ];
              }}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} fill="#6366f1">
              {sorted.map((entry, i) => (
                <Cell key={i} fill={entry.percentage >= 90 ? "#22c55e" : entry.percentage >= 50 ? "#f59e0b" : "#ef4444"} />
              ))}
            </Bar>
            <ReferenceLine x={90} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={sorted} margin={{ left: 8, right: 16, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value, _name, entry) => {
                const payload = entry?.payload as { onTime?: number; total?: number } | undefined;
                return [
                  `${Number(value).toFixed(1)}% (${payload?.onTime ?? 0}/${payload?.total ?? 0})`,
                  "On-time",
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#6366f1" }}
              activeDot={{ r: 6 }}
            />
            <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "Target", position: "right", fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={sorted} margin={{ left: 8, right: 16, bottom: 40 }}>
            <defs>
              <linearGradient id={`grad-${view.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value, _name, entry) => {
                const payload = entry?.payload as { onTime?: number; total?: number } | undefined;
                return [
                  `${Number(value).toFixed(1)}% (${payload?.onTime ?? 0}/${payload?.total ?? 0})`,
                  "On-time",
                ];
              }}
            />
            <Area
              type="monotone"
              dataKey="percentage"
              stroke="#6366f1"
              strokeWidth={2}
              fill={`url(#grad-${view.id})`}
            />
            <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={sorted} margin={{ left: 8, right: 16, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value, _name, entry) => {
              const payload = entry?.payload as { onTime?: number; total?: number } | undefined;
              return [
                `${Number(value).toFixed(1)}% (${payload?.onTime ?? 0}/${payload?.total ?? 0})`,
                "On-time",
              ];
            }}
          />
          <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={entry.percentage >= 90 ? "#22c55e" : entry.percentage >= 50 ? "#f59e0b" : "#ef4444"} />
            ))}
          </Bar>
          <ReferenceLine y={90} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5} />
        </BarChart>
      </ResponsiveContainer>
    );
  }, [chartData, chartType, view.id]);

  return (
    <section className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,.65)] transition-shadow duration-300 hover:shadow-[0_22px_52px_-34px_rgba(91,33,182,.45)] dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-col gap-4 border-b border-violet-100 bg-linear-to-r from-violet-50/90 via-white to-fuchsia-50/40 px-5 py-4 dark:border-violet-900/50 dark:from-violet-950/35 dark:via-slate-950 dark:to-fuchsia-950/20">
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">Breakdown view</p>
          <h3 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">{view.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chartData.length} categories &middot; {totalAll.toLocaleString()} total applications
          </p>
        </div>
        <Badge className="border-0 bg-violet-100 text-[10px] text-violet-700 shadow-none dark:bg-violet-950 dark:text-violet-300">90% target{targetDaysLabel}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/80 p-1 dark:border-slate-800 dark:bg-slate-950/70" aria-label={`Chart type for ${view.label}`}>
          {CHART_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setChartType(opt.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-all duration-200",
                chartType === opt.id
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-600/20"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
              )}
              aria-pressed={chartType === opt.id}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 dark:border-violet-900/60 dark:bg-violet-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall</div>
            <div className="text-lg font-bold">{overallPct.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">On-time</div>
            <div className="text-lg font-bold">{totalOnTime.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 dark:border-sky-900/60 dark:bg-sky-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Best</div>
            <div className="text-sm font-semibold truncate" title={topPerformer?.name}>
              {topPerformer?.name ?? "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {topPerformer ? `${topPerformer.percentage.toFixed(1)}%` : ""}
            </div>
          </div>
        </div>

        {renderChart()}
      </div>
    </section>
  );
}

function SkeletonChartCard() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-[180px] rounded-lg" />
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg bg-muted/40 px-3 py-2 space-y-1.5">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    </div>
  );
}

export function MADrillDownModal({
  open,
  onOpenChange,
  data,
  drilldownSource = "medicine",
  filters,
}: MADrillDownModalProps) {
  const filterChipLabels = useMemo(() => getMAApiFilterChipLabels(filters), [filters]);

  const isKpi1 = data.kpiId === "MA-KPI-1";
  const isKpi2 = data.kpiId === "MA-KPI-2";
  const isKpi3 = data.kpiId === "MA-KPI-3";
  const isKpi4 = data.kpiId === "MA-KPI-4";
  const isKpi8 = data.kpiId === "MA-KPI-8";
  const usesStandardDrilldown = isKpi1 || isKpi2 || isKpi3 || isKpi4;
  const genericStandardKpiId = (isKpi1 || isKpi2 || isKpi3 || isKpi4
    ? data.kpiId
    : "MA-KPI-1") as MAKPIId;
  const { data: genericStandardApiData, loading: genericStandardLoading } =
    useMAProductStandardDrilldownData(
      drilldownSource,
      genericStandardKpiId,
      filters,
      open && usesStandardDrilldown
    );
  const { data: parApiData, loading: parLoading } = useMAProductParDrilldownData(
    drilldownSource,
    filters,
    open && isKpi8
  );

  const isLiveApiKpi = isKpi1 || isKpi2 || isKpi3 || isKpi4 || isKpi8;
  const kpiApiLoading =
    (usesStandardDrilldown && genericStandardLoading) || (isKpi8 && parLoading);

  const liveData = useMemo(() => {
    if (isKpi8 && parApiData?.data?.length) {
      return buildMAKpi8DrilldownData(parApiData.data, data);
    }
    if (usesStandardDrilldown && genericStandardApiData?.data?.length) {
      if (isKpi1) return buildMAKpi1DrilldownData(genericStandardApiData.data, data);
      if (isKpi2) return buildMAKpi2DrilldownData(genericStandardApiData.data, data);
      if (isKpi3) return buildMAKpi3DrilldownData(genericStandardApiData.data, data);
      if (isKpi4) return buildMAKpi4DrilldownData(genericStandardApiData.data, data);
    }
    return null;
  }, [
    isKpi1,
    isKpi2,
    isKpi3,
    isKpi4,
    genericStandardApiData,
    parApiData,
    usesStandardDrilldown,
    isKpi8,
    data,
  ]);

  const showLoading = isLiveApiKpi && kpiApiLoading;
  const resolvedData = liveData ?? (isLiveApiKpi ? null : data);
  const dimensionViews = useMemo(
    () => resolvedData?.dimensionViews ?? [],
    [resolvedData]
  );

  const formattedValue = useMemo(() => {
    if (!resolvedData) return null;
    const cv = resolvedData.currentValue;
    if (cv.percentage !== undefined) return `${cv.percentage.toFixed(1)}%`;
    if (cv.median !== undefined) return `${cv.median} days`;
    if (cv.average !== undefined) return `${cv.average.toFixed(1)} days`;
    return String(cv.value);
  }, [resolvedData]);

  const meetsTarget = (resolvedData?.currentValue.percentage ?? 0) >= 90;
  const headlineTargetDays = resolvedData?.currentValue.targetDays;

  const categoryChartDefaults = useMemo(
    () =>
      Object.fromEntries(
        dimensionViews.map((v) => [v.id, pickBestFitChart(v)])
      ) as Record<string, ChartType>,
    [dimensionViews]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-3xl border border-violet-200/70 bg-slate-50 p-0 shadow-[0_35px_100px_-30px_rgba(15,23,42,.65)] dark:border-violet-900/60 dark:bg-slate-950">
        {/* Fixed header */}
        <div className="relative shrink-0 overflow-hidden border-b border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_58%,#f0ebff_100%)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#15112a_58%,#1c1235_100%)]">
          <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border border-violet-300/30" />
          <div className="relative px-6 pb-5 pt-6">
            <DialogHeader className="mb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[.1em] text-white dark:bg-white dark:text-slate-950">{data.kpiId}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600 dark:text-violet-300">Performance explorer</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="max-w-4xl text-xl font-bold leading-tight tracking-[-.025em] sm:text-2xl">
                      {data.kpiName}
                    </DialogTitle>
                    {!showLoading && liveData && (
                      <MALiveIndicator variant="live" className="text-[10px]" />
                    )}
                  </div>
                  <DialogDescription className="mt-2 max-w-3xl text-sm">
                    Percentage means on-time cases divided by all completed cases. The day SLA is supplied by the report and may vary by pathway; the selected date basis defines which cases enter the period.
                  </DialogDescription>
                </div>
                {showLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading live data...
                  </div>
                )}
              </div>
            </DialogHeader>

            {/* Key metrics strip */}
            {showLoading ? (
              <div className="mt-4 flex flex-wrap gap-2 animate-pulse">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            ) : resolvedData && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className={cn(
                  "flex items-center gap-3 rounded-xl border bg-white/75 px-3 py-3 shadow-sm backdrop-blur dark:bg-slate-950/50",
                  meetsTarget
                    ? "border-emerald-200 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300"
                    : "border-amber-200 text-amber-700 dark:border-amber-900/70 dark:text-amber-300"
                )}>
                  {meetsTarget
                    ? <CheckCircle2Icon className="h-4 w-4" />
                    : <XCircleIcon className="h-4 w-4" />
                  }
                  <div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Current performance</p><p className="text-lg font-bold">{formattedValue}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-white/75 px-3 py-3 text-violet-700 shadow-sm dark:border-violet-900/70 dark:bg-slate-950/50 dark:text-violet-300">
                  <TargetIcon className="size-5" />
                  <div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Performance / day target</p><p className="text-lg font-bold">90%{headlineTargetDays != null ? ` · ${headlineTargetDays} days` : ""}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white/75 px-3 py-3 text-sky-700 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/50 dark:text-sky-300">
                  <ActivityIcon className="size-5" />
                  <div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">On-time volume</p><p className="text-lg font-bold">{resolvedData.currentValue.numerator.toLocaleString()} <span className="text-xs font-medium opacity-60">/ {resolvedData.currentValue.denominator.toLocaleString()}</span></p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-white/75 px-3 py-3 text-fuchsia-700 shadow-sm dark:border-fuchsia-900/70 dark:bg-slate-950/50 dark:text-fuchsia-300"><BarChart3Icon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Dimensions</p><p className="text-lg font-bold">{dimensionViews.length}</p></div></div>
              </div>
            )}

            {filterChipLabels.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {filterChipLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="gap-1 text-[11px]">
                    <CalendarDaysIcon className="h-3 w-3" />
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-6 py-6 dark:bg-slate-950">
          {showLoading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonChartCard key={i} />
              ))}
            </div>
          ) : dimensionViews.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center text-muted-foreground">
              <p>
                {isLiveApiKpi && !kpiApiLoading && !liveData
                  ? "The reporting API returned no rows for this KPI drill-down."
                  : "No category data available for this KPI."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {dimensionViews.map((view) => (
                <CategoryChartCard
                  key={view.id}
                  view={view}
                  defaultChartType={categoryChartDefaults[view.id] ?? "bar"}
                />
              ))}
            </div>
          )}

          {/* Export bar */}
          {dimensionViews.length > 0 && (
            <div className="mt-6 flex items-center justify-between rounded-xl border bg-muted/20 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing all {dimensionViews.length} categories with {dimensionViews.reduce((s, v) => s + v.data.length, 0)} total breakdown items
              </p>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <DownloadIcon className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
