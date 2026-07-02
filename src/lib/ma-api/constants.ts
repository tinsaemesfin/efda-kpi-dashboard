import type { MAApiFilterParams, MAKPIId, MAModuleToKpiMapping, MAKPITimeId } from "@/types/ma-api";

/** Cosmetics — face KPIs MA-KPI-1..3 only; all variation rows map to MA-KPI-3 (no KPI 4). */
export const MA_COSMETICS_FACE_MODULE_TO_KPI_MAPPING: MAModuleToKpiMapping = {
  NMR: "MA-KPI-1",
  REN: "MA-KPI-2",
  VMIN: "MA-KPI-3",
  VMAJ: "MA-KPI-3",
  VAR: "MA-KPI-3",
};

export const MA_TABULAR_FACE_REPORT_ID = 8;
/** MA Food product — front KPI cards MA-KPI-1..4 (same row shape as face /8). */
export const MA_TABULAR_FOOD_FACE_REPORT_ID = 14;
/** MA Food Notification — front KPI cards MA-KPI-1..4 (same row shape as face /8). */
export const MA_TABULAR_FOOD_NOTIFICATION_FACE_REPORT_ID = 15;
/** Medical Device — face cards MA-KPI-1..4 (`VMIN` / `VMAJ` module rows). */
export const MA_TABULAR_MEDICAL_DEVICE_FACE_REPORT_ID = 16;
/** Cosmetics — face cards MA-KPI-1..3 only (variation is a single KPI; no KPI 4). */
export const MA_TABULAR_COSMETICS_FACE_REPORT_ID = 17;
export const MA_TABULAR_KPI1_DRILLDOWN_REPORT_ID = 9;
/** Food / New MA drilldown only. Face KPI cards still use /14. */
export const MA_TABULAR_FOOD_KPI1_DRILLDOWN_REPORT_ID = 18;
export const MA_TABULAR_KPI2_DRILLDOWN_REPORT_ID = 10;
/** Food / Renewal drilldown only. Face KPI cards still use /14. */
export const MA_TABULAR_FOOD_KPI2_DRILLDOWN_REPORT_ID = 19;
export const MA_TABULAR_KPI3_DRILLDOWN_REPORT_ID = 11;
/** Food / Minor Variation (VMIN) drilldown only. Face KPI cards still use /14. */
export const MA_TABULAR_FOOD_KPI3_DRILLDOWN_REPORT_ID = 20;
export const MA_TABULAR_KPI4_DRILLDOWN_REPORT_ID = 13;
/** Food / Major Variation (VMAJ) drilldown only. Face KPI cards still use /14. */
export const MA_TABULAR_FOOD_KPI4_DRILLDOWN_REPORT_ID = 21;
/** Medical Device / New MA drilldown only. Face KPI cards still use /16. */
export const MA_TABULAR_MEDICAL_DEVICE_KPI1_DRILLDOWN_REPORT_ID = 22;
/** Medical Device / Renewal drilldown only. Face KPI cards still use /16. */
export const MA_TABULAR_MEDICAL_DEVICE_KPI2_DRILLDOWN_REPORT_ID = 23;
/** Medical Device / Minor Variation (VMIN) drilldown only. Face KPI cards still use /16. */
export const MA_TABULAR_MEDICAL_DEVICE_KPI3_DRILLDOWN_REPORT_ID = 24;
/** Medical Device / Major Variation (VMAJ) drilldown only. Face KPI cards still use /16. */
export const MA_TABULAR_MEDICAL_DEVICE_KPI4_DRILLDOWN_REPORT_ID = 25;
/** Medicine — face cards MA-KPI-6 (median) & MA-KPI-7 (average) for New MA processing time. */
export const MA_TABULAR_MEDICINE_MEDIAN_AVERAGE_FACE_REPORT_ID = 26;
export const MA_TABULAR_ENDPOINT_PREFIX = "/api/kpi/tabular";

export const MA_DEFAULT_TABULAR_PARAMS = {
  draw: "1",
  start: "0",
  length: "25",
} as const;

export const MA_DEFAULT_MODULE_TO_KPI_MAPPING: MAModuleToKpiMapping = {
  NMR: "MA-KPI-1",
  REN: "MA-KPI-2",
  VMIN: "MA-KPI-3",
  VMAJ: "MA-KPI-4",
  VAR: "MA-KPI-3",
};

/** Temporary alias support for known backend inconsistencies. */
export const MA_MODULE_CODE_ALIASES: Record<string, keyof typeof MA_DEFAULT_MODULE_TO_KPI_MAPPING> = {
  IMR: "NMR",
  IEN: "REN",
  IAR: "VMIN",
};

export const MA_FACE_KPI_IDS: readonly MAKPIId[] = [
  "MA-KPI-1",
  "MA-KPI-2",
  "MA-KPI-3",
  "MA-KPI-4",
] as const;

export const MA_TIME_FACE_KPI_IDS: readonly MAKPITimeId[] = [
  "MA-KPI-6",
  "MA-KPI-7",
] as const;

export function getApiBaseUrl(): string {
  const kpi = process.env.NEXT_PUBLIC_API_KPI;
  const root = process.env.NEXT_PUBLIC_API_ROOT;
  return kpi || root || "";
}

export function buildMATabularFaceUrl(baseUrl: string): string {
  return buildMATabularUrl(baseUrl, MA_TABULAR_FACE_REPORT_ID);
}

export function buildMATabularUrl(baseUrl: string, reportId: number): string {
  const cleanedBase = baseUrl.replace(/\/$/, "");

  // Supports both styles:
  // 1) NEXT_PUBLIC_API_KPI=https://host/api/kpi
  // 2) NEXT_PUBLIC_API_KPI=https://host
  // Also tolerates accidental /tabular suffix.
  if (/\/api\/kpi\/tabular$/i.test(cleanedBase)) {
    return `${cleanedBase}/${reportId}`;
  }
  if (/\/api\/kpi$/i.test(cleanedBase)) {
    return `${cleanedBase}/tabular/${reportId}`;
  }
  if (/\/tabular$/i.test(cleanedBase)) {
    return `${cleanedBase}/${reportId}`;
  }
  return `${cleanedBase}${MA_TABULAR_ENDPOINT_PREFIX}/${reportId}`;
}

export function buildMAFaceRequestBody(filters?: MAApiFilterParams, lengthOverride?: string): URLSearchParams {
  const formData = new URLSearchParams();
  formData.append("draw", MA_DEFAULT_TABULAR_PARAMS.draw);
  formData.append("start", MA_DEFAULT_TABULAR_PARAMS.start);
  formData.append("length", lengthOverride ?? MA_DEFAULT_TABULAR_PARAMS.length);
  if (filters?.startDate) formData.append("startDate", filters.startDate);
  if (filters?.endDate) formData.append("endDate", filters.endDate);
  if (filters?.quarter) formData.append("quarter", filters.quarter);
  if (filters?.year != null) formData.append("year", String(filters.year));
  return formData;
}
