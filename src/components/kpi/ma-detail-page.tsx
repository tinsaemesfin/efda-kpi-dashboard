"use client";

import { useMemo } from "react";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import { DrilldownPage } from "./drilldown-page";
import { MADrillDownDetail } from "./ma-drilldown-detail";
import { MATimeDrillDownDetail } from "./ma-time-drilldown-detail";
import { drilldownQuery, MA_PRODUCTS, readDrilldownFilters, readMAProduct } from "@/lib/drilldown-navigation";
import type { MATimeDrillDownData } from "@/types/ma-drilldown";

export function MADetailPage({ kpiId, query }: { kpiId: string; query: string }) {
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const product = readMAProduct(params.get("product"));
  const filters = useMemo(() => readDrilldownFilters(params), [params]);
  const data = maDrillDownData[kpiId];
  const isTime = kpiId === "MA-KPI-6" || kpiId === "MA-KPI-7";
  const timeData = useMemo<MATimeDrillDownData>(() => ({
    kpiId: kpiId === "MA-KPI-6" ? "MA-KPI-6" : "MA-KPI-7",
    kpiName: data.kpiName, metricType: kpiId === "MA-KPI-6" ? "median" : "average",
    currentValue: { value: Number.NaN }, categoryViews: [],
  }), [kpiId, data.kpiName]);
  return <DrilldownPage backHref={`/market-authorizations?${drilldownQuery(filters, product)}`} label={`Market authorizations · ${MA_PRODUCTS[product]}`}>
    {product === "cosmetics" && kpiId === "MA-KPI-4" ? <p>This KPI does not apply to cosmetics.</p> : isTime
      ? <MATimeDrillDownDetail data={timeData} product={product} filters={filters} />
      : <MADrillDownDetail data={data} drilldownSource={product} filters={filters} />}
  </DrilldownPage>;
}
