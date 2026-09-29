/**
 * Clinical Trial API types.
 * Face reports: 33, 34, 219–226. CT-KPI-6 has no report.
 */

export type CTRatioKPIId =
  | "CT-KPI-1"
  | "CT-KPI-2"
  | "CT-KPI-3"
  | "CT-KPI-4"
  | "CT-KPI-5"
  | "CT-KPI-7"
  | "CT-KPI-9"
  | "CT-KPI-10"
  | "CT-KPI-11";

export type CTTurnaroundKPIId = "CT-KPI-8";

/** Indicators backed by a live tabular face report. */
export type CTFaceKPIId = CTRatioKPIId | CTTurnaroundKPIId;

export type CTKPIId = CTFaceKPIId | "CT-KPI-6";

export type CTSubmoduleCode = "CTNAPP" | "CTAMAPP" | "CTGCP" | "CTSR" | "CTGCPCP" | "CT" | (string & {});

export interface CTApiFilterParams {
  startDate?: string;
  endDate?: string;
  quarter?: string;
  year?: number;
}

/** Raw row from a CT face tabular report. Ratio and turnaround reports share this shape. */
export interface CTApiDataRow {
  rowNumber?: number;
  submodule_code?: CTSubmoduleCode;
  target_days?: number | string | null;
  on_time_count?: number | string | null;
  total_count?: number | string | null;
  percentage?: number | string | null;
  total_days?: number | string | null;
  average_days?: number | string | null;
  report_type?: string | null;
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
  kind: "ratio" | "turnaround";
  numerator: number;
  denominator: number;
  percentage: number;
  targetDays?: number;
  /** Set for CT-KPI-8. Combined periods use total days divided by the application count. */
  averageDays?: number;
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

/** One drill-down list row. Columns vary by KPI. */
export type CTDrilldownRow = Record<string, string | number | boolean | null>;
