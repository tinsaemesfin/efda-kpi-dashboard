/**
 * Calculation utilities for KPI data processing
 */

/**
 * Calculate percentage from numerator and denominator
 */
export function calculatePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

/**
 * Calculate median from array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
}

/**
 * Calculate average (mean) from array of numbers
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Parse quarter string to extract quarter and year
 * Example: "Q1 2024" -> { quarter: "Q1", year: 2024 }
 */
export function parseQuarterString(quarterStr: string): { quarter: "Q1" | "Q2" | "Q3" | "Q4"; year: number } | null {
  const match = quarterStr.match(/Q([1-4])\s+(\d{4})/);
  if (!match) return null;
  return {
    quarter: `Q${match[1]}` as "Q1" | "Q2" | "Q3" | "Q4",
    year: parseInt(match[2]),
  };
}

/**
 * Calculate percentile from sorted array
 */
export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (percentile <= 0) return sortedValues[0];
  if (percentile >= 100) return sortedValues[sortedValues.length - 1];
  
  const index = ((sortedValues.length - 1) * percentile) / 100;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return sortedValues[lower];
  
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}
