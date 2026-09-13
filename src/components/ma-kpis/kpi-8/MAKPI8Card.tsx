"use client";

import { useRouter } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI8Data } from "./hooks/useKPI8Data";

export function MAKPI8Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI8Data();
  const router = useRouter();

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
        onClick={() => router.push("/market-authorizations/drilldown/MA-KPI-8?product=medicine")}
      />
    </>
  );
}
