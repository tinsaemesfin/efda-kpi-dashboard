"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { drilldownQuery, readDrilldownFilters } from "@/lib/drilldown-navigation";
import { KPI_DEFINITIONS } from "@/data/gmp-kpi-definitions";

import { Suspense, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  LayoutGridIcon,
  RotateCcwIcon,
  Rows3Icon,
  SearchIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { GMPOverviewHero } from "@/components/kpi/gmp-overview-hero";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGMPFaceMetrics } from "@/hooks/useGMPReports";
import { cn } from "@/lib/utils";
import type { GMPApiFilterParams, GMPKPIId } from "@/types/gmp-api";



const pad = (value: number) => String(value).padStart(2, "0");
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function periodForPreset(preset: string): [string, string] {
  if (preset === "all-time") return ["", ""];
  const now = new Date();
  const year = now.getFullYear();
  if (preset === "full-year") return [`${year}-01-01`, `${year}-12-31`];
  if (preset === "last-30") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return [isoDate(start), isoDate(now)];
  }
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  if (preset === "this-quarter") return [isoDate(new Date(year, quarterStartMonth, 1)), isoDate(now)];
  return [`${year}-01-01`, isoDate(now)];
}

function formatPeriodDate(value: string): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

const statusFor = (kpiId: GMPKPIId, value?: number): "excellent" | "good" | "warning" | "critical" => {
  if (value === undefined) return "good";
  if (kpiId === "GMP-KPI-7" || kpiId === "GMP-KPI-8") {
    if (value <= 60) return "excellent";
    if (value <= 75) return "good";
    if (value <= 90) return "warning";
    return "critical";
  }
  if (value >= 90) return "excellent";
  if (value >= 80) return "good";
  if (value >= 70) return "warning";
  return "critical";
};

export default function GMPInspectionsPage() {
  return <Suspense fallback={<div className="p-8">Loading dashboard…</div>}><GMPInspectionsContent /></Suspense>;
}
function GMPInspectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restored = readDrilldownFilters(searchParams);
  const [initialPeriod] = useState(() => [restored.startDate ?? "", restored.endDate ?? ""]);
  const [datePreset, setDatePreset] = useState(restored.startDate || restored.endDate ? "custom" : "all-time");
  const [dateFrom, setDateFrom] = useState(initialPeriod[0]);
  const [dateTo, setDateTo] = useState(initialPeriod[1]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cardDensity, setCardDensity] = useState<"grid" | "condensed">("grid");

  const filters = useMemo<GMPApiFilterParams>(() => ({ startDate: dateFrom, endDate: dateTo }), [dateFrom, dateTo]);
  const { metrics, loading, error } = useGMPFaceMetrics(filters, true);
  const visibleKpis = KPI_DEFINITIONS.filter((kpi) => `${kpi.id} ${kpi.title} ${kpi.description}`.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  const standardKpis = visibleKpis.filter((kpi) => (metrics[kpi.id]?.segments.length ?? 0) < 3);
  const expandedKpis = visibleKpis.filter((kpi) => (metrics[kpi.id]?.segments.length ?? 0) >= 3);
  const orderedKpis = [...standardKpis, ...expandedKpis];

  const renderKpiCard = (definition: (typeof KPI_DEFINITIONS)[number], index: number) => {
    const metric = metrics[definition.id];
    const isEmpty = metric?.state === "work-in-progress";
    const numericValue = metric?.value;
    const displayValue = numericValue !== undefined ? numericValue.toFixed(1) : "0";
    const sideBySideMetrics = metric && metric.segments.length > 1 ? metric.segments.map((segment) => ({ id: segment.id, label: segment.label, value: segment.value, suffix: segment.unit === "days" ? "days" : "%", numerator: segment.numerator, denominator: segment.denominator, isEmpty: segment.state === "work-in-progress" })) : undefined;
    return <MAKPICard key={definition.id} className="h-full gap-0 py-0 [&_h3]:line-clamp-none [&_h3]:max-w-none" kpiCode={definition.id} title={definition.title} description={definition.description} value={displayValue} suffix={metric?.unit === "days" ? "days" : "%"} numerator={metric?.numerator} denominator={metric?.denominator} sideBySideMetrics={sideBySideMetrics} dataAttribution={metric?.state === "live" ? "live" : "none"} status={statusFor(definition.id, numericValue)} compact={cardDensity === "condensed"} animationDelayMs={index * 45} isLoading={loading && !metric} isEmpty={isEmpty} emptyMessage={definition.id === "GMP-KPI-2" ? "Reports not yet available" : "No data found"} onClick={() => { router.push(`/gmp-inspections/drilldown/${definition.id}?${drilldownQuery(filters)}`); }} />;
  };

  const applyPreset = (preset: string) => {
    const [from, to] = periodForPreset(preset);
    setDatePreset(preset);
    setDateFrom(from);
    setDateTo(to);
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mx-auto max-w-[1600px] space-y-6">
          <GMPOverviewHero />

          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-950/70" aria-label="Dashboard filters">
            {loading && <div className="absolute inset-x-0 top-0 z-10 h-1 bg-linear-to-r from-violet-500 via-fuchsia-400 to-sky-400" />}
            <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[0.85fr_1fr_1fr_1.25fr_auto]">
              <Select value={datePreset || undefined} onValueChange={applyPreset}><SelectTrigger className="h-11 w-full rounded-xl border-violet-200 bg-violet-50/70 py-1 pl-1.5 pr-3 hover:border-violet-300 dark:border-violet-900/70 dark:bg-violet-950/30"><div className="flex min-w-0 items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-600 text-white shadow-sm shadow-violet-600/25"><SlidersHorizontalIcon className="size-4" /></span><SelectValue placeholder="Custom period" /></div></SelectTrigger><SelectContent><SelectItem value="all-time">All time</SelectItem><SelectItem value="this-quarter">This quarter</SelectItem><SelectItem value="last-30">Last 30 days</SelectItem><SelectItem value="ytd">Year to date</SelectItem><SelectItem value="full-year">Full year</SelectItem></SelectContent></Select>
              <div className="relative"><CalendarDaysIcon className="pointer-events-none absolute left-4 top-3.5 z-10 size-4 text-sky-600" /><Input aria-label="Start date" type="date" className="h-11 rounded-xl border-sky-200 bg-sky-50/60 pl-11 dark:border-sky-900/70 dark:bg-sky-950/25" value={dateFrom} onChange={(event) => { setDatePreset(""); setDateFrom(event.target.value); }} /></div>
              <div className="relative"><CalendarDaysIcon className="pointer-events-none absolute left-4 top-3.5 z-10 size-4 text-indigo-600" /><Input aria-label="End date" type="date" className="h-11 rounded-xl border-indigo-200 bg-indigo-50/60 pl-11 dark:border-indigo-900/70 dark:bg-indigo-950/25" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDatePreset(""); setDateTo(event.target.value); }} /></div>
              <div className="relative"><SearchIcon className="pointer-events-none absolute left-4 top-3.5 z-10 size-4 text-fuchsia-600" /><Input aria-label="Find an indicator" type="search" placeholder="Search indicators…" className="h-11 rounded-xl border-fuchsia-200 bg-fuchsia-50/50 pl-11 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/20" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
              <Button type="button" variant="outline" className="h-11 gap-2 rounded-xl border-rose-200 bg-rose-50/60 px-3 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-300" onClick={() => { setSearchTerm(""); applyPreset("all-time"); }}><RotateCcwIcon className="size-4" /><span className="xl:sr-only">Reset</span></Button>
            </div>
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-violet-100 bg-violet-50/60 px-4 py-2 text-xs dark:border-violet-900/60 dark:bg-violet-950/25"><span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className={cn("size-2 rounded-full", loading ? "animate-pulse bg-amber-500" : "bg-emerald-600")} />{loading ? "Updating indicators…" : "Filters applied"}</span><span className="font-semibold text-violet-700 dark:text-violet-300">{datePreset === "all-time" ? "All available data" : `${formatPeriodDate(dateFrom)} → ${formatPeriodDate(dateTo)}`}{searchTerm && ` · “${searchTerm}”`}</span></div>
          </section>

          {error && <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20"><CardContent className="pt-4 text-sm text-amber-800 dark:text-amber-200">Some indicators could not be refreshed. Unavailable values are clearly marked below.</CardContent></Card>}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><ShieldCheckIcon className="size-4" /></span><div><h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GMP performance</h2><p className="text-xs text-muted-foreground">{visibleKpis.length} indicators · select a card to explore details</p></div></div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-1"><Button type="button" variant={cardDensity === "grid" ? "default" : "ghost"} size="sm" className="h-8 gap-1.5 rounded-lg px-3 text-xs" onClick={() => setCardDensity("grid")}><LayoutGridIcon className="size-3.5" /> Grid</Button><Button type="button" variant={cardDensity === "condensed" ? "default" : "ghost"} size="sm" className="h-8 gap-1.5 rounded-lg px-3 text-xs" onClick={() => setCardDensity("condensed")}><Rows3Icon className="size-3.5" /> Compact</Button></div></div>
          </div>

          {orderedKpis.length > 0 && <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orderedKpis.map(renderKpiCard)}
          </div>}

          {visibleKpis.length === 0 && <Card className="border-dashed"><CardContent className="pt-6 text-sm text-muted-foreground">No KPI cards match this search.</CardContent></Card>}

        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
