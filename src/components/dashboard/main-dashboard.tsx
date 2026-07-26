"use client";

import {
  ActivityIcon,
  CalendarIcon,
  ClipboardListIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDashboardOverviewModel,
  getExceptionTotalsByProgram,
  getMajorExecutiveCards,
  getProgramFocusCards,
  getProgramRiskMatrix,
  getSourceQualitySummary,
  getStatusDistribution,
} from "@/data/dashboard-analytics";
import {
  PROGRAM_ORDER,
  programDashboardByKey,
} from "@/data/dashboard-product-performance";

import { DashboardSourceBadge } from "./dashboard-source-badge";
import { ExecutiveMetricCard } from "./executive-metric-card";
import { ProgramExceptionChart } from "./program-exception-chart";
import { ProgramFocusCard } from "./program-focus-card";
import { DashboardRiskMatrix } from "./risk-matrix";
import { StatusDistributionChart } from "./status-distribution-chart";

type DashboardUser = {
  name: string;
  email?: string;
  role?: string;
};

export function MainDashboard({ user }: { user?: DashboardUser }) {
  const overview = getDashboardOverviewModel();
  const sourceSummary = getSourceQualitySummary();
  const majorCards = getMajorExecutiveCards();
  const matrix = getProgramRiskMatrix();
  const distribution = getStatusDistribution();
  const exceptionRows = getExceptionTotalsByProgram().map((row) => ({
    name: row.name,
    exceptions: row.totalExceptions,
    atRiskCells: row.atRiskCells,
  }));
  const focusCards = getProgramFocusCards();

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 overflow-x-hidden">
      {/* Command center */}
      <header className="relative overflow-hidden rounded-2xl border border-efda-border-custom bg-gradient-to-br from-efda-surface via-efda-surface to-[color-mix(in_srgb,var(--color-efda-primary)_6%,var(--color-efda-surface))] shadow-sm md:rounded-[1.35rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-1/3 max-w-md bg-[radial-gradient(ellipse_at_top_right,var(--color-efda-primary)_0%,transparent_65%)] opacity-[0.12] motion-reduce:opacity-5"
        />
        <div className="relative p-5 md:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              {user ? <p className="text-sm font-medium text-muted-foreground">Welcome, {user.name}</p> : null}
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-efda-text-primary md:text-4xl">
                EFDA KPI{" "}
                <span className="bg-[linear-gradient(to_right,var(--color-efda-primary),var(--color-efda-status-good))] bg-clip-text text-transparent dark:text-[color:var(--efda-primary)]">
                  Dashboard
                </span>
              </h1>
              <p className="mt-3 flex items-start gap-2 text-base leading-7 text-muted-foreground">
                <SparklesIcon className="mt-1 h-4 w-4 shrink-0 text-efda-primary opacity-90" aria-hidden />
                Major signals only — open each program workspace for full KPI inventories, drilldowns, and filters.
              </p>
              {user?.role ? <p className="mt-2 text-sm text-muted-foreground">Role: {user.role}</p> : null}

              <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Data provenance">
                {sourceSummary.chips.map((c) => (
                  <DashboardSourceBadge key={c.id} variant={c.id === "ma" ? "seeded" : c.id === "home" ? "derived" : "mock"} label={c.label} />
                ))}
              </div>
              <p className="sr-only">{sourceSummary.fullNote}</p>
            </div>

            <aside className="grid min-w-0 gap-3 sm:grid-cols-2 xl:flex xl:max-w-md xl:flex-col">
              <div className="rounded-xl border border-efda-border-strong/80 bg-efda-surface/90 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-efda-primary">Snapshot</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Reporting period</dt>
                    <dd className="font-mono font-medium text-foreground">{overview.reportingPeriod}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Pairs in view</dt>
                    <dd className="font-mono font-medium text-foreground">{overview.totalPairs}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Product lines</dt>
                    <dd className="font-mono font-medium text-foreground">{overview.productLinesCount}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Needs attention</dt>
                    <dd className="font-mono font-semibold text-efda-status-warning">{overview.atRiskCount}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-efda-border-custom bg-efda-surface-muted/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-efda-secondary">
                  <ActivityIcon className="h-4 w-4" aria-hidden />
                  Monitoring overview
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{overview.operationalLabel}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  <CalendarIcon className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Last updated: {overview.lastUpdated}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </header>

      {/* Major signals */}
      <section aria-labelledby="major-signals-title" className="space-y-3">
        <h2 id="major-signals-title" className="text-lg font-semibold tracking-tight text-efda-text-primary">
          Major indicators
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {majorCards.map((card, i) => (
            <ExecutiveMetricCard key={card.id} model={card} index={i} />
          ))}
        </div>
      </section>

      {/* Matrix + charts */}
      <div className="grid gap-6 lg:gap-8 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <DashboardRiskMatrix rows={matrix} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-5">
          <StatusDistributionChart distribution={distribution} />
          <ProgramExceptionChart rows={exceptionRows} />
        </div>
      </div>

      {/* Program CTAs */}
      <section aria-labelledby="program-focus-title" className="space-y-4">
        <div>
          <h2 id="program-focus-title" className="text-lg font-semibold tracking-tight text-efda-text-primary">
            Programs
          </h2>
          <p className="text-sm text-muted-foreground">
            Highest-attention product line per program. Full KPI grids and timelines live on each workspace.
          </p>
        </div>
        <div className="flex flex-col gap-8">
          {PROGRAM_ORDER.map((pk) => {
            const meta = programDashboardByKey[pk];
            const focus = focusCards.find((f) => f.program === pk);
            if (!focus) return null;
            return (
              <ProgramFocusCard key={pk} model={focus} Icon={meta.icon} tone={meta.tone} />
            );
          })}
        </div>
      </section>

      {/* Operational strip */}
      <section aria-labelledby="operational-strip-title">
        <Card className="border-efda-border-custom bg-efda-surface shadow-sm">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="flex flex-wrap items-start gap-3">
              <ClipboardListIcon className="h-5 w-5 shrink-0 text-efda-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="operational-strip-title" className="text-lg font-semibold tracking-tight text-efda-text-primary">
                  Coverage & freshness
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{sourceSummary.fullNote}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-efda-border-custom pt-4">
              <Badge variant="outline" className="border-efda-border-custom bg-efda-surface-muted">
                <ActivityIcon className="mr-1 h-3.5 w-3.5 text-efda-secondary" aria-hidden />
                {overview.operationalLabel}
              </Badge>
              <Badge variant="outline" className="border-efda-border-custom">
                Most stable line: {overview.bestProductLine}
              </Badge>
              <Badge variant="outline" className="border-efda-border-custom">
                <CalendarIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                Period: {overview.reportingPeriod}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
