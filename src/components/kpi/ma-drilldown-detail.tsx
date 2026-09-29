"use client";

import { downloadCsv } from "@/lib/export-csv";

import { useMemo } from "react";
import { DataChart } from "@/components/charts/data-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3Icon,
  DownloadIcon,
  ActivityIcon,
  TargetIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  CalendarDaysIcon,
} from "lucide-react";
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

interface MADrillDownDetailProps {
  data: KPIDrillDownData;
  drilldownSource?: MAReportProduct;
  /** Snapshot of page date filters at open time; fetch runs only while open. */
  filters?: MAApiFilterParams;
}

interface CategoryChartCardProps {
  view: KPIDimensionView;
  /** Rate is the Market Authorization card. Volume and days keep the same card for other measures. */
  chart?: "volume" | "days";
  /** Rate-card count caption. Market Authorization leaves this as on-time. */
  countLabel?: string;
  /** Rate-card chart series name. Market Authorization leaves this as on-time applications. */
  seriesLabel?: string;
}

export function CategoryChartCard({ view, chart, countLabel = "On-time", seriesLabel = "On-time applications" }: CategoryChartCardProps) {

  const chartData = useMemo(
    () =>
      view.data.map((item) => ({
        name: item.category,
        percentage: item.percentage ?? (item.total > 0 ? (item.count / item.total) * 100 : 0),
        onTime: item.count,
        total: item.total,
        measure: item.value,
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
  const recordCount = useMemo(() => chartData.reduce((sum, row) => sum + row.total, 0), [chartData]);
  const largest = useMemo(() => [...chartData].sort((a, b) => b.total - a.total)[0], [chartData]);
  const averageDays = useMemo(() => {
    const count = chartData.reduce((sum, row) => sum + row.onTime, 0);
    const weighted = chartData.reduce((sum, row) => sum + row.measure * row.onTime, 0);
    return count > 0 ? weighted / count : 0;
  }, [chartData]);
  const slowest = useMemo(() => [...chartData].sort((a, b) => b.measure - a.measure)[0], [chartData]);

  if (chart === "volume" || chart === "days") {
    const days = chart === "days";
    return (
      <section className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,.65)] transition-shadow duration-300 hover:shadow-[0_22px_52px_-34px_rgba(91,33,182,.45)] dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 border-b border-violet-100 bg-linear-to-r from-violet-50/90 via-white to-fuchsia-50/40 px-5 py-4 dark:border-violet-900/50 dark:from-violet-950/35 dark:via-slate-950 dark:to-fuchsia-950/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 w-full">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">Breakdown view</p>
              <h3 className="break-words text-base font-bold tracking-tight text-slate-900 dark:text-white">{view.label}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {chartData.length} categories &middot; {(days ? chartData.reduce((sum, row) => sum + row.onTime, 0) : recordCount).toLocaleString()} {days ? "applications" : "records"}
              </p>
            </div>
            <Badge className="border-0 bg-violet-100 text-[10px] text-violet-700 shadow-none dark:bg-violet-950 dark:text-violet-300">
              {days ? (targetDays.length === 1 ? `Target ${targetDays[0]} days` : "Average days") : "Record count"}
            </Badge>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 dark:border-violet-900/60 dark:bg-violet-950/25">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{days ? "Average" : "Records"}</div>
              <div className="text-lg font-bold">{days ? `${averageDays.toFixed(1)} days` : recordCount.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/25">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{days ? "Applications" : "Categories"}</div>
              <div className="text-lg font-bold">{days ? chartData.reduce((sum, row) => sum + row.onTime, 0).toLocaleString() : chartData.length.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 dark:border-sky-900/60 dark:bg-sky-950/25">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{days ? "Slowest" : "Largest"}</div>
              <div className="text-sm font-semibold truncate" title={days ? slowest?.name : largest?.name}>
                {(days ? slowest?.name : largest?.name) ?? "—"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {days && slowest ? `${slowest.measure.toFixed(1)} days` : largest ? largest.total.toLocaleString() : ""}
              </div>
            </div>
          </div>
          <DataChart
            data={chartData.map(row => ({ name: row.name, value: days ? row.measure : row.total > 0 ? row.total : null }))}
            label={days ? "Average days" : "Records"}
            unit={days ? " days" : ""}
            additive={!days}
            ordered={/time band|processing time|month|quarter|year|status/i.test(view.label)}
            defaultType="bar"
            target={days && targetDays.length === 1 ? targetDays[0] : undefined}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,.65)] transition-shadow duration-300 hover:shadow-[0_22px_52px_-34px_rgba(91,33,182,.45)] dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-col gap-4 border-b border-violet-100 bg-linear-to-r from-violet-50/90 via-white to-fuchsia-50/40 px-5 py-4 dark:border-violet-900/50 dark:from-violet-950/35 dark:via-slate-950 dark:to-fuchsia-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">Breakdown view</p>
          <h3 className="break-words text-base font-bold tracking-tight text-slate-900 dark:text-white">{view.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chartData.length} categories &middot; {totalAll.toLocaleString()} total applications
          </p>
        </div>
        <Badge className="border-0 bg-violet-100 text-[10px] text-violet-700 shadow-none dark:bg-violet-950 dark:text-violet-300">90% target{targetDaysLabel}</Badge>
        </div>

      </div>

      <div className="px-5 py-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 dark:border-violet-900/60 dark:bg-violet-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall</div>
            <div className="text-lg font-bold">{overallPct.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{countLabel}</div>
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

        <DataChart
          data={chartData.map(row => ({ name: row.name, value: /time band|processing time/i.test(view.label) ? row.total : row.total > 0 ? row.percentage : null }))}
          label={/time band|processing time/i.test(view.label) ? "Applications" : seriesLabel}
          unit={/time band|processing time/i.test(view.label) ? "" : "%"}
          additive={/time band|processing time/i.test(view.label)}
          ordered={/time band|processing time|month|quarter|year/i.test(view.label)}
          defaultType="bar"
          target={/time band|processing time/i.test(view.label) ? undefined : 90}
        />
      </div>
    </section>
  );
}

export function SkeletonChartCard() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
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

export function MADrillDownDetail({
  data,
  drilldownSource = "medicine",
  filters,
}: MADrillDownDetailProps) {
  const filterChipLabels = useMemo(() => {
    const labels = getMAApiFilterChipLabels(filters);
    if (labels.length > 0) {
      labels[0] = data.kpiId === "MA-KPI-8" ? "Filtered by grant decision date" : "Filtered by submission date";
    }
    return labels;
  }, [filters, data.kpiId]);

  const isKpi1 = data.kpiId === "MA-KPI-1";
  const isKpi2 = data.kpiId === "MA-KPI-2";
  const isKpi3 = data.kpiId === "MA-KPI-3";
  const isKpi4 = data.kpiId === "MA-KPI-4";
  const isKpi8 = data.kpiId === "MA-KPI-8";
  const usesStandardDrilldown = isKpi1 || isKpi2 || isKpi3 || isKpi4;
  const genericStandardKpiId = (isKpi1 || isKpi2 || isKpi3 || isKpi4
    ? data.kpiId
    : "MA-KPI-1") as MAKPIId;
  const { data: genericStandardApiData, loading: genericStandardLoading, error: standardError } =
    useMAProductStandardDrilldownData(
      drilldownSource,
      genericStandardKpiId,
      filters,
      usesStandardDrilldown
    );
  const { data: parApiData, loading: parLoading, error: parError } = useMAProductParDrilldownData(
    drilldownSource,
    filters,
    isKpi8
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

  return (
      <article className="min-w-0 overflow-hidden rounded-2xl border border-violet-200/70 bg-slate-50 shadow-sm dark:border-violet-900/60 dark:bg-slate-950">
        {/* Fixed header */}
        <div className="relative shrink-0 overflow-hidden border-b border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_58%,#f0ebff_100%)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#15112a_58%,#1c1235_100%)]">
          <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border border-violet-300/30" />
          <div className="relative px-4 pb-5 pt-6 sm:px-6">
            <header className="mb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[.1em] text-white dark:bg-white dark:text-slate-950">{data.kpiId}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600 dark:text-violet-300">Performance explorer</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="max-w-4xl text-xl font-bold leading-tight tracking-[-.025em] sm:text-2xl">
                      {data.kpiName}
                    </h1>
                    {!showLoading && liveData && (
                      <MALiveIndicator variant="live" className="text-[10px]" />
                    )}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm">
                    Percentage means on-time cases divided by all completed cases. The day SLA is supplied by the report and may vary by pathway; the selected date basis defines which cases enter the period.
                  </p>
                </div>
                {showLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading live data...
                  </div>
                )}
              </div>
            </header>

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
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        {(standardError || parError) && <p role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The reporting service could not load this drilldown. Please refresh to try again.</p>}
        {/* Detail content */}
        <div className="min-w-0 bg-slate-50/80 px-3 py-5 sm:px-6 sm:py-6 dark:bg-slate-950">
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
                />
              ))}
            </div>
          )}

          {/* Export bar */}
          {dimensionViews.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing all {dimensionViews.length} categories with {dimensionViews.reduce((s, v) => s + v.data.length, 0)} total breakdown items
              </p>
              <Button variant="outline" size="sm" className="min-h-10 gap-1.5 text-xs" onClick={() => downloadCsv(data.kpiId + "-breakdown.csv", dimensionViews.flatMap(view => view.data.map(row => ({ dimension: view.label, ...row }))))}>
                <DownloadIcon className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          )}
        </div>
      </article>
  );
}
