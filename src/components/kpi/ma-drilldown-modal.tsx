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
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  ActivityIcon,
  ClockIcon,
  TargetIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
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
import { cn } from "@/lib/utils";
import type { KPIDrillDownData, KPIDimensionView } from "@/types/ma-drilldown";
import { KPIFilter, type KPIFilterState } from "./kpi-filter";
import { useMAKPI1DrilldownData } from "@/hooks/useMAApi";
import { buildMAKpi1DrilldownData } from "@/lib/ma-api/drilldown";

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
  if (label.includes("ma type")) return "line";
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
              label={({ name, percent }) =>
                `${name.length > 14 ? name.slice(0, 12) + "..." : name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={{ strokeWidth: 1 }}
            >
              {sorted.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(_value: number, _name: string, entry: { payload: { name: string; percentage: number; onTime: number; total: number } }) => [
                `${entry.payload.onTime}/${entry.payload.total} (${entry.payload.percentage.toFixed(1)}%)`,
                entry.payload.name,
              ]}
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
              formatter={(value: number, _name: string, entry: { payload: { onTime: number; total: number } }) => [
                `${value.toFixed(1)}% (${entry.payload.onTime}/${entry.payload.total})`,
                "On-time",
              ]}
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
              formatter={(value: number, _name: string, entry: { payload: { onTime: number; total: number } }) => [
                `${value.toFixed(1)}% (${entry.payload.onTime}/${entry.payload.total})`,
                "On-time",
              ]}
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
              formatter={(value: number, _name: string, entry: { payload: { onTime: number; total: number } }) => [
                `${value.toFixed(1)}% (${entry.payload.onTime}/${entry.payload.total})`,
                "On-time",
              ]}
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
            formatter={(value: number, _name: string, entry: { payload: { onTime: number; total: number } }) => [
              `${value.toFixed(1)}% (${entry.payload.onTime}/${entry.payload.total})`,
              "On-time",
            ]}
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
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight truncate">{view.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chartData.length} categories &middot; {totalAll.toLocaleString()} total applications
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5 shrink-0">
          {CHART_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setChartType(opt.id)}
              className={cn(
                "flex items-center justify-center rounded-md p-1.5 transition-colors",
                chartType === opt.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={opt.label}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall</div>
            <div className="text-lg font-bold">{overallPct.toFixed(1)}%</div>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">On-time</div>
            <div className="text-lg font-bold">{totalOnTime.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
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

export function MADrillDownModal({ open, onOpenChange, data }: MADrillDownModalProps) {
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState<KPIFilterState>({
    mode: "quarterly",
    quarter: "Q4",
    year: 2024,
  });

  const isKpi1 = data.kpiId === "MA-KPI-1";

  const { data: kpi1ApiData, loading: kpi1Loading } = useMAKPI1DrilldownData();

  const apiReady = isKpi1 && !kpi1Loading && !!kpi1ApiData?.data?.length;

  const liveData = useMemo(() => {
    if (!isKpi1 || !kpi1ApiData?.data?.length) return null;
    return buildMAKpi1DrilldownData(kpi1ApiData.data, data);
  }, [isKpi1, kpi1ApiData, data]);

  const showLoading = isKpi1 && !apiReady;
  const resolvedData = liveData ?? (isKpi1 ? null : data);
  const dimensionViews = resolvedData?.dimensionViews ?? [];

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setFilterExpanded(false);
    }
    onOpenChange(isOpen);
  };

  const formattedValue = useMemo(() => {
    if (!resolvedData) return null;
    const cv = resolvedData.currentValue;
    if (cv.percentage !== undefined) return `${cv.percentage.toFixed(1)}%`;
    if (cv.median !== undefined) return `${cv.median} days`;
    if (cv.average !== undefined) return `${cv.average.toFixed(1)} days`;
    return String(cv.value);
  }, [resolvedData]);

  const meetsTarget = (resolvedData?.currentValue.percentage ?? 0) >= 90;

  const categoryChartDefaults = useMemo(
    () =>
      Object.fromEntries(
        dimensionViews.map((v) => [v.id, pickBestFitChart(v)])
      ) as Record<string, ChartType>,
    [dimensionViews]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[1400px] w-[96vw] max-h-[94vh] flex flex-col overflow-hidden border-none bg-background p-0 gap-0">
        {/* Fixed header */}
        <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm">
          <div className="px-6 pt-5 pb-4">
            <DialogHeader className="mb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl font-bold tracking-tight leading-tight">
                    {data.kpiName}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Detailed breakdown across all classification categories
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
              <div className="mt-4 flex flex-wrap gap-2">
                <div className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
                  meetsTarget
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}>
                  {meetsTarget
                    ? <CheckCircle2Icon className="h-4 w-4" />
                    : <XCircleIcon className="h-4 w-4" />
                  }
                  {formattedValue}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                  <TargetIcon className="h-3.5 w-3.5" />
                  Target: 90%
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                  <ActivityIcon className="h-3.5 w-3.5" />
                  {resolvedData.currentValue.numerator.toLocaleString()} / {resolvedData.currentValue.denominator.toLocaleString()} on-time
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                  <BarChart3Icon className="h-3.5 w-3.5" />
                  {dimensionViews.length} categories
                </div>
                {resolvedData.currentValue.percentage !== undefined && (
                  <div className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                    (90 - resolvedData.currentValue.percentage) > 0
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}>
                    <ClockIcon className="h-3.5 w-3.5" />
                    Gap: {Math.max(0, 90 - resolvedData.currentValue.percentage).toFixed(1)}%
                  </div>
                )}
              </div>
            )}

            {/* Filter toggle */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setFilterExpanded(!filterExpanded)}
              >
                {filterExpanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                {filterExpanded ? "Hide filters" : "Show filters"}
              </Button>
              {dateFilter.mode === "quarterly" && dateFilter.quarter && (
                <Badge variant="secondary" className="text-[11px]">
                  {dateFilter.quarter} {dateFilter.year}
                </Badge>
              )}
              {dateFilter.mode === "annual" && (
                <Badge variant="secondary" className="text-[11px]">
                  {dateFilter.year}
                </Badge>
              )}
              {dateFilter.mode === "monthly" && dateFilter.month !== undefined && (
                <Badge variant="secondary" className="text-[11px]">
                  {new Date(2024, dateFilter.month).toLocaleString("default", { month: "short" })} {dateFilter.year}
                </Badge>
              )}
            </div>
          </div>

          {/* Collapsible filter area */}
          {filterExpanded && (
            <div className="border-t bg-muted/20 px-6 py-3">
              <KPIFilter
                onFilterChange={setDateFilter}
                defaultYear={2024}
                defaultQuarter="Q4"
                showAllModes
              />
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          {showLoading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonChartCard key={i} />
              ))}
            </div>
          ) : dimensionViews.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              No category data available for this KPI.
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
