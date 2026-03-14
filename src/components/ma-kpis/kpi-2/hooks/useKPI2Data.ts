/**
 * Hook for KPI-2 data fetching and filtering
 * Renewal MA Applications Completed on Time
 */

import { useMemo } from "react";
import { useMADashboard } from "../../shared/context/MADashboardContext";
import { useFilteredKPIValue } from "../../shared/hooks/useFilteredKPIValue";
import { useKPIStatus } from "../../shared/hooks/useKPIStatus";
import { maKPIData } from "@/data/ma-dummy-data";

export function useKPI2Data() {
  const { dashboardFilter, apiData, apiLoading } = useMADashboard();
  const { getFilteredQuarterlyValue } = useFilteredKPIValue();
  const getStatus = useKPIStatus();

  const kpiData = useMemo(() => {
    if (apiData && apiData["MA-KPI-2"]) {
      return {
        ...apiData["MA-KPI-2"],
        dataSource: "api" as const,
      };
    }

    const filtered = getFilteredQuarterlyValue(maKPIData.kpi2);
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
