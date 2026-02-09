/**
 * Hook to calculate KPI status based on value type
 * Returns "excellent" | "good" | "warning" | "critical"
 */

import { useCallback } from "react";

export type KPIStatus = "excellent" | "good" | "warning" | "critical";

interface KPIValue {
  percentage?: number;
  median?: number;
  average?: number;
}

/**
 * Calculate status based on KPI value
 * - Percentage-based: ≥90% excellent, ≥80% good, ≥70% warning, <70% critical
 * - Time-based (median/average): ≤150 days excellent, ≤180 days good, ≤220 days warning, >220 days critical
 */
export function useKPIStatus() {
  return useCallback((value: KPIValue): KPIStatus => {
    if (value.percentage !== undefined) {
      const pct = value.percentage;
      if (pct >= 90) return "excellent";
      if (pct >= 80) return "good";
      if (pct >= 70) return "warning";
      return "critical";
    }
    
    if (value.median !== undefined || value.average !== undefined) {
      const time = value.median ?? value.average ?? 0;
      if (time <= 150) return "excellent";
      if (time <= 180) return "good";
      if (time <= 220) return "warning";
      return "critical";
    }
    
    return "good";
  }, []);
}

/**
 * Standalone function version (for use outside React components)
 */
export function getKPIStatus(value: KPIValue): KPIStatus {
  if (value.percentage !== undefined) {
    const pct = value.percentage;
    if (pct >= 90) return "excellent";
    if (pct >= 80) return "good";
    if (pct >= 70) return "warning";
    return "critical";
  }
  
  if (value.median !== undefined || value.average !== undefined) {
    const time = value.median ?? value.average ?? 0;
    if (time <= 150) return "excellent";
    if (time <= 180) return "good";
    if (time <= 220) return "warning";
    return "critical";
  }
  
  return "good";
}
