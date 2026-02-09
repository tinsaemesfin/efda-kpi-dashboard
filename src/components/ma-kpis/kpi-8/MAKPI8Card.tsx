"use client";

import { useState } from "react";
import { FileTextIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI8Data } from "./hooks/useKPI8Data";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MAKPI8Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI8Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-8"
        title="PARs Published on Time"
        value={value}
        description="Public Assessment Reports published within timeline"
        status={status}
        icon={<FileTextIcon className="h-4 w-4" />}
        suffix="%"
        numerator={numerator}
        denominator={denominator}
        dataSource={dataSource}
        disaggregations={disaggregations}
        loading={loading}
        onClick={() => setIsModalOpen(true)}
      />
      {isModalOpen && maDrillDownData["MA-KPI-8"] && (
        <MADrillDownModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={maDrillDownData["MA-KPI-8"]}
        />
      )}
    </>
  );
}
