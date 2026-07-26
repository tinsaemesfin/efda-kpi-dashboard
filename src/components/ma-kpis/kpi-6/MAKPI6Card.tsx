"use client";

import { useMemo, useState } from "react";
import { ClockIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI6Data } from "./hooks/useKPI6Data";
import { MATimeDrillDownModal } from "@/components/kpi/ma-time-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import type { MATimeDrillDownData } from "@/types/ma-drilldown";

export function MAKPI6Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI6Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const timeDrilldownFallback = useMemo((): MATimeDrillDownData => {
    const seed = maDrillDownData["MA-KPI-6"];
    return {
      kpiId: "MA-KPI-6",
      kpiName: seed?.kpiName ?? "Median Time for New MA Applications",
      metricType: "median",
      currentValue: {
        value: seed?.currentValue.median ?? seed?.currentValue.value ?? 0,
        median: seed?.currentValue.median ?? seed?.currentValue.value,
        targetDays: 270,
      },
      categoryViews: [],
    };
  }, []);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-6"
        title="Median Time for New MA Applications"
        value={value}
        description="Median processing time in days"
        status={status}
        icon={<ClockIcon className="h-4 w-4" />}
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
