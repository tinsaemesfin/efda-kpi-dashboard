import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CTDrilldownDetail } from "@/components/dashboard/ct-drilldown-detail";
import { DrilldownPage } from "@/components/kpi/drilldown-page";
import { CT_DRILLDOWN_REPORT_IDS } from "@/lib/ct-api/constants";
import type { CTKPIId } from "@/types/ct-api";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ kpiId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kpiId } = await params;
  if (!CT_DRILLDOWN_REPORT_IDS[kpiId as CTKPIId]) notFound();
  const query = await searchParams;
  const serialized = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  ).toString();
  return (
    <DrilldownPage backHref={`/clinical-trials?${serialized}`} label="Clinical trials">
      <Suspense fallback={null}>
        <CTDrilldownDetail kpiId={kpiId} query={serialized} />
      </Suspense>
    </DrilldownPage>
  );
}
