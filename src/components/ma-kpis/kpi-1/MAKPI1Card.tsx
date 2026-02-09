"use client";

import { useState } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { KPICardBase } from "../shared/components/KPICardBase";
import { useKPI1Data } from "./hooks/useKPI1Data";
import { MAKPI1Modal } from "./MAKPI1Modal";

export function MAKPI1Card() {
  const { value, status, loading, numerator, denominator, dataSource, disaggregations } = useKPI1Data();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <KPICardBase
        kpiId="MA-KPI-1"
        title="New MA Applications Completed on Time"
        value={value}
        description="Applications completed within timeline"
        status={status}
        icon={<ClipboardCheckIcon className="h-4 w-4" />}
        suffix="%"
        numerator={numerator}
        denominator={denominator}
        dataSource={dataSource}
        disaggregations={disaggregations}
        loading={loading}
        onClick={() => setIsModalOpen(true)}
      />
      <MAKPI1Modal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
