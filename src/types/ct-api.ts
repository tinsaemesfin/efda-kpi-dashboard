/**
 * Clinical Trial API types
 * Face reports: /33 (CT-KPI-1, CTNAPP), /34 (CT-KPI-2, CTAMAPP)
 */

export type CTKPIId = "CT-KPI-1" | "CT-KPI-2" | "CT-KPI-3" | "CT-KPI-4" | "CT-KPI-5" | "CT-KPI-6" | "CT-KPI-7" | "CT-KPI-8";

/** Face KPIs backed by live tabular reports. */
export type CTFaceKPIId = "CT-KPI-1" | "CT-KPI-2";

export type CTSubmoduleCode = "CTNAPP" | "CTAMAPP" | (string & {});

export interface CTApiFilterParams {
  startDate?: string;
  endDate?: string;
  quarter?: string;
  year?: number;
}

/** Raw row from CT face tabular reports /33 and /34. */
export interface CTApiDataRow {
  rowNumber?: number;
  submodule_code: CTSubmoduleCode;
  target_days?: number;
  on_time_count: number;
  total_count: number;
  percentage: number;
}

export interface CTApiResponse<T = CTApiDataRow> {
  recordsTotal?: number;
  recordsFiltered?: number;
  draw?: number;
  error?: string | null;
  totalRecords?: number;
  totalRecordsFiltered?: number;
  data: T[];
}

export interface CTKPITransformedRow {
  numerator: number;
  denominator: number;
  percentage: number;
  targetDays?: number;
}

export type CTKPITransformedData = Partial<Record<CTFaceKPIId, CTKPITransformedRow>>;

export interface CTNormalizationWarning {
  code:
    | "MISSING_REQUIRED_FIELD"
    | "UNKNOWN_SUBMODULE_CODE"
    | "INVALID_NUMERIC_VALUE"
    | "EMPTY_RESULT";
  message: string;
  rowIndex?: number;
  row?: CTApiDataRow;
}

export interface CTNormalizeResult {
  kpiFaceDataById: CTKPITransformedData;
  warnings: CTNormalizationWarning[];
  totals: {
    totalRows: number;
    filteredRows: number;
    acceptedRows: number;
  };
}
