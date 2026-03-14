"use client";

import { useState } from "react";
import { FileSearchIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI4Data } from "./hooks/useKPI4Data";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MAKPI4Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI4Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-4"
        title="Major Variation Applications Completed on Time"
        value={value}
        description="Major variations completed within timeline"
        status={status}
        icon={<FileSearchIcon className="h-4 w-4" />}
        suffix="%"
        numerator={numerator}
        denominator={denominator}
        dataSource={dataSource}
        disaggregations={disaggregations}
        loading={loading}
        onClick={() => setIsModalOpen(true)}
      />
      {isModalOpen && maDrillDownData["MA-KPI-4"] && (
        <MADrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={maDrillDownData["MA-KPI-4"]}
        />
      )}
    </>
  );
}
