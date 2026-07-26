"use client";

import { useMemo, useState } from "react";
import { BarChart3Icon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI7Data } from "./hooks/useKPI7Data";
import { MATimeDrillDownModal } from "@/components/kpi/ma-time-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import type { MATimeDrillDownData } from "@/types/ma-drilldown";

export function MAKPI7Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI7Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const timeDrilldownFallback = useMemo((): MATimeDrillDownData => {
    const seed = maDrillDownData["MA-KPI-7"];
    return {
      kpiId: "MA-KPI-7",
      kpiName: seed?.kpiName ?? "Average Time for New MA Applications",
      metricType: "average",
      currentValue: {
        value: seed?.currentValue.average ?? seed?.currentValue.value ?? 0,
        average: seed?.currentValue.average ?? seed?.currentValue.value,
        targetDays: 270,
      },
      categoryViews: [],
    };
  }, []);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-7"
        title="Average Time for New MA Applications"
        value={value}
        description="Average processing time in days"
        status={status}
        icon={<BarChart3Icon className="h-4 w-4" />}
        suffix=" days"
        numerator={numerator}
        denominator={denominator}
        dataSource={dataSource}
        disaggregations={disaggregations}
        loading={loading}
        onClick={() => setIsModalOpen(true)}
      />
      {isModalOpen && (
        <MATimeDrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={timeDrilldownFallback}
        />
      )}
    </>
  );
}
