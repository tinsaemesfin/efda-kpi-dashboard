"use client";

import { useState } from "react";
import { BarChart3Icon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI7Data } from "./hooks/useKPI7Data";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MAKPI7Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI7Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      {isModalOpen && maDrillDownData["MA-KPI-7"] && (
        <MADrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={maDrillDownData["MA-KPI-7"]}
        />
      )}
    </>
  );
}
