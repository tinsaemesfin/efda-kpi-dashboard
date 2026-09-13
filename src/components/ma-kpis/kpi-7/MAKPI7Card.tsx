"use client";

import { useRouter } from "next/navigation";
import { BarChart3Icon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI7Data } from "./hooks/useKPI7Data";

export function MAKPI7Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI7Data();
  const router = useRouter();


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
        onClick={() => router.push("/market-authorizations/drilldown/MA-KPI-7?product=medicine")}
      />
    </>
  );
}
