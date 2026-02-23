"use client";

import { useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI5Data } from "./hooks/useKPI5Data";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MAKPI5Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI5Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-5"
        title="Queries/FIRs Completed on Time"
        value={value}
        description="Queries/FIRs completed within timeline"
        status={status}
        icon={<AlertCircleIcon className="h-4 w-4" />}
        suffix="%"
        numerator={numerator}
        denominator={denominator}
        dataSource={dataSource}
        disaggregations={disaggregations}
        loading={loading}
        onClick={() => setIsModalOpen(true)}
      />
      {isModalOpen && maDrillDownData["MA-KPI-5"] && (
        <MADrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={maDrillDownData["MA-KPI-5"]}
        />
      )}
    </>
  );
}
