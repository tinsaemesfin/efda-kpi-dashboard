"use client";

import { useMemo } from "react";
import { useGMPDrilldown, useGMPFaceMetrics } from "@/hooks/useGMPReports";
import { drilldownQuery, readDrilldownFilters } from "@/lib/drilldown-navigation";
import type { GMPKPIId } from "@/types/gmp-api";
import { DrilldownPage } from "./drilldown-page";
import { GMPApiDrilldownDetail } from "./gmp-api-drilldown-detail";

export function GMPDetailPage({ kpiId, title, query }: { kpiId: GMPKPIId; title: string; query: string }) {
  const filters = useMemo(() => {
    const dates = readDrilldownFilters(new URLSearchParams(query));
    return { startDate: dates.startDate, endDate: dates.endDate };
  }, [query]);
  const { metrics } = useGMPFaceMetrics(filters, true);
  const drilldown = useGMPDrilldown(kpiId, filters, true);
  return <DrilldownPage backHref={`/gmp-inspections?${drilldownQuery(filters)}`} label="GMP inspections">
    <GMPApiDrilldownDetail kpiId={kpiId} title={title} metric={metrics[kpiId]} reports={drilldown.reports}
      supported={drilldown.supported} loading={drilldown.loading} error={drilldown.error}
      periodLabel={filters.startDate || filters.endDate ? `${filters.startDate ?? "Beginning"} – ${filters.endDate ?? "Present"}` : "All available data"} />
  </DrilldownPage>;
}
