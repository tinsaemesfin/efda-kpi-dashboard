"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon } from "lucide-react";
import { RequirementToggle, KPIFilter } from "@/components/kpi";
import { useMADashboard } from "../context/MADashboardContext";

export function DashboardFilters() {
  const { showRequirements, setShowRequirements, dashboardFilter, setDashboardFilter } =
    useMADashboard();

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <RequirementToggle
            enabled={showRequirements}
            onChange={setShowRequirements}
            category="Market Authorization"
          />
          <Badge variant="outline" className="border-dashed">
            Deep dive & drill-down ready
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
            SLA-driven targets overlayed on charts
          </div>
        </div>
      </div>

      <KPIFilter
        onFilterChange={setDashboardFilter}
        defaultYear={2024}
        defaultQuarter="Q4"
        showAllModes={true}
      />
    </>
  );
}
