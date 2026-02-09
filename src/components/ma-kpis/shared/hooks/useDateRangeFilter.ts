/**
 * Hook for custom date range filtering (Future implementation)
 * Currently provides foundation for date range picker integration
 */

import { useCallback } from "react";
import { useMADashboard } from "../context/MADashboardContext";
import { parseQuarter } from "@/lib/utils/kpi-filter";
import type { QuarterlyMAData } from "@/types/ma-kpi";

/**
 * Hook to manage date range filtering
 * When dateRange is set, filters data by custom date range instead of quarter/year
 */
export function useDateRangeFilter() {
  const { dateRange, setDateRange } = useMADashboard();
  
  const filterByDateRange = useCallback(
    (data: QuarterlyMAData[]): QuarterlyMAData[] => {
      if (!dateRange) return data;
      
      return data.filter((item) => {
        const parsed = parseQuarter(item.quarter);
        if (!parsed) return false;
        
        // Convert quarter to approximate date (start of quarter)
        const quarterStartMonths = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };
        const quarterStart = new Date(parsed.year, quarterStartMonths[parsed.quarter], 1);
        const quarterEnd = new Date(parsed.year, quarterStartMonths[parsed.quarter] + 3, 0);
        
        // Check if quarter overlaps with date range
        return quarterStart <= dateRange.end && quarterEnd >= dateRange.start;
      });
    },
    [dateRange]
  );
  
  return {
    dateRange,
    setDateRange,
    filterByDateRange,
  };
}
