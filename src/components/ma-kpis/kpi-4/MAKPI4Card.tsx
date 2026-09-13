"use client";

import { useRouter } from "next/navigation";
import { FileSearchIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI4Data } from "./hooks/useKPI4Data";

export function MAKPI4Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI4Data();
  const router = useRouter();

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
        onClick={() => router.push("/market-authorizations/drilldown/MA-KPI-4?product=medicine")}
      />
    </>
  );
}
