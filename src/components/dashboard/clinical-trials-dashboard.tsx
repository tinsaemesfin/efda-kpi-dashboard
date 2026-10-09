"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActivityIcon, CalendarDaysIcon, ClipboardCheckIcon, FlaskConicalIcon, InfoIcon, LayoutGridIcon, Loader2Icon, RotateCcwIcon, Rows3Icon, SearchIcon, ShieldCheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ctKpiSeed } from "@/data/ct-kpi-seed";
import { useCTKPIDataFacade } from "@/hooks/useCTApi";
import { mergeCTCardsWithStrictFaceData } from "@/lib/ct-api/merge";
import { CT_FACE_KPI_IDS } from "@/lib/ct-api/constants";
import { drilldownQuery } from "@/lib/drilldown-navigation";
import { getLocalTodayIso, getMADatePresetRange, type MADatePreset } from "@/lib/ma-api/date-range";
import { cn } from "@/lib/utils";
import type { CTFaceKPIId } from "@/types/ct-api";

const focusAreas = [
  { title: "Applications & amendments", description: "Timely evaluation of new trials and protocol changes.", icon: ClipboardCheckIcon, tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  { title: "Participant safety & compliance", description: "GCP inspections, safety reports, and corrective actions.", icon: ShieldCheckIcon, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { title: "Transparency & efficiency", description: "Evaluation turnaround and the outcome of inspections.", icon: ActivityIcon, tone: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
];

const isLive = (id: string) => CT_FACE_KPI_IDS.includes(id as CTFaceKPIId);
function statusFor(value: number, suffix: string, baseline = 58) {
  if (suffix.trim() === "days") {
    if (value <= baseline) return "excellent";
    if (value <= baseline + 15) return "good";
    if (value <= baseline + 30) return "warning";
    return "critical";
  }
  return value >= 90 ? "excellent" : value >= 80 ? "good" : value >= 70 ? "warning" : "critical";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function ClinicalTrialsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("startDate");
  const toUrl = searchParams.get("endDate");
  const [period, setPeriod] = useState(() => {
    if (fromUrl && toUrl && fromUrl <= toUrl) return { from: fromUrl, to: toUrl };
    return getMADatePresetRange("ytd");
  });
  const [draft, setDraft] = useState(period);
  const [preset, setPreset] = useState(fromUrl && toUrl ? "custom" : "ytd");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [compact, setCompact] = useState(false);
  const filters = useMemo(() => ({ startDate: period.from, endDate: period.to }), [period]);
  const { kpiFaceDataById, loading, error, refetch } = useCTKPIDataFacade(filters);
  const cards = mergeCTCardsWithStrictFaceData(ctKpiSeed.cards, kpiFaceDataById);
  const liveCount = cards.filter((card) => isLive(card.drilldownId) && !card.notApplicableReason).length;
  const notTrackedCount = cards.filter((card) => card.notApplicableReason).length;
  const visibleCards = cards.filter(card => {
    const matchesSource = source === "all" || (source === "live" ? isLive(card.drilldownId) : Boolean(card.notApplicableReason));
    return matchesSource && `${card.title} ${card.description} ${card.drilldownId}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const invalidRange = !draft.from || !draft.to || draft.from > draft.to || draft.to > getLocalTodayIso();
  const pending = draft.from !== period.from || draft.to !== period.to;
  function applyPreset(value: string) {
    setPreset(value);
    if (value === "custom") return;
    const range = getMADatePresetRange(value as MADatePreset);
    setDraft(range);
    setPeriod(range);
  }
  function reset() { setSearch(""); setSource("all"); applyPreset("ytd"); }

  return <div className="mx-auto max-w-[1600px] space-y-6">
    <section aria-labelledby="ct-title" className="relative overflow-hidden rounded-[2rem] border border-violet-200/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_48%,#f1edff_100%)] shadow-[0_30px_80px_-55px_rgba(76,29,149,0.7)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111024_52%,#18112e_100%)]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 size-[26rem] rounded-full border border-violet-300/30" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-24 size-[20rem] rounded-full border border-fuchsia-300/20" />
      <div className="relative grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col justify-between border-b border-violet-100 p-6 sm:p-8 lg:border-b-0 lg:border-r dark:border-violet-900/50">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300"><FlaskConicalIcon className="size-3.5" aria-hidden /> Clinical trials</p>
            <h1 id="ct-title" className="max-w-xl text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl dark:text-white">From clinical research to <span className="text-violet-600 dark:text-violet-400">safer outcomes.</span></h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">Monitor evaluation timelines, participant safety, and compliance across the clinical trial lifecycle.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-lg border border-violet-200 bg-white/70 px-3 py-2 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">{cards.length} indicators</span>
            <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">{liveCount} reporting indicators</span>
            <span className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{notTrackedCount} not tracked</span>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Clinical trial focus areas</h2>
          <p className="mt-1 text-xs text-muted-foreground">Oversight at every stage of the research journey.</p>
          <div className="mt-4 grid gap-3">{focusAreas.map(area => <div key={area.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55"><div className="flex items-start gap-3"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", area.tone)}><area.icon className="size-5" aria-hidden /></span><div><h3 className="font-bold text-slate-900 dark:text-white">{area.title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{area.description}</p></div></div></div>)}</div>
        </div>
      </div>
    </section>

    <section aria-label="Clinical trial filters" className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      {loading && <div aria-hidden className="absolute inset-x-0 top-0 h-1 overflow-hidden"><div className="ma-filter-loading h-full bg-linear-to-r from-violet-500 via-fuchsia-400 to-sky-400" /></div>}
      <form onSubmit={event => { event.preventDefault(); if (!invalidRange) setPeriod({ ...draft }); }} className="grid items-end gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto]">
        <div className="space-y-1.5"><label htmlFor="ct-preset" className="text-xs font-medium text-muted-foreground">Reporting period</label><Select value={preset} onValueChange={applyPreset}><SelectTrigger id="ct-preset" className="h-11! w-full rounded-xl border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/30"><SlidersHorizontalIcon className="size-4 shrink-0 text-violet-600" aria-hidden /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ytd">Year to date</SelectItem><SelectItem value="this-quarter">This quarter</SelectItem><SelectItem value="last-quarter">Last quarter</SelectItem><SelectItem value="last-30">Last 30 days</SelectItem><SelectItem value="custom">Custom period</SelectItem></SelectContent></Select></div>
        {(["from", "to"] as const).map(field => <div key={field} className="min-w-0 space-y-1.5"><label htmlFor={`ct-${field}`} className="text-xs font-medium text-muted-foreground">{field === "from" ? "From" : "To"}</label><div className="relative"><CalendarDaysIcon aria-hidden className="pointer-events-none absolute left-3 top-3.5 size-4 text-sky-600" /><Input id={`ct-${field}`} type="date" required max={getLocalTodayIso()} min={field === "to" ? draft.from : undefined} value={draft[field]} aria-invalid={invalidRange} aria-describedby={invalidRange ? "ct-date-error" : undefined} onChange={event => { setPreset("custom"); setDraft({ ...draft, [field]: event.target.value }); }} className="h-11 min-w-0 rounded-xl border-sky-200 bg-sky-50/60 pl-9 dark:border-sky-900 dark:bg-sky-950/25" /></div></div>)}
        <div className="space-y-1.5"><label htmlFor="ct-search" className="text-xs font-medium text-muted-foreground">Find an indicator</label><div className="relative"><SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-3.5 size-4 text-fuchsia-600" /><Input id="ct-search" type="search" placeholder="Search name or KPI code…" value={search} onChange={event => setSearch(event.target.value)} className="h-11 rounded-xl border-fuchsia-200 bg-fuchsia-50/50 pl-9 dark:border-fuchsia-900 dark:bg-fuchsia-950/20" /></div></div>
        <div className="flex gap-2"><Button type="submit" disabled={invalidRange || !pending} className="h-11 flex-1 rounded-xl bg-violet-600 text-white hover:bg-violet-700">Apply</Button><Button type="button" variant="outline" onClick={reset} className="h-11 rounded-xl" aria-label="Reset all filters" title="Reset all filters"><RotateCcwIcon className="size-4" /></Button></div>
      </form>
      {invalidRange && <p id="ct-date-error" role="alert" className="px-4 pb-3 text-xs text-destructive">Choose a start date on or before the end date, with neither date in the future.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-violet-100 bg-violet-50/60 px-4 py-3 text-xs dark:border-violet-900/60 dark:bg-violet-950/25">
        <span role="status" className="flex items-center gap-2 text-muted-foreground">{loading ? <Loader2Icon className="size-3.5 animate-spin" aria-hidden /> : <span aria-hidden className={cn("size-2 rounded-full", error || pending ? "bg-amber-500" : "bg-emerald-600")} />}{loading ? "Updating reporting indicators…" : error ? "Reporting data unavailable" : pending ? "Date changes ready to apply" : "Showing applied period"}</span>
        <span className="font-semibold text-violet-700 dark:text-violet-300">{formatDate(period.from)} – {formatDate(period.to)}</span>
      </div>
    </section>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><p>Some reporting indicators could not be refreshed.</p><Button variant="outline" size="sm" disabled={loading} onClick={() => void refetch()}>Try again</Button></div>}

    <section aria-labelledby="ct-performance" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><FlaskConicalIcon className="size-5" aria-hidden /></span><div><h2 id="ct-performance" className="text-xl font-bold tracking-tight">Clinical trial performance</h2><p role="status" className="text-xs text-muted-foreground">{visibleCards.length} of {cards.length} indicators</p></div></div>
        <div className="flex flex-wrap items-center gap-3"><Select value={source} onValueChange={setSource}><SelectTrigger aria-label="Filter by data source" className="w-44 rounded-xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All indicators</SelectItem><SelectItem value="live">Reporting data</SelectItem><SelectItem value="unavailable">Not tracked</SelectItem></SelectContent></Select><div role="group" aria-label="Card density" className="flex gap-1 rounded-xl border bg-card p-1"><Button variant={!compact ? "default" : "ghost"} size="sm" aria-pressed={!compact} onClick={() => setCompact(false)} className="gap-1.5 rounded-lg"><LayoutGridIcon className="size-3.5" aria-hidden />Grid</Button><Button variant={compact ? "default" : "ghost"} size="sm" aria-pressed={compact} onClick={() => setCompact(true)} className="gap-1.5 rounded-lg"><Rows3Icon className="size-3.5" aria-hidden />Compact</Button></div></div>
      </div>
      <p className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground"><InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />Reporting indicators use eRIS data for the selected period. National registry listing is not tracked. Open a card to see the applications behind the number.</p>
      <div aria-busy={loading} className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleCards.map((card, index) => {
        const live = isLive(card.drilldownId);
        const empty = Boolean(card.faceDataMissing || card.notApplicableReason);
        const baseline = card.targetDays ?? 58;
        return <MAKPICard key={card.id} className="h-full [&_h3]:line-clamp-none [&_h3]:max-w-none" kpiCode={card.drilldownId} title={card.title} description={card.description} value={card.value.toFixed(card.decimals)} suffix={card.suffix} numerator={card.numerator} denominator={card.denominator} dataAttribution={!empty && live ? "live" : "none"} strictLiveSlotEmpty={live && empty} helperText={empty || !live ? undefined : "Reporting data · selected period"} status={statusFor(card.value, card.suffix, baseline)} targetDays={card.targetDays} compact={compact} animationDelayMs={index * 45} isLoading={live && loading && !kpiFaceDataById} isEmpty={empty} isNotApplicable={Boolean(card.notApplicableReason)} emptyMessage={card.notApplicableReason ?? (error ? "Reporting data unavailable" : "No data for this period")} onClick={card.notApplicableReason ? undefined : () => router.push(`/clinical-trials/drilldown/${card.drilldownId}?${drilldownQuery(filters)}`)} />;
      })}</div>
      {visibleCards.length === 0 && <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center"><SearchIcon className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden /><h3 className="font-semibold">No matching indicators</h3><p className="mt-2 text-sm text-muted-foreground">Try another keyword or include all data sources.</p><Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setSource("all"); }}>Clear search and source filter</Button></div>}
    </section>
  </div>;
}
