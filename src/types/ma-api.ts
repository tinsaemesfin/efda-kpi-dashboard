/**
 * MA API Type Definitions
 * Types for Market Authorization KPI API responses
 */

export type MAModuleCode = 'NMR' | 'VAR' | 'REN';
export type MASubmoduleTypeCode = 'MDCN' | 'FD' | 'MD' | 'CO';

/**
 * Individual data row from the MA KPI API
 */
export interface MAApiDataRow {
  rowNumber: number;
  module_code: MAModuleCode;
  submoduletype_code: MASubmoduleTypeCode;
  target_days: number;
  on_time_count: number;
  total_count: number;
  percentage: number;
}

/**
 * Full API response envelope
 */
export interface MAApiResponse {
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
  error: string | null;
  totalRecords: number;
  totalRecordsFiltered: number;
  data: MAApiDataRow[];
}

/**
 * Filter parameters for future date filtering support
 */
export interface MAApiFilterParams {
  startDate?: string;  // ISO date string
  endDate?: string;    // ISO date string
  quarter?: string;    // e.g., "Q1", "Q2"
  year?: number;      // e.g., 2024
}

/**
 * Aggregated data by module code (application type)
 */
export interface MAModuleAggregation {
  moduleCode: MAModuleCode;
  label: string;
  totalOnTime: number;
  totalCount: number;
  overallPercentage: number;
  disaggregations: MASubmoduleAggregation[];
}

/**
 * Aggregated data by submodule type (product type)
 */
export interface MASubmoduleAggregation {
  submoduleCode: MASubmoduleTypeCode;
  label: string;
  onTimeCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Transformed KPI format matching the existing KPI card structure
 */
export interface MAKPITransformedData {
  numerator: number;
  denominator: number;
  percentage: number;
  disaggregations: Record<string, {
    label: string;
    value: number;
    percentage: number;
  }>;
}

/**
 * Module code to KPI mapping
 */
export const MODULE_CODE_TO_KPI: Record<MAModuleCode, string> = {
  NMR: 'MA-KPI-1',  // New Market Authorization → KPI 1
  REN: 'MA-KPI-2',  // Renewal → KPI 2
  VAR: 'MA-KPI-3',  // Variation → KPI 3 (can be split to KPI 4 later if API provides minor/major distinction)
};

/**
 * Module code labels
 */
export const MODULE_CODE_LABELS: Record<MAModuleCode, string> = {
  NMR: 'New Market Authorization',
  REN: 'Renewal',
  VAR: 'Variation',
};

/**
 * Submodule type code labels
 */
export const SUBMODULE_TYPE_LABELS: Record<MASubmoduleTypeCode, string> = {
  MDCN: 'Medicine',
  FD: 'Food',
  MD: 'Medical Device',
  CO: 'Cosmetics',
};
