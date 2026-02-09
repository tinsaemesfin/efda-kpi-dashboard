import { useMemo } from "react";
import { useMADashboard } from "../../shared/context/MADashboardContext";
import { useFilteredKPIValue } from "../../shared/hooks/useFilteredKPIValue";
import { useKPIStatus } from "../../shared/hooks/useKPIStatus";
import { maKPIData } from "@/data/ma-dummy-data";

export function useKPI6Data() {
  const { dashboardFilter, apiData, apiLoading } = useMADashboard();
  const { getFilteredAnnualValue } = useFilteredKPIValue();
  const getStatus = useKPIStatus();

  const kpiData = useMemo(() => {
    // KPI-6 uses annual data, not API data currently
    const filtered = getFilteredAnnualValue(maKPIData.kpi6);
    return {
      median: filtered.median,
      numerator: filtered.numerator,
      denominator: filtered.denominator,
      dataSource: "dummy" as const,
      disaggregations: {},
    };
  }, [dashboardFilter, getFilteredAnnualValue]);

  const status = getStatus({ median: kpiData.median });
  const loading = apiLoading;

  return {
    value: kpiData.median?.toFixed(0) ?? "0",
    status,
    loading,
    numerator: kpiData.numerator,
    denominator: kpiData.denominator,
    dataSource: kpiData.dataSource,
    disaggregations: kpiData.disaggregations || {},
  };
}
