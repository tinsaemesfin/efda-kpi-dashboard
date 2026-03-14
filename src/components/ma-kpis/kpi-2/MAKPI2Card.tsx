"use client";

import { useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI2Data } from "./hooks/useKPI2Data";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MAKPI2Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI2Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-2"
        title="Renewal MA Applications Completed on Time"
        value={value}
        description="Renewals completed within timeline"
        status={status}
        icon={<RefreshCwIcon className="h-4 w-4" />}
        suffix="%"
        numerator={numerator}
        denominator={denominator}
        dataSource={dataSource}
        disaggregations={disaggregations}
        loading={loading}
        onClick={() => setIsModalOpen(true)}
      />
      {isModalOpen && maDrillDownData["MA-KPI-2"] && (
        <MADrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={maDrillDownData["MA-KPI-2"]}
        />
      )}
    </>
  );
}
