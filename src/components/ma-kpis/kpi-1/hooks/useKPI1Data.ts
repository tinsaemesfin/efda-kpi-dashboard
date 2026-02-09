/**
 * Hook for KPI-1 data fetching and filtering
 * New MA Applications Completed on Time
 */

import { useMemo } from "react";
import { useMADashboard } from "../../shared/context/MADashboardContext";
import { useFilteredKPIValue } from "../../shared/hooks/useFilteredKPIValue";
import { useKPIStatus } from "../../shared/hooks/useKPIStatus";
import { maKPIData } from "@/data/ma-dummy-data";

export function useKPI1Data() {
  const { dashboardFilter, apiData, apiLoading } = useMADashboard();
  const { getFilteredQuarterlyValue } = useFilteredKPIValue();
  const getStatus = useKPIStatus();

  // Try API first, fallback to dummy data
  const kpiData = useMemo(() => {
    if (apiData && apiData["MA-KPI-1"]) {
      return {
        ...apiData["MA-KPI-1"],
        dataSource: "api" as const,
      };
    }

    // Fallback to dummy data
    const filtered = getFilteredQuarterlyValue(maKPIData.kpi1);
    return {
      percentage: filtered.percentage,
      numerator: filtered.numerator,
      denominator: filtered.denominator,
      dataSource: "dummy" as const,
      disaggregations: {},
    };
  }, [apiData, dashboardFilter, getFilteredQuarterlyValue]);

  const status = getStatus({ percentage: kpiData.percentage });
  const loading = apiLoading && kpiData.dataSource === "dummy";

  return {
    value: kpiData.percentage?.toFixed(1) ?? "0",
    status,
    loading,
    numerator: kpiData.numerator,
    denominator: kpiData.denominator,
    dataSource: kpiData.dataSource,
    disaggregations: kpiData.disaggregations || {},
  };
}
