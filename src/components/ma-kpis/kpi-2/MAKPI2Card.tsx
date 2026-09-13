"use client";

import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI2Data } from "./hooks/useKPI2Data";

export function MAKPI2Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI2Data();
  const router = useRouter();

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
        onClick={() => router.push("/market-authorizations/drilldown/MA-KPI-2?product=medicine")}
      />
    </>
  );
}
