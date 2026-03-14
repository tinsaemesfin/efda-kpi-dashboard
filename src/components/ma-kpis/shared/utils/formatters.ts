/**
 * Formatting utilities for KPI values
 */

/**
 * Format percentage value with specified decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format days value with optional unit
 */
export function formatDays(value: number, showUnit: boolean = true): string {
  const formatted = value.toFixed(value % 1 === 0 ? 0 : 1);
  return showUnit ? `${formatted} days` : formatted;
}

/**
 * Format quarter string
 */
export function formatQuarter(quarter: "Q1" | "Q2" | "Q3" | "Q4", year: number): string {
  return `${quarter} ${year}`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format KPI value based on type (percentage, days, or number)
 */
export function formatKPIValue(
  value: number,
  type: "percentage" | "days" | "number",
  decimals?: number
): string {
  switch (type) {
    case "percentage":
      return formatPercentage(value, decimals);
    case "days":
      return formatDays(value);
    case "number":
      return formatNumber(value);
    default:
      return value.toString();
  }
}
