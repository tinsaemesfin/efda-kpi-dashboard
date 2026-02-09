"use client";

import { Badge } from "@/components/ui/badge";
import { useKPI1Charts } from "../hooks/useKPI1Charts";
import type { IndividualApplication } from "@/types/ma-drilldown";

interface KPI1MetricCardsProps {
  workingSet: IndividualApplication[];
}

export function KPI1MetricCards({ workingSet }: KPI1MetricCardsProps) {
  const { metrics } = useKPI1Charts(workingSet, "Quarterly");

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border bg-muted/40 p-4">
        <div className="text-xs uppercase text-muted-foreground">On-time rate</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-bold">{metrics.onTimeRate.toFixed(1)}%</div>
          <Badge variant="outline">
            Gap {Math.max(0, 90 - metrics.onTimeRate).toFixed(1)}%
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Target ≥ 90% | {metrics.onTimeCount}/{metrics.volume} on time
        </p>
      </div>
      <div className="rounded-xl border bg-muted/40 p-4">
        <div className="text-xs uppercase text-muted-foreground">Workload</div>
        <div className="mt-1 text-3xl font-bold">{metrics.volume.toLocaleString()}</div>
        <p className="text-sm text-muted-foreground">Filtered application count</p>
      </div>
      <div className="rounded-xl border bg-muted/40 p-4">
        <div className="text-xs uppercase text-muted-foreground">Median days</div>
        <div className="mt-1 text-3xl font-bold">
          {metrics.medianProcessing ? metrics.medianProcessing.toFixed(0) : "—"}
        </div>
        <p className="text-sm text-muted-foreground">Processing time (stop-clock adjusted)</p>
      </div>
      <div className="rounded-xl border bg-muted/40 p-4">
        <div className="text-xs uppercase text-muted-foreground">Average days</div>
        <div className="mt-1 text-3xl font-bold">
          {metrics.averageProcessing ? metrics.averageProcessing.toFixed(1) : "—"}
        </div>
        <p className="text-sm text-muted-foreground">Mean cycle duration</p>
      </div>
    </div>
  );
}
