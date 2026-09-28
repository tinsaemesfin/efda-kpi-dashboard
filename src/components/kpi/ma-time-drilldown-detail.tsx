"use client";

import { downloadCsv } from "@/lib/export-csv";

import { combineTimeDistributions } from "@/lib/ma-api/distribution";

import { useMemo, useState } from "react";
import { DataChart } from "@/components/charts/data-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableFullscreen } from "@/components/ui/table-fullscreen";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MALiveIndicator } from "@/components/kpi/ma-live-indicator";
import { cn } from "@/lib/utils";
import type {
  MATimeDrillDownCategoryView,
  MATimeDrillDownData,
  MATimeDrillDownItem,
} from "@/types/ma-drilldown";
import type { MAApiAverageDrilldownRow, MAApiFilterParams, MAApiMedianDrilldownRow, MAReportProduct } from "@/types/ma-api";
import { useMAProductTimeDrilldownData } from "@/hooks/useMAApi";
import {
  buildMAKpi6DrilldownData,
  buildMAKpi7DrilldownData,
} from "@/lib/ma-api/time-drilldown";
import { getMAApiFilterChipLabels } from "@/lib/ma-api/filter-labels";
import {
  BarChart3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  ActivityIcon,
  ClockIcon,
  TargetIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  InfoIcon,
  TableIcon,
} from "lucide-react";
type ViewMode = "chart" | "table";

const EXTREME_OUTLIER_TOOLTIP =
  "Cases where decision time exceeds 200% of the target days (2× target) are classified as extreme outliers.";

interface MATimeDrillDownDetailProps {
  data: MATimeDrillDownData;
  product?: MAReportProduct;
  /** Snapshot of page date filters at open time; fetch runs only while open. */
  filters?: MAApiFilterParams;
}

interface TimeChartRow {
  name: string;
  decisionDays: number | null;
  percentage: number;
  onTime: number;
  total: number;
  targetDays: number;
  maxDecisionDays?: number | null;
  extremeOutlierCount?: number | null;
  extremeOutlierPct?: number | null;
  p25Days?: number | null;
  p75Days?: number | null;
  p90Days?: number | null;
  iqrDays?: number | null;
  meanMedianSkewDays?: number | null;
  [key: string]: string | number | null | undefined;
}

function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function ColumnHeaderWithTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`About ${label}`}
          >
            <InfoIcon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function TimeCategoryTableCard({
  view,
  metricType,
}: {
  view: MATimeDrillDownCategoryView;
  metricType: "median" | "average";
}) {
  const metricLabel = metricType === "median" ? "Median Days" : "Avg Days";
  const totalApps = view.items.reduce((sum, item) => sum + item.totalCount, 0);
  const totalOnTime = view.items.reduce((sum, item) => sum + item.onTimeCount, 0);
  const overallPct = totalApps > 0 ? (totalOnTime / totalApps) * 100 : 0;

  const fastestPerformer = useMemo(
    () =>
      [...view.items]
        .filter((item) => item.decisionDays != null)
        .sort((a, b) => (a.decisionDays ?? Infinity) - (b.decisionDays ?? Infinity))[0],
    [view.items]
  );

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="border-b bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 w-full">
            <h3 className="text-sm font-semibold tracking-tight">{view.label}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {view.items.length} values &middot; {totalApps.toLocaleString()} applications
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[11px]">
              {overallPct.toFixed(1)}% on-time
            </Badge>
            {fastestPerformer && (
              <Badge variant="outline" className="text-[11px] max-w-[200px] truncate">
                Fastest: {fastestPerformer.category} ({formatDays(fastestPerformer.decisionDays)}d)
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-2 py-3 sm:px-4">
        <TableFullscreen title={view.label} description={`${view.items.length} values · ${totalApps.toLocaleString()} applications`}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[140px]">Category</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">On-time</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">{metricLabel}</TableHead>
                  {metricType === "average" ? (
                    <>
                      <TableHead className="text-right">Max Days</TableHead>
                      <TableHead className="text-right">
                        <ColumnHeaderWithTooltip label="Outliers" tooltip={EXTREME_OUTLIER_TOOLTIP} />
                      </TableHead>
                      <TableHead className="text-right">
                        <ColumnHeaderWithTooltip label="Outlier %" tooltip={EXTREME_OUTLIER_TOOLTIP} />
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right">P25</TableHead>
                      <TableHead className="text-right">P75</TableHead>
                      <TableHead className="text-right">P90</TableHead>
                      <TableHead className="text-right">IQR</TableHead>
                      <TableHead className="text-right">Skew</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.items.map((item) => (
                  <TimeDetailsRow
                    key={item.category}
                    item={item}
                    metricType={metricType}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </TableFullscreen>
      </div>
    </div>
  );
}

interface TimeCategoryChartCardProps {
  view: MATimeDrillDownCategoryView;
  metricType: "median" | "average";
  targetDays: number;
}

function TimeCategoryChartCard({
  view,
  metricType,
  targetDays,
}: TimeCategoryChartCardProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const metricLabel = metricType === "median" ? "Median" : "Average";

  const chartData = useMemo<TimeChartRow[]>(
    () =>
      view.items.map((item) => ({
        name: item.category,
        decisionDays: item.decisionDays,
        percentage: item.percentage,
        onTime: item.onTimeCount,
        total: item.totalCount,
        targetDays: item.targetDays,
        maxDecisionDays: item.maxDecisionDays,
        extremeOutlierCount: item.extremeOutlierCount,
        extremeOutlierPct: item.extremeOutlierPct,
        p25Days: item.p25Days,
        p75Days: item.p75Days,
        p90Days: item.p90Days,
        iqrDays: item.iqrDays,
        meanMedianSkewDays: item.meanMedianSkewDays,
      })),
    [view.items]
  );

  const fastestPerformer = useMemo(
    () =>
      [...chartData]
        .filter((item) => item.decisionDays != null && Number.isFinite(item.decisionDays))
        .sort((a, b) => (a.decisionDays ?? Infinity) - (b.decisionDays ?? Infinity))[0],
    [chartData]
  );

  const totalOnTime = useMemo(() => chartData.reduce((s, d) => s + d.onTime, 0), [chartData]);
  const totalAll = useMemo(() => chartData.reduce((s, d) => s + d.total, 0), [chartData]);
  const overallPct = totalAll > 0 ? (totalOnTime / totalAll) * 100 : 0;
  const viewTargetDays = useMemo(
    () => [...new Set(chartData.map((item) => item.targetDays).filter((value) => value > 0))],
    [chartData]
  );
  const chartTargetDays = viewTargetDays.length === 1 ? viewTargetDays[0] : targetDays;
  const targetLabel = viewTargetDays.length === 1 ? `Target ${chartTargetDays} days` : "Mixed SLA targets";

  return (
    <section className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,.65)] transition-shadow duration-300 hover:shadow-[0_22px_52px_-34px_rgba(91,33,182,.45)] dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-col gap-4 border-b border-violet-100 bg-linear-to-r from-violet-50/90 via-white to-sky-50/40 px-5 py-4 dark:border-violet-900/50 dark:from-violet-950/35 dark:via-slate-950 dark:to-sky-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">Cycle-time view</p>
          <h3 className="break-words text-base font-bold tracking-tight text-slate-900 dark:text-white">{view.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chartData.length} categories &middot; {totalAll.toLocaleString()} total applications
          </p>
        </div>
        <Badge className="border-0 bg-violet-100 text-[10px] text-violet-700 shadow-none dark:bg-violet-950 dark:text-violet-300">{targetLabel} · 90% performance target</Badge>
        </div>

      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 dark:border-violet-900/60 dark:bg-violet-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall</div>
            <div className="text-lg font-bold">{overallPct.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">On-time</div>
            <div className="text-lg font-bold">{totalOnTime.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 dark:border-sky-900/60 dark:bg-sky-950/25">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fastest</div>
            <div className="text-sm font-semibold truncate" title={fastestPerformer?.name}>
              {fastestPerformer?.name ?? "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {fastestPerformer ? `${formatDays(fastestPerformer.decisionDays)} days` : ""}
            </div>
          </div>
        </div>

        <DataChart
          data={chartData.map(row => ({ name: row.name, value: /time band/i.test(view.label) ? row.total : row.decisionDays }))}
          label={/time band/i.test(view.label) ? "Applications" : `${metricLabel} processing time`}
          unit={/time band/i.test(view.label) ? "" : " days"}
          additive={/time band/i.test(view.label)}
          ordered={/time band|month|quarter|year/i.test(view.label)}
          defaultType="bar"
          target={/time band/i.test(view.label) || viewTargetDays.length > 1 ? undefined : chartTargetDays}
        />

        <div className="mt-4 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1.5 text-xs text-muted-foreground"
            onClick={() => setDetailsExpanded((prev) => !prev)}
          >
            {detailsExpanded ? (
              <ChevronUpIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            )}
            {detailsExpanded ? "Hide detailed table" : "Show detailed table"}
          </Button>

          {detailsExpanded && (
            <div className="mt-2">
              <TableFullscreen title={`${view.label} details`} description={`${view.items.length} categories`}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">On-time</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">{metricLabel} Days</TableHead>
                        {metricType === "average" ? (
                          <>
                            <TableHead className="text-right">Max Days</TableHead>
                            <TableHead className="text-right">
                              <ColumnHeaderWithTooltip label="Outliers" tooltip={EXTREME_OUTLIER_TOOLTIP} />
                            </TableHead>
                            <TableHead className="text-right">
                              <ColumnHeaderWithTooltip label="Outlier %" tooltip={EXTREME_OUTLIER_TOOLTIP} />
                            </TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-right">P25</TableHead>
                            <TableHead className="text-right">P75</TableHead>
                            <TableHead className="text-right">P90</TableHead>
                            <TableHead className="text-right">IQR</TableHead>
                            <TableHead className="text-right">Skew</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {view.items.map((item) => (
                        <TimeDetailsRow
                          key={item.category}
                          item={item}
                          metricType={metricType}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TableFullscreen>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TimeDetailsRow({
  item,
  metricType,
}: {
  item: MATimeDrillDownItem;
  metricType: "median" | "average";
}) {
  const pctTone =
    item.percentage >= 90
      ? "text-emerald-600 dark:text-emerald-400"
      : item.percentage >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const daysTone =
    item.decisionDays == null
      ? "text-muted-foreground"
      : item.decisionDays <= item.targetDays
        ? "text-emerald-600 dark:text-emerald-400"
        : item.decisionDays <= item.targetDays * 1.5
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  return (
    <TableRow>
      <TableCell className="font-medium max-w-[180px]">
        <span className="line-clamp-2" title={item.category}>
          {item.category}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">{item.targetDays}d</TableCell>
      <TableCell className="text-right tabular-nums">
        {item.onTimeCount.toLocaleString()}/{item.totalCount.toLocaleString()}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums font-medium", pctTone)}>
        {formatPct(item.percentage)}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums font-semibold", daysTone)}>
        {formatDays(item.decisionDays)}
      </TableCell>
      {metricType === "average" ? (
        <>
          <TableCell className="text-right tabular-nums text-muted-foreground">
            {formatDays(item.maxDecisionDays)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {(item.extremeOutlierCount ?? 0).toLocaleString()}
          </TableCell>
          <TableCell
            className={cn(
              "text-right tabular-nums",
              (item.extremeOutlierPct ?? 0) > 0
                ? "text-amber-600 dark:text-amber-400 font-medium"
                : "text-muted-foreground"
            )}
          >
            {formatPct(item.extremeOutlierPct)}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="text-right tabular-nums text-muted-foreground">
            {formatDays(item.p25Days)}
          </TableCell>
          <TableCell className="text-right tabular-nums text-muted-foreground">
            {formatDays(item.p75Days)}
          </TableCell>
          <TableCell className="text-right tabular-nums text-muted-foreground">
            {formatDays(item.p90Days)}
          </TableCell>
          <TableCell className="text-right tabular-nums text-muted-foreground">
            {formatDays(item.iqrDays)}
          </TableCell>
          <TableCell className="text-right tabular-nums text-muted-foreground">
            {formatDays(item.meanMedianSkewDays)}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

function SkeletonTableCard() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-pulse">
      <div className="border-b bg-muted/30 px-5 py-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function SkeletonChartCard() {
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

export function MATimeDrillDownDetail({
  data,
  product = "medicine",
  filters,
}: MATimeDrillDownDetailProps) {

  const isMedian = data.kpiId === "MA-KPI-6";

  const { data: timeApiData, loading: timeLoading, error: timeError } = useMAProductTimeDrilldownData(
    product,
    isMedian ? "MA-KPI-6" : "MA-KPI-7",
    filters,
    true
  );

  // Both reports describe the same population. Legacy average responses lack
  // quartiles, so obtain them from the paired median report using identical filters.
  const companion = useMAProductTimeDrilldownData(
    product, isMedian ? "MA-KPI-7" : "MA-KPI-6", filters, true
  );
  const showLoading = timeLoading || companion.loading;
  const liveData = useMemo(() => {
    if (!timeApiData?.data?.length) return null;
    const primary = isMedian
      ? buildMAKpi6DrilldownData(timeApiData.data as MAApiMedianDrilldownRow[], data)
      : buildMAKpi7DrilldownData(timeApiData.data as MAApiAverageDrilldownRow[], data);
    if (!companion.data?.data?.length) return primary;
    const paired = isMedian
      ? buildMAKpi7DrilldownData(companion.data.data as MAApiAverageDrilldownRow[])
      : buildMAKpi6DrilldownData(companion.data.data as MAApiMedianDrilldownRow[]);
    return combineTimeDistributions(primary, paired);
  }, [isMedian, timeApiData, companion.data, data]);

  return <MATimeDrillDownView data={data} liveData={liveData} showLoading={showLoading} timeError={timeError ?? companion.error} filters={filters} />;
}

/** Presentational view; the route's data container owns authentication and fetching. */
export function MATimeDrillDownView({ data, liveData, showLoading, timeError, filters }: {
  data: MATimeDrillDownData;
  liveData: MATimeDrillDownData | null;
  showLoading: boolean;
  timeError: Error | null;
  filters?: MAApiFilterParams;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const filterChipLabels = useMemo(() => {
    const labels = getMAApiFilterChipLabels(filters);
    if (labels.length > 0) labels[0] = "Filtered by completion decision date";
    return labels;
  }, [filters]);
  const isMedian = data.kpiId === "MA-KPI-6";
  const resolvedData = liveData ?? data;
  const categoryViews = resolvedData.categoryViews;
  const targetDays = resolvedData.currentValue.targetDays ?? 270;

  const anchorView = useMemo(
    () =>
      categoryViews.find((view) => view.label.toLowerCase() === "application type") ??
      categoryViews[0],
    [categoryViews]
  );

  const onTimeNumerator = useMemo(
    () => anchorView?.items.reduce((sum, item) => sum + item.onTimeCount, 0) ?? 0,
    [anchorView]
  );
  const onTimeDenominator = useMemo(
    () => anchorView?.items.reduce((sum, item) => sum + item.totalCount, 0) ?? 0,
    [anchorView]
  );
  const onTimePercentage = onTimeDenominator > 0
    ? (onTimeNumerator / onTimeDenominator) * 100
    : 0;

  const headlineDays =
    resolvedData.currentValue.median ??
    resolvedData.currentValue.average ??
    resolvedData.currentValue.value;

  const formattedValue = `${formatDays(headlineDays)} days`;
  const meetsTarget = headlineDays <= targetDays;
  const daysGap = Math.max(0, headlineDays - targetDays);

  return (
      <article className="min-w-0 overflow-hidden rounded-2xl border border-violet-200/70 bg-slate-50 shadow-sm dark:border-violet-900/60 dark:bg-slate-950">
        <div className="relative shrink-0 overflow-hidden border-b border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_58%,#f0ebff_100%)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#15112a_58%,#1c1235_100%)]">
          <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border border-violet-300/30" />
          <div className="relative px-4 pb-5 pt-6 sm:px-6">
            <header className="mb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[.1em] text-white dark:bg-white dark:text-slate-950">{data.kpiId}</span><span className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600 dark:text-violet-300">Cycle-time explorer</span></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="max-w-4xl text-xl font-bold leading-tight tracking-[-.025em] sm:text-2xl">
                      {data.kpiName}
                    </h1>
                    {!showLoading && liveData && (
                      <MALiveIndicator variant="live" className="text-[10px]" />
                    )}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm">
                    Processing days are compared with each row&apos;s regulatory SLA. On-time percentage is on-time cases divided by all completed cases; the selected date basis defines which cases enter the period.
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

            {showLoading ? (
              <div className="mt-4 flex flex-wrap gap-2 animate-pulse">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            ) : liveData ? (
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-white/75 px-3 py-3 shadow-sm backdrop-blur dark:bg-slate-950/50",
                    meetsTarget
                      ? "border-emerald-200 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300"
                      : "border-amber-200 text-amber-700 dark:border-amber-900/70 dark:text-amber-300"
                  )}
                >
                  {meetsTarget ? (
                    <CheckCircle2Icon className="h-4 w-4" />
                  ) : (
                    <XCircleIcon className="h-4 w-4" />
                  )}
                  <div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Current time</p><p className="text-lg font-bold">{formattedValue}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-white/75 px-3 py-3 text-violet-700 shadow-sm dark:border-violet-900/70 dark:bg-slate-950/50 dark:text-violet-300">
                  <TargetIcon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Target</p><p className="text-lg font-bold">{targetDays} days</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white/75 px-3 py-3 text-sky-700 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/50 dark:text-sky-300">
                  <ActivityIcon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">On-time performance</p><p className="text-lg font-bold">{onTimePercentage.toFixed(1)}% <span className="text-xs font-medium opacity-60">({onTimeNumerator.toLocaleString()} / {onTimeDenominator.toLocaleString()})</span></p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-white/75 px-3 py-3 text-fuchsia-700 shadow-sm dark:border-fuchsia-900/70 dark:bg-slate-950/50 dark:text-fuchsia-300">
                  <BarChart3Icon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Dimensions</p><p className="text-lg font-bold">{categoryViews.length}</p></div>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-white/75 px-3 py-3 shadow-sm dark:bg-slate-950/50",
                    daysGap > 0
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  <ClockIcon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Gap</p><p className="text-lg font-bold">{formatDays(daysGap)} days</p></div>
                </div>
                {!isMedian && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                    <InfoIcon className="h-3.5 w-3.5" />
                    Outliers: &gt;200% target days
                  </div>
                )}
              </div>
            ) : <p className="mt-5 text-sm text-muted-foreground">No live processing-time summary is available for this period.</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-violet-200 bg-white/70 p-1 dark:border-violet-900/60 dark:bg-slate-950/50">
                <button
                  type="button"
                  onClick={() => setViewMode("chart")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    viewMode === "chart"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <BarChart3Icon className="h-3.5 w-3.5" />
                  Chart
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    viewMode === "table"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Table
                </button>
              </div>
              {filterChipLabels.map((label) => (
                <Badge key={label} variant="secondary" className="gap-1 text-[11px]">
                  <CalendarDaysIcon className="h-3 w-3" />
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {timeError && <p role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The reporting service could not load processing times. Please refresh to try again.</p>}
        <div className="min-w-0 bg-slate-50/80 px-3 py-5 sm:px-6 sm:py-6 dark:bg-slate-950">
          {showLoading ? (
            viewMode === "chart" ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonChartCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonTableCard key={i} />
                ))}
              </div>
            )
          ) : categoryViews.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center text-muted-foreground">
              <p>
                {!showLoading && !liveData
                  ? "The reporting API returned no rows for this KPI drill-down."
                  : "No category data available for this KPI."}
              </p>
            </div>
          ) : viewMode === "table" ? (
            <div className="grid gap-5">
              {categoryViews.map((view) => (
                <TimeCategoryTableCard
                  key={view.id}
                  view={view}
                  metricType={resolvedData.metricType}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {categoryViews.map((view) => (
                <TimeCategoryChartCard
                  key={view.id}
                  view={view}
                  metricType={resolvedData.metricType}
                  targetDays={targetDays}
                />
              ))}
            </div>
          )}

          {categoryViews.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing all {categoryViews.length} categories with{" "}
                {categoryViews.reduce((s, v) => s + v.items.length, 0)} total breakdown items
              </p>
              <Button variant="outline" size="sm" className="min-h-10 gap-1.5 text-xs" onClick={() => downloadCsv(data.kpiId + "-processing-time.csv", categoryViews.flatMap(view => view.items.map(row => ({ dimension: view.label, metric: resolvedData.metricType, ...row }))))}>
                <DownloadIcon className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          )}
        </div>
      </article>
  );
}
