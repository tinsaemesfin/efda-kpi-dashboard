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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  PieChartIcon,
  TrendingUpIcon,
  AreaChartIcon,
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";

type ChartType = "bar" | "column" | "horizontalBar" | "line" | "area" | "pie" | "doughnut";
type ViewMode = "chart" | "table";

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

const EXTREME_OUTLIER_TOOLTIP =
  "Cases where decision time exceeds 200% of the target days (2× target) are classified as extreme outliers.";

interface MATimeDrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MATimeDrillDownData;
  product?: MAReportProduct;
  /** Snapshot of page date filters at open time; fetch runs only while open. */
  filters?: MAApiFilterParams;
}

interface TimeChartRow {
  name: string;
  decisionDays: number;
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

function daysBarColor(days: number, targetDays: number): string {
  if (days <= targetDays) return "#22c55e";
  if (days <= targetDays * 1.5) return "#f59e0b";
  return "#ef4444";
}

function pickBestFitChart(view: MATimeDrillDownCategoryView): ChartType {
  const count = view.items.length;
  const label = view.label.toLowerCase();

  if (label.includes("internal regulatory pathway")) return "bar";
  if (label.includes("decision time band")) return "pie";
  if (label.includes("regulatory outcome")) return "line";
  if (label.includes("reliance pathway")) return "bar";
  if (count <= 4) return "doughnut";
  if (count <= 6) return "bar";
  return "horizontalBar";
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

function buildTimeChartTooltip(
  metricType: "median" | "average",
  metricLabel: string
) {
  return function TimeChartTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: TimeChartRow }>;
  }) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;

    return (
      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
        <p className="mb-1 font-semibold">{row.name}</p>
        <p>
          {metricLabel}: <span className="font-medium">{formatDays(row.decisionDays)} days</span>
        </p>
        <p>Row SLA: {formatDays(row.targetDays)} days</p>
        <p>
          On-time: {row.onTime}/{row.total} ({formatPct(row.percentage)})
        </p>
        {metricType === "average" && (
          <>
            <p>Max days: {formatDays(row.maxDecisionDays)}</p>
            <p>
              Extreme outliers: {(row.extremeOutlierCount ?? 0).toLocaleString()} (
              {formatPct(row.extremeOutlierPct)})
            </p>
            <p className="mt-1 text-muted-foreground">{EXTREME_OUTLIER_TOOLTIP}</p>
          </>
        )}
        {metricType === "median" && (
          <>
            <p>P25 / P75: {formatDays(row.p25Days)} / {formatDays(row.p75Days)}</p>
            <p>P90: {formatDays(row.p90Days)} · IQR: {formatDays(row.iqrDays)}</p>
            <p>Mean–median skew: {formatDays(row.meanMedianSkewDays)} days</p>
          </>
        )}
      </div>
    );
  };
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
          <div className="min-w-0">
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
    </div>
  );
}

interface TimeCategoryChartCardProps {
  view: MATimeDrillDownCategoryView;
  defaultChartType: ChartType;
  metricType: "median" | "average";
  targetDays: number;
}

function TimeCategoryChartCard({
  view,
  defaultChartType,
  metricType,
  targetDays,
}: TimeCategoryChartCardProps) {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const metricLabel = metricType === "median" ? "Median" : "Average";
  const ChartTooltip = useMemo(
    () => buildTimeChartTooltip(metricType, metricLabel),
    [metricType, metricLabel]
  );

  const chartData = useMemo<TimeChartRow[]>(
    () =>
      view.items.map((item) => ({
        name: item.category,
        decisionDays: item.decisionDays ?? 0,
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
        .filter((item) => item.decisionDays > 0)
        .sort((a, b) => a.decisionDays - b.decisionDays)[0],
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

  const daysDomainMax = useMemo(() => {
    const maxDays = Math.max(
      chartTargetDays * 1.2,
      ...chartData.map((d) => d.decisionDays || 0)
    );
    return Math.ceil(maxDays / 50) * 50;
  }, [chartData, chartTargetDays]);

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
            <RechartsTooltip
              formatter={(_value, _name, entry) => {
                const payload = entry?.payload as TimeChartRow | undefined;
                if (!payload) return ["No data", "Value"];
                return [
                  `${payload.onTime}/${payload.total} · ${formatDays(payload.decisionDays)} days`,
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
            <XAxis type="number" domain={[0, daysDomainMax]} tickFormatter={(v) => `${v}d`} />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <RechartsTooltip content={<ChartTooltip />} />
            <Bar dataKey="decisionDays" radius={[0, 4, 4, 0]}>
              {sorted.map((entry, i) => (
                <Cell key={i} fill={daysBarColor(entry.decisionDays, entry.targetDays)} />
              ))}
            </Bar>
            <ReferenceLine x={chartTargetDays} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5} />
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
            <YAxis domain={[0, daysDomainMax]} tickFormatter={(v) => `${v}d`} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="decisionDays"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#6366f1" }}
              activeDot={{ r: 6 }}
            />
            <ReferenceLine
              y={chartTargetDays}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{ value: "Target", position: "right", fontSize: 11 }}
            />
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
            <YAxis domain={[0, daysDomainMax]} tickFormatter={(v) => `${v}d`} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="decisionDays"
              stroke="#6366f1"
              strokeWidth={2}
              fill={`url(#grad-${view.id})`}
            />
            <ReferenceLine y={chartTargetDays} stroke="#22c55e" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={sorted} margin={{ left: 8, right: 16, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis domain={[0, daysDomainMax]} tickFormatter={(v) => `${v}d`} />
          <RechartsTooltip content={<ChartTooltip />} />
          <Bar dataKey="decisionDays" radius={[4, 4, 0, 0]}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={daysBarColor(entry.decisionDays, entry.targetDays)} />
            ))}
          </Bar>
          <ReferenceLine y={chartTargetDays} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5} />
        </BarChart>
      </ResponsiveContainer>
    );
  }, [chartData, chartType, view.id, chartTargetDays, daysDomainMax, ChartTooltip]);

  return (
    <section className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,.65)] transition-shadow duration-300 hover:shadow-[0_22px_52px_-34px_rgba(91,33,182,.45)] dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-col gap-4 border-b border-violet-100 bg-linear-to-r from-violet-50/90 via-white to-sky-50/40 px-5 py-4 dark:border-violet-900/50 dark:from-violet-950/35 dark:via-slate-950 dark:to-sky-950/20">
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">Cycle-time view</p>
          <h3 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">{view.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chartData.length} categories &middot; {totalAll.toLocaleString()} total applications
          </p>
        </div>
        <Badge className="border-0 bg-violet-100 text-[10px] text-violet-700 shadow-none dark:bg-violet-950 dark:text-violet-300">{targetLabel} · 90% performance target</Badge>
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

        {renderChart()}

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
            <div className="mt-2 overflow-x-auto">
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

export function MATimeDrillDownModal({
  open,
  onOpenChange,
  data,
  product = "medicine",
  filters,
}: MATimeDrillDownModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const filterChipLabels = useMemo(() => getMAApiFilterChipLabels(filters), [filters]);

  const isMedian = data.kpiId === "MA-KPI-6";

  const { data: timeApiData, loading: timeLoading } = useMAProductTimeDrilldownData(
    product,
    isMedian ? "MA-KPI-6" : "MA-KPI-7",
    filters,
    open
  );

  const showLoading = timeLoading;

  const liveData = useMemo(() => {
    if (isMedian && timeApiData?.data?.length) {
      return buildMAKpi6DrilldownData(timeApiData.data as MAApiMedianDrilldownRow[], data);
    }
    if (!isMedian && timeApiData?.data?.length) {
      return buildMAKpi7DrilldownData(timeApiData.data as MAApiAverageDrilldownRow[], data);
    }
    return null;
  }, [isMedian, timeApiData, data]);

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

  const categoryChartDefaults = useMemo(
    () =>
      Object.fromEntries(
        categoryViews.map((v) => [v.id, pickBestFitChart(v)])
      ) as Record<string, ChartType>,
    [categoryViews]
  );

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setViewMode("chart");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-3xl border border-violet-200/70 bg-slate-50 p-0 shadow-[0_35px_100px_-30px_rgba(15,23,42,.65)] dark:border-violet-900/60 dark:bg-slate-950">
        <div className="relative shrink-0 overflow-hidden border-b border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_58%,#f0ebff_100%)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#15112a_58%,#1c1235_100%)]">
          <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border border-violet-300/30" />
          <div className="relative px-6 pb-5 pt-6">
            <DialogHeader className="mb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[.1em] text-white dark:bg-white dark:text-slate-950">{data.kpiId}</span><span className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600 dark:text-violet-300">Cycle-time explorer</span></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="max-w-4xl text-xl font-bold leading-tight tracking-[-.025em] sm:text-2xl">
                      {data.kpiName}
                    </DialogTitle>
                    {!showLoading && liveData && (
                      <MALiveIndicator variant="live" className="text-[10px]" />
                    )}
                  </div>
                  <DialogDescription className="mt-2 max-w-3xl text-sm">
                    Processing days are compared with each row&apos;s regulatory SLA. On-time percentage is on-time cases divided by all completed cases; the selected date basis defines which cases enter the period.
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

            {showLoading ? (
              <div className="mt-4 flex flex-wrap gap-2 animate-pulse">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            )}

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

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-6 py-6 dark:bg-slate-950">
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
                  defaultChartType={categoryChartDefaults[view.id] ?? "bar"}
                  metricType={resolvedData.metricType}
                  targetDays={targetDays}
                />
              ))}
            </div>
          )}

          {categoryViews.length > 0 && (
            <div className="mt-6 flex items-center justify-between rounded-xl border bg-muted/20 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing all {categoryViews.length} categories with{" "}
                {categoryViews.reduce((s, v) => s + v.items.length, 0)} total breakdown items
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
