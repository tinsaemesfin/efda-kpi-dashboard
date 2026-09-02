export type GMPKPIId =
  | "GMP-KPI-1"
  | "GMP-KPI-2"
  | "GMP-KPI-3"
  | "GMP-KPI-4"
  | "GMP-KPI-5"
  | "GMP-KPI-6"
  | "GMP-KPI-7"
  | "GMP-KPI-8"
  | "GMP-KPI-9";

export interface GMPApiFilterParams {
  startDate?: string;
  endDate?: string;
}

export type GMPApiRow = Record<string, string | number | boolean | null | undefined>;

export interface GMPApiResponse {
  recordsTotal?: number;
  recordsFiltered?: number;
  totalRecords?: number;
  totalRecordsFiltered?: number;
  draw?: number;
  error?: string | null;
  data: GMPApiRow[];
}

export interface GMPReportResult {
  reportId: number;
  label: string;
  rows: GMPApiRow[];
  error?: string;
}

export interface GMPFaceMetric {
  kpiId: GMPKPIId;
  state: "live" | "work-in-progress";
  value?: number;
  valueLabel?: string;
  numerator?: number;
  denominator?: number;
  unit: "%" | "days";
  note?: string;
  reports: GMPReportResult[];
  segments: GMPFaceSegment[];
}

export interface GMPFaceSegment {
  id: string;
  label: string;
  value?: number;
  unit: "%" | "days";
  numerator?: number;
  denominator?: number;
  state: "live" | "work-in-progress";
}
