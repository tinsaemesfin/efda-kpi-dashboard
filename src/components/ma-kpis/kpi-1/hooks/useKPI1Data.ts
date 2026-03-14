/**
 * Hook for KPI-1 data fetching and filtering
 * New MA Applications Completed on Time
 */

import { useMemo } from "react";
import { useMADashboard } from "../../shared/context/MADashboardContext";
import { useKPIStatus } from "../../shared/hooks/useKPIStatus";

type DisaggregationItem = {
  code?: string;
  label: string;
  value: number;
  total?: number;
  percentage: number;
};

export function useKPI1Data() {
  const { apiData, apiLoading, apiError } = useMADashboard();
  const getStatus = useKPIStatus();

  const kpiData = apiData?.["MA-KPI-1"] ?? null;
  const loading = apiLoading && !kpiData && !apiError;
  const hasData = Boolean(kpiData);
  const errorMessage = !loading && !hasData ? apiError?.message || "No MA KPI 1 data returned from API" : null;

  const percentage = kpiData?.percentage ?? 0;
  const numerator = kpiData?.numerator ?? 0;
  const denominator = kpiData?.denominator ?? 0;
  const disaggregations = useMemo<Record<string, DisaggregationItem>>(
    () => ({}),
    []
  );

  const status = getStatus({ percentage });
  const submoduleRows = useMemo(() => {
    return Object.values(disaggregations)
      .map((item) => ({
        code: item.code ?? item.label,
        label: item.label,
        onTime: item.value,
        total: item.total ?? (item.percentage > 0 ? Math.round(item.value / (item.percentage / 100)) : 0),
        percentage: item.percentage,
      }))
      .sort((a, b) => b.total - a.total);
  }, [disaggregations]);

  return {
    value: percentage.toFixed(1),
    status,
    loading,
    numerator,
    denominator,
    dataSource: "api" as const,
    disaggregations,
    submoduleRows,
    hasData,
    errorMessage,
  };
}
