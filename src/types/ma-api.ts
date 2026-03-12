/**
 * MA API type definitions
 * Module codes: NMR (New), REN (Renewal), VAR (Variation)
 * Submodule codes: MDCN (Medicine), FD (Food), MD (Medical Device)
 */

export type MAModuleCode = 'NMR' | 'REN' | 'VAR';
export type MASubmoduleTypeCode = 'MDCN' | 'FD' | 'MD';

export interface MAApiDataRow {
  rowNumber?: number;
  module_code: MAModuleCode;
  submoduletype_code: MASubmoduleTypeCode;
  target_days?: number;
  on_time_count: number;
  total_count: number;
  percentage: number;
}

export interface MAApiResponse {
  recordsTotal?: number;
  recordsFiltered?: number;
  draw?: number;
  error?: string | null;
  totalRecords?: number;
  totalRecordsFiltered?: number;
  data: MAApiDataRow[];
}

export interface MAApiFilterParams {
  startDate?: string;
  endDate?: string;
  quarter?: string;
  year?: number;
}

/** Transformed KPI row: numerator, denominator, percentage for one product type */
export interface MAKPITransformedRow {
  numerator: number;
  denominator: number;
  percentage: number;
}

/** Per–KPI data keyed by MA-KPI-1, MA-KPI-2, MA-KPI-3 (only these have API data) */
export type MAKPITransformedData = Record<string, MAKPITransformedRow>;

/** Module code → KPI id (API only has New, Renewal, Variation) */
export const MODULE_CODE_TO_KPI: Record<MAModuleCode, string> = {
  NMR: 'MA-KPI-1',
  REN: 'MA-KPI-2',
  VAR: 'MA-KPI-3',
};

export const MODULE_CODE_LABELS: Record<MAModuleCode, string> = {
  NMR: 'New MA',
  REN: 'Renewal',
  VAR: 'Variation',
};

export const SUBMODULE_TYPE_LABELS: Record<MASubmoduleTypeCode, string> = {
  MDCN: 'Medicine',
  FD: 'Food',
  MD: 'Medical Device',
};

/** Product key used in UI → API submodule code (Medicine only for this integration) */
export const PRODUCT_TO_SUBMODULE: Record<string, MASubmoduleTypeCode> = {
  medicine: 'MDCN',
  food: 'FD',
  medicalDevice: 'MD',
};
