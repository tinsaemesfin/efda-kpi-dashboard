"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpRightIcon, CalendarDaysIcon, ChartNoAxesCombinedIcon, CircleAlertIcon, DatabaseIcon, LayersIcon, ShieldCheckIcon } from "lucide-react";
import { getDashboardOverviewModel, getExceptionTotalsByProgram, getMajorExecutiveCards, getProgramFocusCards, getProgramRiskMatrix, getSourceQualitySummary, getStatusDistribution } from "@/data/dashboard-analytics";
import { PROGRAM_ORDER, programDashboardByKey } from "@/data/dashboard-product-performance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DashboardSourceBadge } from "./dashboard-source-badge";
import { DashboardStatusBadge } from "./dashboard-status-badge";
import { ExecutiveMetricCard } from "./executive-metric-card";
import { ProgramExceptionChart } from "./program-exception-chart";
import { DashboardRiskMatrix } from "./risk-matrix";
import { StatusDistributionChart } from "./status-distribution-chart";

type DashboardUser = { name: string; email?: string; role?: string };

const PROGRAM_COPY = {
  clinicalTrials: { eyebrow: "Research & safety", description: "Follow trial evaluations, participant safety, and GCP compliance.", tags: ["Applications", "Evaluation", "Compliance"], accent: "bg-blue-500", icon: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300", text: "text-blue-700 dark:text-blue-300" },
  gmpInspections: { eyebrow: "Manufacturing quality", description: "Explore facility inspections, corrective actions, and certification timelines.", tags: ["Local & abroad", "Inspections", "Certification"], accent: "bg-emerald-500", icon: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300" },
  marketAuthorizations: { eyebrow: "Product registration", description: "Track product applications, processing times, and regulatory decisions.", tags: ["Registration", "Processing time", "Decisions"], accent: "bg-violet-500", icon: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300", text: "text-violet-700 dark:text-violet-300" },
};
const jumpLink = "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600";

export function MainDashboard({ user }: { user?: DashboardUser }) {
  const [matrixProgram, setMatrixProgram] = useState("all");
  const overview = getDashboardOverviewModel();
  const sources = getSourceQualitySummary();
  const metrics = getMajorExecutiveCards();
  const exceptions = getExceptionTotalsByProgram().map(row => ({ name: row.name, exceptions: row.totalExceptions, atRiskCells: row.atRiskCells }));
  const priorities = getProgramFocusCards().filter(card => card.atRiskCellCount > 0).sort((a, b) => b.atRiskCellCount - a.atRiskCellCount || b.totalExceptionSignals - a.totalExceptionSignals);
  const matrixRows = getProgramRiskMatrix().filter(row => matrixProgram === "all" || row.program === matrixProgram);

  return <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-6">
    <header className="relative isolate overflow-hidden rounded-[2rem] border border-violet-200/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_48%,#f1edff_100%)] p-6 shadow-[0_30px_80px_-55px_rgba(76,29,149,0.7)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111024_52%,#18112e_100%)] sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-28 -z-10 size-96 rounded-full border-[48px] border-violet-200/20 dark:border-violet-800/10" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700 dark:text-violet-300"><ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" /> Ethiopian Food and Drug Authority</p>
        <span className="rounded-full border border-violet-200 bg-white/70 px-3 py-1 text-xs text-violet-800 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200">Regulatory performance</span>
      </div>
      <div className="mt-7 grid items-end gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">{user ? `Welcome, ${user.name}` : "Your performance workspace"}</p>
          <h1 className="text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl dark:text-white">Every program.<br /><span className="text-violet-600 dark:text-violet-400">One clear perspective.</span></h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">Move from regulatory priorities to the indicators behind them. Choose a workspace or explore the performance snapshot below.</p>
          <a href="#programs" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">Explore programs <ArrowDownIcon className="size-4" aria-hidden="true" /></a>
        </div>
        <div className="rounded-2xl border border-violet-200/70 bg-white/75 p-5 dark:border-violet-900 dark:bg-slate-950/60">
          <p className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300"><DatabaseIcon className="size-4" aria-hidden /> Curated snapshot · {overview.reportingPeriod}</p>
          <dl className="mt-5 grid grid-cols-3 gap-3 divide-x divide-violet-100 dark:divide-violet-900">
            {[{ value: overview.programsCount, label: "Programs" }, { value: overview.productLinesCount, label: "Product lines" }, { value: overview.atRiskCount, label: "Areas to review" }].map(stat => <div key={stat.label} className="pl-3 first:pl-0"><dt className="text-[11px] text-muted-foreground">{stat.label}</dt><dd className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{stat.value}</dd></div>)}
          </dl>
          <p className="mt-4 border-t border-violet-100 pt-3 text-xs leading-5 text-muted-foreground dark:border-violet-900">Sample and seeded data. Open a program workspace for available reporting data.</p>
        </div>
      </div>
    </header>

    <nav aria-label="Dashboard sections" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-2 shadow-sm">
      <div className="flex flex-wrap gap-1"><a href="#programs" className={jumpLink}><LayersIcon className="size-4" aria-hidden />Programs</a><a href="#performance-overview" className={jumpLink}><ChartNoAxesCombinedIcon className="size-4" aria-hidden />Performance</a><a href="#review-priorities" className={jumpLink}><CircleAlertIcon className="size-4" aria-hidden />Review priorities</a></div>
      <span className="px-3 py-2 text-xs text-muted-foreground">{overview.totalPairs} program / product-line views</span>
    </nav>

    <section id="programs" aria-labelledby="programs-title" className="scroll-mt-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-600 dark:text-violet-400">Choose your workspace</p><h2 id="programs-title" className="mt-1 text-xl font-semibold tracking-tight">Regulatory programs</h2></div><span className="text-xs text-muted-foreground">Explore indicators and reporting periods</span></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROGRAM_ORDER.map(key => {
          const program = programDashboardByKey[key];
          const copy = PROGRAM_COPY[key];
          const Icon = program.icon;
          return <Link key={key} href={program.href} className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 motion-reduce:transform-none sm:p-6">
            <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", copy.accent)} />
            <div className="flex items-center justify-between"><span className={cn("grid size-12 place-items-center rounded-2xl border", copy.icon)}><Icon className="size-6" strokeWidth={1.6} aria-hidden /></span><ArrowUpRightIcon className={cn("size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none", copy.text)} aria-hidden /></div>
            <p className={cn("mt-5 text-[10px] font-semibold uppercase tracking-[.14em]", copy.text)}>{copy.eyebrow}</p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-tight">{program.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{copy.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{copy.tags.map(tag => <span key={tag} className="rounded-md bg-muted/70 px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>)}</div>
            <div className={cn("mt-5 flex items-center justify-between border-t pt-4 text-xs font-semibold", copy.text)}>Open workspace <ArrowRightIcon className="size-4" aria-hidden /></div>
          </Link>;
        })}
      </div>
    </section>

    <section id="performance-overview" aria-labelledby="performance-title" className="scroll-mt-6 space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-600 dark:text-violet-400">At a glance</p><h2 id="performance-title" className="mt-1 text-xl font-semibold tracking-tight">Performance overview</h2></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDaysIcon className="size-3.5" aria-hidden /> Snapshot · {overview.reportingPeriod}</span></div>
      <details className="rounded-xl border bg-card px-4 py-3"><summary className="cursor-pointer text-xs font-medium focus-visible:outline-2 focus-visible:outline-violet-600">About this snapshot · sample and seeded data</summary><div className="mt-3 flex flex-wrap items-center gap-2">{sources.chips.map(chip => <DashboardSourceBadge key={chip.id} variant={chip.id === "ma" ? "seeded" : chip.id === "home" ? "derived" : "mock"} label={chip.label} />)}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{sources.fullNote}</p></details>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((card, index) => <ExecutiveMetricCard key={card.id} model={card} index={index} />)}</div>
    </section>

    <section id="review-priorities" aria-labelledby="priorities-title" className="scroll-mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/60 dark:bg-amber-950/10 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><CircleAlertIcon className="size-5" aria-hidden /></span><div><h2 id="priorities-title" className="text-lg font-semibold tracking-tight">Review priorities</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Based on sample and seeded signals. Programs with the most at-risk product lines appear first.</p></div></div>
      <div className="mt-4 grid gap-3 xl:grid-cols-3">{priorities.map(card => <Link key={card.program} href={card.href} className="group rounded-xl border bg-card p-4 transition-colors hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{card.title}</h3><DashboardStatusBadge status={card.focusCell.status} /></div><p className="mt-3 text-xs text-muted-foreground">Focus area · <span className="font-medium text-foreground">{card.focusLineLabel}</span></p><p className="mt-1 text-xs leading-5 text-muted-foreground">{card.atRiskCellCount} product {card.atRiskCellCount === 1 ? "line" : "lines"} to review · {card.totalExceptionSignals} exception signals</p><span className="mt-4 flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">Review program <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden /></span></Link>)}</div>
      {priorities.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No at-risk areas in this snapshot.</p>}
    </section>

    <section aria-label="Program status comparison" className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Compare the snapshot by program and product line.</p><Select value={matrixProgram} onValueChange={setMatrixProgram}><SelectTrigger aria-label="Program shown in status matrix" className="w-full rounded-xl sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All programs</SelectItem>{PROGRAM_ORDER.map(key => <SelectItem key={key} value={key}>{programDashboardByKey[key].title}</SelectItem>)}</SelectContent></Select></div>
      <DashboardRiskMatrix rows={matrixRows} />
    </section>
    <div className="grid items-start gap-5 xl:grid-cols-2"><StatusDistributionChart distribution={getStatusDistribution()} /><ProgramExceptionChart rows={exceptions} /></div>
    <footer className="flex flex-wrap justify-between gap-2 border-t pt-4 text-xs text-muted-foreground"><span>{overview.operationalLabel}</span><span>Snapshot updated {overview.lastUpdated}</span></footer>
  </div>;
}
