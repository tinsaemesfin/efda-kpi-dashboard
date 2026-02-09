"use client";

import { useState } from "react";
import { FileEditIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI3Data } from "./hooks/useKPI3Data";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MAKPI3Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI3Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-3"
        title="Minor Variation Applications Completed on Time"
        value={value}
        description="Minor variations completed within timeline"
        status={status}
        icon={<FileEditIcon className="h-4 w-4" />}
        suffix="%"
        numerator={numerator}
        denominator={denominator}
        dataSource={dataSource}
        disaggregations={disaggregations}
        loading={loading}
        onClick={() => setIsModalOpen(true)}
      />
      {isModalOpen && maDrillDownData["MA-KPI-3"] && (
        <MADrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={maDrillDownData["MA-KPI-3"]}
        />
      )}
    </>
  );
}
