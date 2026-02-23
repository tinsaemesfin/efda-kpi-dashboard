import { useMemo } from "react";
import { useMADashboard } from "../../shared/context/MADashboardContext";
import { useFilteredKPIValue } from "../../shared/hooks/useFilteredKPIValue";
import { useKPIStatus } from "../../shared/hooks/useKPIStatus";
import { maKPIData } from "@/data/ma-dummy-data";

export function useKPI7Data() {
  const { dashboardFilter, apiData, apiLoading } = useMADashboard();
  const { getFilteredAnnualValue } = useFilteredKPIValue();
  const getStatus = useKPIStatus();

  const kpiData = useMemo(() => {
    // KPI-7 uses annual data, not API data currently
    const filtered = getFilteredAnnualValue(maKPIData.kpi7);
    return {
      average: filtered.average,
      numerator: filtered.numerator,
      denominator: filtered.denominator,
      dataSource: "dummy" as const,
      disaggregations: {},
    };
  }, [dashboardFilter, getFilteredAnnualValue]);

  const status = getStatus({ average: kpiData.average });
  const loading = apiLoading;

  return {
    value: kpiData.average?.toFixed(1) ?? "0",
    status,
    loading,
    numerator: kpiData.numerator,
    denominator: kpiData.denominator,
    dataSource: kpiData.dataSource,
    disaggregations: kpiData.disaggregations || {},
  };
}
