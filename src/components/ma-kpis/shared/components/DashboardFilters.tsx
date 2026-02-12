"use client";

import { CheckCircle2Icon } from "lucide-react";
import { KPIFilter } from "@/components/kpi";
import { useMADashboard } from "../context/MADashboardContext";

export function DashboardFilters() {
  const { dashboardFilter, setDashboardFilter } = useMADashboard();

  return (
    <>
      <div className="flex justify-end">
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
