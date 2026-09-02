"use client";

import { useMemo, useState } from "react";
import {
  ActivityIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ConstructionIcon,
  DownloadIcon,
  Loader2Icon,
  TableIcon,
  TargetIcon,
  XCircleIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MALiveIndicator } from "@/components/kpi/ma-live-indicator";
import { cn } from "@/lib/utils";
import type { GMPApiRow, GMPFaceMetric, GMPKPIId, GMPReportResult } from "@/types/gmp-api";

interface GMPApiDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpiId: GMPKPIId;
  title: string;
  metric?: GMPFaceMetric;
  reports: GMPReportResult[];
  supported: boolean;
  loading: boolean;
  error: Error | null;
  periodLabel: string;
}

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];
const numberValue = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const formatHeading = (key: string) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = numberValue(value);
  if (numeric !== undefined) return Number.isInteger(numeric) ? numeric.toLocaleString() : numeric.toFixed(2);
  return String(value);
};
const rowLabel = (row: GMPApiRow, index: number) => String(row.category_value ?? row.facility_name ?? row.inspection_number ?? row.stage ?? `Item ${index + 1}`);
const rowMetric = (row: GMPApiRow) =>
  numberValue(row.percentage) ?? numberValue(row.average_days) ?? numberValue(row.median_days) ?? numberValue(row.avg_actual_days) ?? numberValue(row.processing_days) ?? numberValue(row.on_time_count) ?? numberValue(row.numerator) ?? 0;

function SkeletonCard() {
  return <div className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="space-y-2 border-b bg-muted/30 px-5 py-4"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div><div className="space-y-4 px-5 py-4"><div className="grid grid-cols-3 gap-3"><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div><Skeleton className="h-[240px] rounded-lg" /></div></div>;
}

function BreakdownCard({ report, mode }: { report: GMPReportResult; mode: "chart" | "table" }) {
  const rows = report.rows;
  const chartData = rows.map((row, index) => ({ name: rowLabel(row, index), value: rowMetric(row), count: numberValue(row.numerator) ?? numberValue(row.on_time_count) ?? numberValue(row.completed_count) ?? 0, total: numberValue(row.denominator) ?? numberValue(row.total_count) ?? 0 }));
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row).filter((key) => key !== "rowNumber"))));
  const best = [...chartData].sort((a, b) => b.value - a.value)[0];
  const average = chartData.length ? chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length : 0;
  const isPercent = rows.some((row) => numberValue(row.percentage) !== undefined);

  return (
    <section className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,.65)] transition-shadow duration-300 hover:shadow-[0_22px_52px_-34px_rgba(91,33,182,.45)] dark:border-slate-800 dark:bg-slate-950/70">
      <div className="border-b border-violet-100 bg-linear-to-r from-violet-50/90 via-white to-fuchsia-50/40 px-5 py-4 dark:border-violet-900/50 dark:from-violet-950/35 dark:via-slate-950 dark:to-fuchsia-950/20">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">Breakdown view</p><h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{report.label}</h3><p className="mt-0.5 text-xs text-muted-foreground">{rows.length} categories</p></div>{isPercent && <Badge className="border-0 bg-violet-100 text-[10px] text-violet-700 shadow-none dark:bg-violet-950 dark:text-violet-300">90% target</Badge>}</div>
      </div>
      <div className="px-5 py-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 dark:border-violet-900/60 dark:bg-violet-950/25"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Average</div><div className="text-lg font-bold">{average.toFixed(1)}{isPercent ? "%" : ""}</div></div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/25"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Categories</div><div className="text-lg font-bold">{rows.length}</div></div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 dark:border-sky-900/60 dark:bg-sky-950/25"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Highest</div><div className="truncate text-sm font-semibold" title={best?.name}>{best?.name ?? "—"}</div><div className="text-[11px] text-muted-foreground">{best ? `${best.value.toFixed(1)}${isPercent ? "%" : ""}` : ""}</div></div>
        </div>
        {mode === "table" ? (
          rows.length ? <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column} className="whitespace-nowrap">{formatHeading(column)}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={index}>{columns.map((column) => <TableCell key={column} className="max-w-[320px] whitespace-nowrap">{formatValue(row[column])}</TableCell>)}</TableRow>)}</TableBody></Table></div> : <div className="grid h-64 place-items-center text-sm text-muted-foreground">No data available for this period.</div>
        ) : rows.length <= 5 ? (
          <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={98} paddingAngle={3} label={({ name, percent }) => `${String(name).slice(0, 12)} ${((percent ?? 0) * 100).toFixed(0)}%`}>{chartData.map((_, index) => <Cell key={index} fill={PALETTE[index % PALETTE.length]} />)}</Pie><Tooltip formatter={(value) => [`${Number(value).toFixed(1)}${isPercent ? "%" : ""}`, "Value"]} /></PieChart></ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(280, Math.min(520, chartData.length * 38))}><BarChart data={chartData.slice(0, 12)} layout="vertical" margin={{ left: 8, right: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => `${value}${isPercent ? "%" : ""}`} /><YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} interval={0} /><Tooltip formatter={(value) => [`${Number(value).toFixed(1)}${isPercent ? "%" : ""}`, "Value"]} /><Bar dataKey="value" radius={[0, 4, 4, 0]}>{chartData.slice(0, 12).map((entry, index) => <Cell key={index} fill={isPercent ? entry.value >= 90 ? "#22c55e" : entry.value >= 50 ? "#f59e0b" : "#ef4444" : PALETTE[index % PALETTE.length]} />)}</Bar>{isPercent && <ReferenceLine x={90} stroke="#6366f1" strokeDasharray="4 4" />}</BarChart></ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

export function GMPApiDrilldownModal(props: GMPApiDrilldownModalProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const availableReports = useMemo(() => props.reports.filter((report) => !report.error), [props.reports]);
  const isWip = !props.supported;
  const isTime = props.metric?.unit === "days";
  const value = props.metric?.valueLabel ?? (props.metric?.value !== undefined ? `${props.metric.value.toFixed(1)}${isTime ? " days" : "%"}` : "—");
  const meetsTarget = props.metric?.value !== undefined && (isTime ? props.metric.value <= 60 : props.metric.value >= 90);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-3xl border border-violet-200/70 bg-slate-50 p-0 shadow-[0_35px_100px_-30px_rgba(15,23,42,.65)] dark:border-violet-900/60 dark:bg-slate-950">
        <div className="relative shrink-0 overflow-hidden border-b border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_58%,#f0ebff_100%)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#15112a_58%,#1c1235_100%)]">
          <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border border-violet-300/30" />
          <div className="relative px-6 pb-5 pt-6">
            <DialogHeader className="mb-0">
              <div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[.1em] text-white dark:bg-white dark:text-slate-950">{props.kpiId}</span><span className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600 dark:text-violet-300">Performance explorer</span></div><div className="flex flex-wrap items-center gap-2"><DialogTitle className="max-w-4xl text-xl font-bold leading-tight tracking-[-.025em] sm:text-2xl">{props.title}</DialogTitle>{!props.loading && !isWip && availableReports.length > 0 && <MALiveIndicator variant="live" className="text-[10px]" />}</div><DialogDescription className="mt-2 max-w-3xl">Compare performance across available classifications and detailed records.</DialogDescription></div>{props.loading && <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><Loader2Icon className="h-4 w-4 animate-spin" /> Loading data...</div>}</div>
            </DialogHeader>

            {props.loading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : !isWip && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className={cn("flex items-center gap-3 rounded-xl border bg-white/75 px-3 py-3 shadow-sm backdrop-blur dark:bg-slate-950/50", meetsTarget ? "border-emerald-200 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300" : "border-amber-200 text-amber-700 dark:border-amber-900/70 dark:text-amber-300")}>{meetsTarget ? <CheckCircle2Icon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}<div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Current performance</p><p className="text-lg font-bold">{value}</p></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-white/75 px-3 py-3 text-violet-700 shadow-sm dark:border-violet-900/70 dark:bg-slate-950/50 dark:text-violet-300"><TargetIcon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Target</p><p className="text-lg font-bold">{isTime ? "60 days" : "90%"}</p></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white/75 px-3 py-3 text-sky-700 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/50 dark:text-sky-300"><ActivityIcon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Volume</p><p className="text-lg font-bold">{props.metric?.numerator?.toLocaleString() ?? "—"} <span className="text-xs font-medium opacity-60">/ {props.metric?.denominator?.toLocaleString() ?? "—"}</span></p></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-white/75 px-3 py-3 text-fuchsia-700 shadow-sm dark:border-fuchsia-900/70 dark:bg-slate-950/50 dark:text-fuchsia-300"><BarChart3Icon className="size-5" /><div><p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Dimensions</p><p className="text-lg font-bold">{availableReports.length}</p></div></div>
            </div>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!isWip && <div className="flex items-center gap-1 rounded-xl border border-violet-200 bg-white/70 p-1 dark:border-violet-900/60 dark:bg-slate-950/50"><button type="button" onClick={() => setViewMode("chart")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors", viewMode === "chart" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><BarChart3Icon className="h-3.5 w-3.5" /> Chart</button><button type="button" onClick={() => setViewMode("table")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors", viewMode === "table" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><TableIcon className="h-3.5 w-3.5" /> Table</button></div>}
              <Badge variant="secondary" className="gap-1 text-[11px]"><CalendarDaysIcon className="h-3 w-3" />{props.periodLabel}</Badge>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-6 py-6 dark:bg-slate-950">
          {isWip ? <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-20 text-center dark:border-slate-700 dark:bg-slate-900/40"><span className="grid size-14 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><ConstructionIcon className="size-7" /></span><h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Work in progress</h3><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Detailed analysis for this indicator is being prepared.</p></div>
          : props.loading ? <div className="grid gap-5 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}</div>
          : availableReports.length === 0 ? <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center text-muted-foreground"><Clock3Icon className="mb-3 size-8 text-violet-400" /><p>No data is available for the selected period.</p></div>
          : <><div className="grid gap-5 lg:grid-cols-2">{availableReports.map((report) => <BreakdownCard key={report.reportId} report={report} mode={viewMode} />)}</div><div className="mt-6 flex items-center justify-between rounded-xl border bg-muted/20 px-5 py-3"><p className="text-xs text-muted-foreground">Showing {availableReports.length} breakdown views with {availableReports.reduce((sum, report) => sum + report.rows.length, 0)} detailed items</p><Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><DownloadIcon className="h-3.5 w-3.5" /> Export</Button></div></>}
          {props.error && !props.loading && !isWip && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">Some detail views are temporarily unavailable.</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
