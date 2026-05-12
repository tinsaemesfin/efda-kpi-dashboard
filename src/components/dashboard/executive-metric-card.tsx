"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { MajorSignalCardModel } from "@/data/dashboard-analytics";
import { cn } from "@/lib/utils";

import { DashboardSourceBadge } from "./dashboard-source-badge";

export function ExecutiveMetricCard({
  model,
  index = 0,
}: {
  model: MajorSignalCardModel;
  index?: number;
}) {
  const provenanceLabel =
    model.provenance === "ma_subset"
      ? "MA seed subset"
      : "Derived from snapshot";

  return (
    <Card
      className={cn(
        "overflow-hidden border-efda-border-custom bg-efda-surface shadow-sm transition-colors hover:border-efda-primary/35",
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-both motion-reduce:animate-none",
      )}
      style={{ animationDelay: `${index * 40}ms`, animationDuration: "280ms" }}
    >
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{model.label}</p>
          <DashboardSourceBadge variant={model.provenance === "ma_subset" ? "seeded" : "derived"} label={provenanceLabel} />
        </div>
        <p className="text-2xl font-semibold tabular-nums text-efda-primary dark:text-[color:var(--efda-primary)]">{model.value}</p>
        <p className="mt-auto text-xs leading-relaxed text-muted-foreground">{model.helper}</p>
      </CardContent>
    </Card>
  );
}
