"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProgramFocusCardModel } from "@/data/dashboard-analytics";
import type { ProgramTone } from "@/data/dashboard-product-performance";
import { cn } from "@/lib/utils";

import { DashboardSourceBadge } from "./dashboard-source-badge";
import { formatSignalValue } from "./dashboard-format";
import { DashboardStatusBadge } from "./dashboard-status-badge";

const toneClasses: Record<
  ProgramTone,
  {
    accentBar: string;
    border: string;
    iconBg: string;
    ring: string;
  }
> = {
  blue: {
    accentBar: "bg-efda-clinical-trials",
    border: "border-efda-border-custom",
    iconBg:
      "bg-[color-mix(in_srgb,var(--color-efda-clinical-trials)_12%,transparent)] text-efda-clinical-trials ring-[color-mix(in_srgb,var(--color-efda-clinical-trials)_25%,transparent)]",
    ring: "focus-visible:ring-efda-primary",
  },
  green: {
    accentBar: "bg-efda-gmp-inspections",
    border: "border-efda-border-custom",
    iconBg:
      "bg-[color-mix(in_srgb,var(--color-efda-gmp-inspections)_12%,transparent)] text-efda-gmp-inspections ring-[color-mix(in_srgb,var(--color-efda-gmp-inspections)_25%,transparent)]",
    ring: "focus-visible:ring-efda-gmp-inspections",
  },
  purple: {
    accentBar: "bg-efda-market-authorizations",
    border: "border-efda-border-custom",
    iconBg:
      "bg-[color-mix(in_srgb,var(--color-efda-market-authorizations)_12%,transparent)] text-efda-market-authorizations ring-[color-mix(in_srgb,var(--color-efda-market-authorizations)_25%,transparent)]",
    ring: "focus-visible:ring-efda-market-authorizations",
  },
};

export function ProgramFocusCard({
  model,
  Icon,
  tone,
}: {
  model: ProgramFocusCardModel;
  Icon: LucideIcon;
  tone: ProgramTone;
}) {
  const t = toneClasses[tone];

  return (
    <Card
      className={cn(
        "overflow-hidden border bg-efda-surface shadow-md transition-colors hover:border-efda-primary/30 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:fill-mode-both motion-safe:duration-300 motion-reduce:animate-none",
        t.border,
      )}
    >
      <div className={cn("h-1 w-full", t.accentBar)} />

      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className={cn("rounded-xl p-2.5 ring-1", t.iconBg)}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight text-efda-text-primary">{model.title}</h3>
                <DashboardSourceBadge
                  variant={model.program === "marketAuthorizations" ? "seeded" : "mock"}
                  label={model.dataSourceLabel}
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{model.shortDescription}</p>
              <p className="sr-only">{model.dataSourceDetail}</p>
            </div>
          </div>

          <Button asChild variant="default" size="lg" className={cn("h-11 shrink-0 cursor-pointer px-5 bg-efda-primary text-white hover:bg-efda-primary/90 dark:bg-[color:var(--efda-primary)]", t.ring)}>
            <Link href={model.href} title={model.dataSourceDetail}>
              {model.ctaLabel}
              <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="rounded-xl border border-efda-border-custom bg-efda-surface-muted/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Highest-attention product line</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {model.focusLineLabel}
            </Badge>
            <DashboardStatusBadge status={model.focusCell.status} />
            {model.atRiskCellCount > 0 ? (
              <span className="text-xs font-medium text-efda-status-warning">{model.atRiskCellCount} at-risk pair(s) in program</span>
            ) : null}
          </div>
          <p className="mt-2 font-mono text-[11px] text-efda-text-muted">{model.focusCell.primaryMetric.code}</p>
          <p className="text-2xl font-semibold tabular-nums text-efda-primary dark:text-[color:var(--efda-primary)]">
            {formatSignalValue(model.focusCell.primaryMetric)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{model.focusCell.primaryMetric.title}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Aggregate exception signals in program snapshot:{" "}
            <span className="font-semibold text-foreground">{model.totalExceptionSignals}</span>
          </p>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">{model.dataSourceDetail}</p>
      </CardContent>
    </Card>
  );
}
