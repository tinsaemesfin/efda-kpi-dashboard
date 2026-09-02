"use client";

import { useMemo, useState } from "react";
import {
  ActivityIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  Clock3Icon,
  FileSearchIcon,
  LayoutGridIcon,
  RotateCcwIcon,
  Rows3Icon,
  SearchIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TargetIcon,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { GMPApiDrilldownModal } from "@/components/kpi/gmp-api-drilldown-modal";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGMPDrilldown, useGMPFaceMetrics } from "@/hooks/useGMPReports";
import { cn } from "@/lib/utils";
import type { GMPApiFilterParams, GMPKPIId } from "@/types/gmp-api";

const KPI_DEFINITIONS: Array<{ id: GMPKPIId; title: string; description: string }> = [
  { id: "GMP-KPI-1", title: "Facilities inspected as per plan", description: "Pharmaceutical manufacturing facilities inspected against the approved plan." },
  { id: "GMP-KPI-2", title: "Facilities compliant with GMP", description: "Local and abroad facilities certified following GMP inspection." },
  { id: "GMP-KPI-3", title: "Abroad on-site inspections waived", description: "Abroad GMP inspection waiver activity." },
  { id: "GMP-KPI-5", title: "CAPA decisions within timeline", description: "Timeliness of final decisions on corrective and preventive action responses." },
  { id: "GMP-KPI-6", title: "Applications completed within timeline", description: "End-to-end completion of GMP inspection applications within the set timeline." },
  { id: "GMP-KPI-7", title: "Average turnaround time", description: "Average regulator processing time for completed GMP applications." },
  { id: "GMP-KPI-8", title: "Median turnaround time", description: "Median regulator processing time for completed GMP applications." },
  { id: "GMP-KPI-9", title: "Inspection reports published on time", description: "Timely publication of GMP inspection outcomes." },
];

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

const focusAreas = [
  { label: "Inspection planning", description: "Planned coverage and inspection execution", icon: <TargetIcon className="size-5" />, color: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300" },
  { label: "GMP compliance", description: "Facility outcomes and CAPA decisions", icon: <ShieldCheckIcon className="size-5" />, color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" },
  { label: "Processing time", description: "Completion, average and median timelines", icon: <Clock3Icon className="size-5" />, color: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300" },
  { label: "Transparency", description: "Publication of inspection outcomes", icon: <ClipboardCheckIcon className="size-5" />, color: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300" },
];

export default function GMPInspectionsPage() {
  const initialPeriod = useMemo(() => periodForPreset("all-time"), []);
  const [datePreset, setDatePreset] = useState("all-time");
  const [dateFrom, setDateFrom] = useState(initialPeriod[0]);
  const [dateTo, setDateTo] = useState(initialPeriod[1]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cardDensity, setCardDensity] = useState<"grid" | "condensed">("grid");
  const [selectedKpiId, setSelectedKpiId] = useState<GMPKPIId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filters = useMemo<GMPApiFilterParams>(() => ({ startDate: dateFrom, endDate: dateTo }), [dateFrom, dateTo]);
  const { metrics, loading, error } = useGMPFaceMetrics(filters, true);
  const drilldown = useGMPDrilldown(selectedKpiId, filters, isModalOpen);
  const selectedDefinition = KPI_DEFINITIONS.find((kpi) => kpi.id === selectedKpiId);
  const visibleKpis = KPI_DEFINITIONS.filter((kpi) => `${kpi.id} ${kpi.title} ${kpi.description}`.toLowerCase().includes(searchTerm.trim().toLowerCase()));

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
          <section className="relative overflow-hidden rounded-[2rem] border border-violet-200/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_48%,#f1edff_100%)] shadow-[0_30px_80px_-55px_rgba(76,29,149,0.7)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111024_52%,#18112e_100%)]">
            <div className="pointer-events-none absolute -right-24 -top-32 size-[26rem] rounded-full border border-violet-300/30" />
            <div className="pointer-events-none absolute -right-6 -top-24 size-[20rem] rounded-full border border-fuchsia-300/20" />
            <div className="relative grid lg:grid-cols-[0.85fr_1.15fr]">
              <div className="flex flex-col justify-between border-b border-violet-100 p-6 sm:p-8 lg:min-h-[320px] lg:border-b-0 lg:border-r dark:border-violet-900/50">
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 shadow-sm backdrop-blur dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300"><ActivityIcon className="size-3.5" /> GMP inspections</div>
                  <h1 className="max-w-xl text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl dark:text-white">From inspection plan to <span className="text-violet-600 dark:text-violet-400">regulatory outcome.</span></h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">Explore coverage, compliance, processing speed, and publication performance across GMP inspection activities.</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2Icon className="size-4 text-emerald-500" /> Performance monitoring</span>
                  <span className="inline-flex items-center gap-1.5"><FileSearchIcon className="size-4 text-violet-500" /> Indicator-level exploration</span>
                </div>
              </div>
              <div className="relative p-5 sm:p-7">
                <div className="mb-4"><p className="text-sm font-bold text-slate-900 dark:text-white">GMP performance areas</p><p className="mt-1 text-xs text-slate-500">A consistent view from planning through publication.</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {focusAreas.map((area) => (
                    <div key={area.label} className="group min-h-28 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/55">
                      <div className="flex items-start gap-3"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", area.color)}>{area.icon}</span><div><p className="font-bold text-slate-900 dark:text-white">{area.label}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{area.description}</p></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

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

          <div className={cn("grid items-stretch gap-4", cardDensity === "grid" ? "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5")}>
            {visibleKpis.map((definition, index) => {
              const metric = metrics[definition.id];
              const isEmpty = metric?.state === "work-in-progress";
              const numericValue = metric?.value;
              const displayValue = numericValue !== undefined ? numericValue.toFixed(1) : "0";
              const sideBySideMetrics = metric && metric.segments.length > 1 ? metric.segments.map((segment) => ({ id: segment.id, label: segment.label, value: segment.value, suffix: segment.unit === "days" ? "days" : "%", numerator: segment.numerator, denominator: segment.denominator, isEmpty: segment.state === "work-in-progress" })) : undefined;
              return <MAKPICard key={definition.id} className={definition.id === "GMP-KPI-6" ? "xl:col-span-2 2xl:col-span-2" : undefined} kpiCode={definition.id} title={definition.title} description={definition.description} value={displayValue} suffix={metric?.unit === "days" ? "days" : "%"} numerator={metric?.numerator} denominator={metric?.denominator} sideBySideMetrics={sideBySideMetrics} dataAttribution={metric?.state === "live" ? "live" : "none"} status={statusFor(definition.id, numericValue)} compact={cardDensity === "condensed"} animationDelayMs={index * 45} isLoading={loading && !metric} isEmpty={isEmpty} emptyMessage="No data found" onClick={() => { setSelectedKpiId(definition.id); setIsModalOpen(true); }} />;
            })}
          </div>

          {visibleKpis.length === 0 && <Card className="border-dashed"><CardContent className="pt-6 text-sm text-muted-foreground">No KPI cards match this search.</CardContent></Card>}

          {selectedKpiId && selectedDefinition && <GMPApiDrilldownModal open={isModalOpen} onOpenChange={setIsModalOpen} kpiId={selectedKpiId} title={selectedDefinition.title} metric={metrics[selectedKpiId]} reports={drilldown.reports} supported={drilldown.supported} loading={drilldown.loading} error={drilldown.error} periodLabel={datePreset === "all-time" ? "All available data" : `${formatPeriodDate(dateFrom)} – ${formatPeriodDate(dateTo)}`} />}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
