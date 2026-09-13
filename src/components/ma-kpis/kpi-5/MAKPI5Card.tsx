"use client";


import { AlertCircleIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI5Data } from "./hooks/useKPI5Data";

export function MAKPI5Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI5Data();


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
        onClick={undefined}
      />
    </>
  );
}
