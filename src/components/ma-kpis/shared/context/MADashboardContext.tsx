"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { KPIFilterState } from "@/components/kpi/kpi-filter";
import type { MAKPITransformedData } from "@/types/ma-api";
import { useMAKPITransformedData } from "@/hooks/useMAApi";

interface DateRange {
  start: Date;
  end: Date;
}

interface MADashboardContextValue {
  // Dashboard filter state
  dashboardFilter: KPIFilterState;
  setDashboardFilter: (filter: KPIFilterState) => void;
  
  // Requirements toggle
  showRequirements: boolean;
  setShowRequirements: (show: boolean) => void;
  
  // Future: Custom date range
  dateRange: DateRange | null;
  setDateRange: (range: DateRange | null) => void;
  
  // API data
  apiData: Record<string, MAKPITransformedData> | null;
  apiLoading: boolean;
  apiError: Error | null;
  refetchApiData: () => Promise<void>;
}

const MADashboardContext = createContext<MADashboardContextValue | undefined>(undefined);

export function MADashboardProvider({ children }: { children: React.ReactNode }) {
  const [dashboardFilter, setDashboardFilter] = useState<KPIFilterState>({
    mode: "quarterly",
    quarter: "Q4",
    year: 2024,
  });
  
  const [showRequirements, setShowRequirements] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  
  // Fetch API data
  const { data: apiData, loading: apiLoading, error: apiError, refetch: refetchApiData } = 
    useMAKPITransformedData();
  
  const value = useMemo(
    () => ({
      dashboardFilter,
      setDashboardFilter,
      showRequirements,
      setShowRequirements,
      dateRange,
      setDateRange,
      apiData: apiData || null, 
      apiLoading,
      apiError: apiError || null,
      refetchApiData,
    }),
    [
      dashboardFilter,
      showRequirements,
      dateRange,
      apiData,
      apiLoading,
      apiError,
      refetchApiData,
    ]
  );
  
  return (
    <MADashboardContext.Provider value={value}>
      {children}
    </MADashboardContext.Provider>
  );
}

export function useMADashboard() {
  const context = useContext(MADashboardContext);
  if (context === undefined) {
    throw new Error("useMADashboard must be used within a MADashboardProvider");
  }
  return context;
}
