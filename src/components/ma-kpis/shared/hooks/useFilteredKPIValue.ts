/**
 * Hook to filter KPI data based on dashboard filter state
 */

import { useCallback } from "react";
import { useMADashboard } from "../context/MADashboardContext";
import {
  filterQuarterlyData,
  filterAnnualData,
  parseQuarter,
  type QuarterlyDataPoint,
  type AnnualDataPoint,
} from "@/lib/utils/kpi-filter";
import type { QuarterlyMAData, AnnualMAData } from "@/types/ma-kpi";

interface QuarterlyKPIData {
  quarterlyData?: QuarterlyMAData[];
  currentQuarter: {
    numerator?: number;
    denominator?: number;
    percentage?: number;
  };
}

interface AnnualKPIData {
  annualData?: AnnualMAData[];
  currentYear: {
    numerator?: number;
    denominator?: number;
    median?: number;
    average?: number;
  };
}

/**
 * Hook to get filtered quarterly KPI value
 */
export function useFilteredKPIValue() {
  const { dashboardFilter } = useMADashboard();
  
  const getFilteredQuarterlyValue = useCallback(
    <T extends QuarterlyKPIData>(kpiData: T): T["currentQuarter"] => {
      if (!kpiData.quarterlyData) return kpiData.currentQuarter;
      
      const filtered = filterQuarterlyData(
        kpiData.quarterlyData.map((q) => {
          const parsed = parseQuarter(q.quarter);
          return {
            quarter: q.quarter,
            year: parsed?.year,
            quarterNumber: parsed ? parseInt(parsed.quarter.slice(1)) : undefined,
            ...q.value,
          };
        }),
        dashboardFilter
      );
      
      // Return the most recent matching value, or fallback to currentQuarter
      return filtered.length > 0 ? filtered[filtered.length - 1] : kpiData.currentQuarter;
    },
    [dashboardFilter]
  );
  
  const getFilteredAnnualValue = useCallback(
    <T extends AnnualKPIData>(kpiData: T): T["currentYear"] => {
      if (!kpiData.annualData) return kpiData.currentYear;
      
      const filtered = filterAnnualData(
        kpiData.annualData.map((a) => ({
          year: a.year,
          ...a.value,
        })),
        dashboardFilter
      );
      
      return filtered.length > 0 ? filtered[filtered.length - 1] : kpiData.currentYear;
    },
    [dashboardFilter]
  );
  
  return {
    getFilteredQuarterlyValue,
    getFilteredAnnualValue,
  };
}
