"use client";

import { useRouter } from "next/navigation";
import { ClockIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI6Data } from "./hooks/useKPI6Data";

export function MAKPI6Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI6Data();
  const router = useRouter();


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
        onClick={() => router.push("/market-authorizations/drilldown/MA-KPI-6?product=medicine")}
      />
    </>
  );
}
