"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  DownloadIcon,
  Loader2Icon,
  TargetIcon,
  XCircleIcon,
} from "lucide-react";
import { CategoryChartCard, SkeletonChartCard } from "@/components/kpi/ma-drilldown-detail";
import { MALiveIndicator } from "@/components/kpi/ma-live-indicator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableFullscreen } from "@/components/ui/table-fullscreen";
import { ctKpiSeed } from "@/data/ct-kpi-seed";
import { useAuth } from "@/hooks/useAuth";
import { fetchCTDrilldownTabularData } from "@/lib/ct-api/client";
import { CT_DRILLDOWN_REPORT_IDS } from "@/lib/ct-api/constants";
import { buildCTExplorer } from "@/lib/ct-api/drilldown-views";
import { downloadCsv } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import type { CTDrilldownRow, CTKPIId } from "@/types/ct-api";

const COLUMN_LABELS: Record<string, string> = {
  application_number: "Application",
  title: "Title",
  received_date: "Received",
  decision_date: "Decision date",
  inspection_date: "Inspection date",
  outcome_date: "Outcome date",
  capa_received: "CAPA received",
  regulatory_days: "Regulatory days",
  assessment_days: "Assessment days",
  evaluation_days: "Evaluation days",
  target_days: "Target days",
  report_type: "Report type",
  gcp_mode: "GCP mode",
  outcome_code: "Outcome",
  outcome_family: "Outcome type",
  outcome: "Outcome",
  status: "Status",
  result: "Result",
};

const RATE_COUNT_LABEL: Record<string, string> = {
  "CT-KPI-5": "Compliant",
  "CT-KPI-9": "Evaluated",
  "CT-KPI-10": "Measure",
  "CT-KPI-11": "Assessed",
};

const RATE_SERIES_LABEL: Record<string, string> = {
  "CT-KPI-5": "Compliant inspections",
  "CT-KPI-9": "Evaluated amendments",
  "CT-KPI-10": "Measure rows",
  "CT-KPI-11": "Assessed reports",
};

function readFilters(query: string) {
  const params = new URLSearchParams(query);
  const date = (key: string) => {
    const value = params.get(key);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  };
  return { startDate: date("startDate"), endDate: date("endDate") };
}

function formatIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCell(value: CTDrilldownRow[string]) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatIsoDate(value.slice(0, 10));
  return String(value);
}

function columnsFor(rows: CTDrilldownRow[]) {
  const present = new Set(rows.flatMap((row) => Object.keys(row)));
  present.delete("rowNumber");
  const ordered = Object.keys(COLUMN_LABELS).filter((key) => present.has(key));
  for (const key of present) if (!ordered.includes(key)) ordered.push(key);
  return ordered;
}

export function CTDrilldownDetail({ kpiId, query }: { kpiId: string; query: string }) {
  const reportId = CT_DRILLDOWN_REPORT_IDS[kpiId as CTKPIId];
  const card = ctKpiSeed.cards.find((item) => item.drilldownId === kpiId);
  const filters = useMemo(() => readFilters(query), [query]);
  const { isAuthenticated, loading: authLoading, accessToken } = useAuth();
  const [rows, setRows] = useState<CTDrilldownRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken || reportId == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCTDrilldownTabularData(accessToken, kpiId, reportId, filters, { force: attempt > 0 })
      .then((response) => {
        if (!cancelled) setRows(response.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Failed to load the list"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, accessToken, reportId, kpiId, filters, attempt]);

  const model = useMemo(() => (rows ? buildCTExplorer(kpiId, rows) : null), [kpiId, rows]);
  const views = model?.data.dimensionViews ?? [];
  const showLoading = loading || authLoading;
  const current = model?.data.currentValue;
  const formattedValue = current?.percentage != null
    ? `${current.percentage.toFixed(1)}%`
    : current?.average != null
      ? `${current.average.toFixed(1)} days`
      : current
        ? `${current.numerator.toLocaleString()} inspected`
        : null;
  const meetsTarget = model?.kind === "days"
    ? (current?.average ?? Number.POSITIVE_INFINITY) <= (current?.targetDays ?? 58)
    : model?.kind === "rate"
      ? (current?.percentage ?? 0) >= 90
      : null;
  const columns = rows?.length ? columnsFor(rows) : [];
  const periodLabel = filters.startDate && filters.endDate
    ? `${formatIsoDate(filters.startDate)} – ${formatIsoDate(filters.endDate)}`
    : filters.startDate
      ? `From ${formatIsoDate(filters.startDate)}`
      : filters.endDate
        ? `To ${formatIsoDate(filters.endDate)}`
        : null;

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-violet-200/70 bg-slate-50 shadow-sm dark:border-violet-900/60 dark:bg-slate-950">
      <div className="relative shrink-0 overflow-hidden border-b border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_58%,#f0ebff_100%)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#15112a_58%,#1c1235_100%)]">
        <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border border-violet-300/30" />
        <div className="relative px-4 pb-5 pt-6 sm:px-6">
          <header className="mb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[.1em] text-white dark:bg-white dark:text-slate-950">{kpiId}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600 dark:text-violet-300">Performance explorer</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="max-w-4xl text-xl font-bold leading-tight tracking-[-.025em] sm:text-2xl">
                    {card?.title ?? "Clinical trial indicator"}
                  </h1>
                  {!showLoading && rows && <MALiveIndicator variant="live" className="text-[10px]" />}
                </div>
                <p className="mt-2 max-w-3xl text-sm">
                  {model?.summary ?? card?.description}
                </p>
              </div>
              {showLoading && (
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
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
            </div>
          ) : model && current && (
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className={cn(
                "flex items-center gap-3 rounded-xl border bg-white/75 px-3 py-3 shadow-sm backdrop-blur dark:bg-slate-950/50",
                meetsTarget == null
                  ? "border-sky-200 text-sky-700 dark:border-sky-900/70 dark:text-sky-300"
                  : meetsTarget
                    ? "border-emerald-200 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300"
                    : "border-amber-200 text-amber-700 dark:border-amber-900/70 dark:text-amber-300"
              )}>
                {meetsTarget == null
                  ? <ActivityIcon className="h-4 w-4" />
                  : meetsTarget
                    ? <CheckCircle2Icon className="h-4 w-4" />
                    : <XCircleIcon className="h-4 w-4" />}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Current performance</p>
                  <p className="text-lg font-bold">{formattedValue}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-white/75 px-3 py-3 text-violet-700 shadow-sm dark:border-violet-900/70 dark:bg-slate-950/50 dark:text-violet-300">
                <TargetIcon className="size-5" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Performance / day target</p>
                  <p className="text-lg font-bold">{model.targetText}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white/75 px-3 py-3 text-sky-700 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/50 dark:text-sky-300">
                <ActivityIcon className="size-5" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{model.volumeLabel}</p>
                  <p className="text-lg font-bold">
                    {current.numerator.toLocaleString()}
                    {model.kind === "rate" ? <span className="text-xs font-medium opacity-60"> / {current.denominator.toLocaleString()}</span> : null}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-white/75 px-3 py-3 text-fuchsia-700 shadow-sm dark:border-fuchsia-900/70 dark:bg-slate-950/50 dark:text-fuchsia-300">
                <BarChart3Icon className="size-5" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Dimensions</p>
                  <p className="text-lg font-bold">{views.length}</p>
                </div>
              </div>
            </div>
          )}

          {(model || periodLabel) && !showLoading && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {model && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <CalendarDaysIcon className="h-3 w-3" />
                  {model.dateBasis}
                </Badge>
              )}
              {periodLabel && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <CalendarDaysIcon className="h-3 w-3" />
                  {periodLabel}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>The reporting service could not load this drilldown. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
        </div>
      )}

      <div className="min-w-0 bg-slate-50/80 px-3 py-5 sm:px-6 sm:py-6 dark:bg-slate-950">
        {showLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => <SkeletonChartCard key={index} />)}
          </div>
        ) : error ? null : views.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center text-muted-foreground">
            <p>{rows ? "The reporting API returned no rows for this KPI drill-down." : "No category data available for this KPI."}</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {views.map((view) => (
              <CategoryChartCard
                key={view.id}
                view={view}
                chart={model?.chartByViewId[view.id]}
                countLabel={RATE_COUNT_LABEL[kpiId] ?? "On-time"}
                seriesLabel={RATE_SERIES_LABEL[kpiId] ?? "On-time applications"}
              />
            ))}
          </div>
        )}

        {views.length > 0 && model && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing all {views.length} categories with {views.reduce((sum, view) => sum + view.data.length, 0)} total breakdown items
            </p>
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 gap-1.5 text-xs"
              onClick={() => downloadCsv(`${kpiId}-breakdown.csv`, views.flatMap((view) => view.data.map((row) => ({ dimension: view.label, ...row }))))}
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <TableFullscreen title="Detailed records" description={`${rows.length} ${rows.length === 1 ? "record" : "records"}`}>
              <div className="max-h-[360px] overflow-auto rounded-xl border [[data-slot=table-fullscreen-body]_&]:max-h-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column} className="whitespace-nowrap">{COLUMN_LABELS[column] ?? column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={`${row.application_number ?? "row"}-${index}`}>
                        {columns.map((column) => (
                          <TableCell key={column} className="whitespace-nowrap">{formatCell(row[column])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TableFullscreen>
            <div className="mt-3">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => downloadCsv(`${kpiId}-records.csv`, rows)}>
                <DownloadIcon className="h-3.5 w-3.5" />
                Export records
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
