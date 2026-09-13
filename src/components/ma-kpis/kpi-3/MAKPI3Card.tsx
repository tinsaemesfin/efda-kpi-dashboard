"use client";

import { useRouter } from "next/navigation";
import { FileEditIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI3Data } from "./hooks/useKPI3Data";

export function MAKPI3Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI3Data();
  const router = useRouter();

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
        onClick={() => router.push("/market-authorizations/drilldown/MA-KPI-3?product=medicine")}
      />
    </>
  );
}
