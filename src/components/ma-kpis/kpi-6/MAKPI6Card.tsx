"use client";

import { useState } from "react";
import { ClockIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI6Data } from "./hooks/useKPI6Data";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MAKPI6Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI6Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      {isModalOpen && maDrillDownData["MA-KPI-6"] && (
        <MADrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={maDrillDownData["MA-KPI-6"]}
        />
      )}
    </>
  );
}
