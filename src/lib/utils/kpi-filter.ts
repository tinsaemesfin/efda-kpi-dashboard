import { KPIFilterState } from "@/components/kpi/kpi-filter";

/**
 * Utility functions for filtering KPI data based on filter state
 */

export interface QuarterlyDataPoint {
  quarter: string;
  year?: number;
  quarterNumber?: number;
  [key: string]: any;
}

export interface AnnualDataPoint {
  year: string | number;
  [key: string]: any;
}

/**
 * Extract quarter and year from quarter string (e.g., "Q1 2024")
 */
export function parseQuarter(quarterStr: string): { quarter: "Q1" | "Q2" | "Q3" | "Q4"; year: number } | null {
  const match = quarterStr.match(/Q([1-4])\s+(\d{4})/);
  if (!match) return null;
  return {
    quarter: `Q${match[1]}` as "Q1" | "Q2" | "Q3" | "Q4",
    year: parseInt(match[2])
  };
}

/**
 * Format quarter string (e.g., "Q1 2024")
 */
export function formatQuarter(quarter: "Q1" | "Q2" | "Q3" | "Q4", year: number): string {
  return `${quarter} ${year}`;
}

/**
 * Check if a date falls within a date range
 */
export function isDateInRange(date: string | Date, startDate?: string, endDate?: string): boolean {
  if (!startDate && !endDate) return true;
  
  const checkDate = typeof date === "string" ? new Date(date) : date;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  if (start && checkDate < start) return false;
  if (end && checkDate > end) return false;
  
  return true;
}

/**
 * Filter quarterly data based on filter state
 */
export function filterQuarterlyData<T extends QuarterlyDataPoint>(
  data: T[],
  filter: KPIFilterState
): T[] {
  if (filter.mode === "date-range") {
    // For date range, we'd need date information in the data
    // This is a simplified version - you may need to adjust based on your data structure
    return data.filter((item) => {
      if (filter.startDate || filter.endDate) {
        // If data has a date field, use it
        const itemDate = (item as any).date || (item as any).periodStart;
        if (itemDate) {
          return isDateInRange(itemDate, filter.startDate, filter.endDate);
        }
        // Otherwise, try to parse from quarter string
        const parsed = parseQuarter(item.quarter);
        if (parsed) {
          // Approximate quarter dates
          const quarterStartMonths = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };
          const quarterStart = new Date(parsed.year, quarterStartMonths[parsed.quarter], 1);
          return isDateInRange(quarterStart, filter.startDate, filter.endDate);
        }
      }
      return true;
    });
  }

  // Filter by quarter and year
  return data.filter((item) => {
    const parsed = parseQuarter(item.quarter);
    if (!parsed) return false;
    
    const matchesQuarter = !filter.quarter || parsed.quarter === filter.quarter;
    const matchesYear = !filter.year || parsed.year === filter.year;
    
    return matchesQuarter && matchesYear;
  });
}

/**
 * Filter annual data based on filter state
 */
export function filterAnnualData<T extends AnnualDataPoint>(
  data: T[],
  filter: KPIFilterState
): T[] {
  if (filter.mode === "date-range") {
    return data.filter((item) => {
      if (filter.startDate || filter.endDate) {
        const year = typeof item.year === "string" ? parseInt(item.year) : item.year;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        const start = filter.startDate ? new Date(filter.startDate) : null;
        const end = filter.endDate ? new Date(filter.endDate) : null;
        
        if (start && yearEnd < start) return false;
        if (end && yearStart > end) return false;
        
        return true;
      }
      return true;
    });
  }

  // Filter by year
  return data.filter((item) => {
    const year = typeof item.year === "string" ? parseInt(item.year) : item.year;
    return !filter.year || year === filter.year;
  });
}

/**
 * Get filtered quarterly value based on filter state
 */
export function getFilteredQuarterlyValue<T extends QuarterlyDataPoint>(
  data: T[],
  filter: KPIFilterState
): T | null {
  const filtered = filterQuarterlyData(data, filter);
  // Return the most recent quarter if multiple match
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

/**
 * Get filtered annual value based on filter state
 */
export function getFilteredAnnualValue<T extends AnnualDataPoint>(
  data: T[],
  filter: KPIFilterState
): T | null {
  const filtered = filterAnnualData(data, filter);
  // Return the most recent year if multiple match
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}



