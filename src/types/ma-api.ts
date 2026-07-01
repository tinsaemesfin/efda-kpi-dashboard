/**
 * MA API type definitions
 * Module codes: NMR (New), REN (Renewal), VMIN (Minor Variation), VMAJ (Major Variation)
 * Submodule codes: MDCN (Medicine), FD (Food), MD (Medical Device)
 */

export type MAModuleCode = 'NMR' | 'REN' | 'VMIN' | 'VMAJ' | 'VAR';
export type MAApiModuleCode = MAModuleCode | 'IMR' | 'IEN' | 'IAR' | (string & {});
export type MASubmoduleTypeCode = 'MDCN' | 'FD' | 'FNT' | 'MD' | 'CO' | (string & {});
export type MAKPIId = 'MA-KPI-1' | 'MA-KPI-2' | 'MA-KPI-3' | 'MA-KPI-4';
/** Time-based face KPIs from tabular report /26 (Medicine median & average). */
export type MAKPITimeId = 'MA-KPI-6' | 'MA-KPI-7';
export type MAModuleToKpiMapping = Record<string, MAKPIId>;

export interface MAApiDataRow {
  rowNumber?: number;
  module_code: MAApiModuleCode;
  submoduletype_code: MASubmoduleTypeCode;
  target_days?: number;
  on_time_count: number;
  total_count: number;
  percentage: number;
}

/**
 * Raw row from tabular report /26 (Medicine MA median & average face data).
 * One row per metric: "Median Decision Time" (MA-KPI-6) and "Average Decision Time" (MA-KPI-7).
 */
export interface MAApiMedianAverageDataRow {
  rowNumber?: number;
  module_code: MAApiModuleCode;
  submoduletype_code: MASubmoduleTypeCode;
  target_days?: number;
  metric: string;
  total_count: number;
  decision_time_in_days: number;
}

export interface MAApiDrilldownRow {
  rowNumber?: number;
  category_name: string;
  category_value: string;
  module_code: MAApiModuleCode;
  target_days?: number;
  on_time_count: number;
  total_count: number;
  percentage: number;
  avg_processing_days?: number | null;
}

export interface MAApiResponse<T = MAApiDataRow> {
  recordsTotal?: number;
  recordsFiltered?: number;
  draw?: number;
  error?: string | null;
  totalRecords?: number;
  totalRecordsFiltered?: number;
  data: T[];
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
  targetDays?: number;
}

/** Per–KPI data keyed by MA-KPI-1..4 that can be backed by face API data */
export type MAKPITransformedData = Record<MAKPIId, MAKPITransformedRow>;

/** Transformed time KPI row for MA-KPI-6 (median) and MA-KPI-7 (average). */
export interface MAKPITimeTransformedRow {
  median?: number;
  average?: number;
  numerator?: number;
  denominator?: number;
}

export type MAKPITimeTransformedData = Partial<Record<MAKPITimeId, MAKPITimeTransformedRow>>;

/** Module code → KPI id */
export const MODULE_CODE_TO_KPI: Record<MAModuleCode, string> = {
  NMR: 'MA-KPI-1',
  REN: 'MA-KPI-2',
  VMIN: 'MA-KPI-3',
  VMAJ: 'MA-KPI-4',
  VAR: 'MA-KPI-3',
};

export const MODULE_CODE_LABELS: Record<MAModuleCode, string> = {
  NMR: 'New MA',
  REN: 'Renewal',
  VMIN: 'Minor Variation',
  VMAJ: 'Major Variation',
  VAR: 'Variation (legacy)',
};

export const SUBMODULE_TYPE_LABELS: Record<MASubmoduleTypeCode, string> = {
  MDCN: 'Medicine',
  FD: 'Food',
  FNT: 'Food Notification',
  MD: 'Medical Device',
  CO: 'Cosmetics',
};

/** Product key used in UI → API submodule code (Medicine only for this integration) */
export const PRODUCT_TO_SUBMODULE: Record<string, MASubmoduleTypeCode> = {
  medicine: 'MDCN',
  food: 'FD',
  medicalDevice: 'MD',
};

export interface MANormalizationWarning {
  code:
    | 'MISSING_REQUIRED_FIELD'
    | 'UNKNOWN_MODULE_CODE'
    | 'INVALID_NUMERIC_VALUE'
    | 'EMPTY_RESULT';
  message: string;
  rowIndex?: number;
  row?: MAApiDataRow;
}

export interface MANormalizeOptions {
  submoduleFilter?: MASubmoduleTypeCode;
  moduleToKpiMapping?: MAModuleToKpiMapping;
  moduleCodeAliases?: Record<string, string>;
}

export interface MANormalizeResult {
  kpiFaceDataById: Partial<MAKPITransformedData>;
  warnings: MANormalizationWarning[];
  totals: {
    totalRows: number;
    filteredRows: number;
    acceptedRows: number;
  };
}

export interface MANormalizeMedianAverageWarning {
  code:
    | 'MISSING_REQUIRED_FIELD'
    | 'UNKNOWN_KPI_CODE'
    | 'INVALID_NUMERIC_VALUE'
    | 'EMPTY_RESULT'
    | 'FORMAT_PENDING';
  message: string;
  rowIndex?: number;
  row?: MAApiMedianAverageDataRow;
}

export interface MANormalizeMedianAverageResult {
  kpiTimeDataById: MAKPITimeTransformedData;
  warnings: MANormalizeMedianAverageWarning[];
  totals: {
    totalRows: number;
    filteredRows: number;
    acceptedRows: number;
  };
}
