import type { MAApiFilterParams, MADateBasis, MAKPIId, MAModuleToKpiMapping, MAKPITimeId, MAReportProduct } from "@/types/ma-api";

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
/** Medicine — MA-KPI-6 median decision time drilldown. */
export const MA_TABULAR_MEDICINE_MEDIAN_DRILLDOWN_REPORT_ID = 27;
/** Medicine — MA-KPI-7 average decision time drilldown. */
export const MA_TABULAR_MEDICINE_AVERAGE_DRILLDOWN_REPORT_ID = 28;
/** Medicine — MA-KPI-8 PAR face (post-approval docs within SLA). */
export const MA_TABULAR_MEDICINE_PAR_FACE_REPORT_ID = 29;
/** Medical Device — MA-KPI-8 PAR face. */
export const MA_TABULAR_MEDICAL_DEVICE_PAR_FACE_REPORT_ID = 30;
/** Food — MA-KPI-8 PAR face. */
export const MA_TABULAR_FOOD_PAR_FACE_REPORT_ID = 31;
/** Cosmetics — MA-KPI-8 PAR face. */
export const MA_TABULAR_COSMETICS_PAR_FACE_REPORT_ID = 32;
/** Remaining non-FIR MA reports added consecutively after the prior latest id (88). */
export const MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS: Record<
  MAReportProduct,
  Partial<Record<MAKPIId, number>>
> = {
  medicine: { "MA-KPI-1": 9, "MA-KPI-2": 10, "MA-KPI-3": 11, "MA-KPI-4": 13 },
  food: { "MA-KPI-1": 18, "MA-KPI-2": 19, "MA-KPI-3": 20, "MA-KPI-4": 21 },
  foodNotification: { "MA-KPI-1": 89, "MA-KPI-2": 90, "MA-KPI-3": 91, "MA-KPI-4": 92 },
  medicalDevice: { "MA-KPI-1": 22, "MA-KPI-2": 23, "MA-KPI-3": 24, "MA-KPI-4": 25 },
  cosmetics: { "MA-KPI-1": 93, "MA-KPI-2": 94, "MA-KPI-3": 95 },
};

export const MA_PRODUCT_TIME_REPORT_IDS: Record<
  MAReportProduct,
  { face: number; median: number; average: number }
> = {
  medicine: { face: 118, median: 119, average: 120 },
  food: { face: 96, median: 97, average: 98 },
  foodNotification: { face: 99, median: 100, average: 101 },
  medicalDevice: { face: 102, median: 103, average: 104 },
  cosmetics: { face: 105, median: 106, average: 107 },
};

export const MA_PRODUCT_PAR_REPORT_IDS: Record<
  MAReportProduct,
  { face: number; drilldown: number }
> = {
  medicine: { face: 114, drilldown: 109 },
  food: { face: 115, drilldown: 110 },
  foodNotification: { face: 108, drilldown: 111 },
  medicalDevice: { face: 116, drilldown: 112 },
  cosmetics: { face: 117, drilldown: 113 },
};

export const MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE: Record<
  MADateBasis,
  Record<MAReportProduct, number>
> = {
  submission: { medicine: 8, food: 14, foodNotification: 15, medicalDevice: 16, cosmetics: 17 },
  decision: { medicine: 155, food: 156, foodNotification: 157, medicalDevice: 158, cosmetics: 159 },
};

export const MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS_BY_DATE: Record<
  MADateBasis,
  Record<MAReportProduct, Partial<Record<MAKPIId, number>>>
> = {
  submission: MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS,
  decision: {
    medicine: { "MA-KPI-1": 160, "MA-KPI-2": 161, "MA-KPI-3": 162, "MA-KPI-4": 163 },
    food: { "MA-KPI-1": 164, "MA-KPI-2": 165, "MA-KPI-3": 166, "MA-KPI-4": 167 },
    foodNotification: { "MA-KPI-1": 168, "MA-KPI-2": 169, "MA-KPI-3": 170, "MA-KPI-4": 171 },
    medicalDevice: { "MA-KPI-1": 172, "MA-KPI-2": 173, "MA-KPI-3": 174, "MA-KPI-4": 175 },
    cosmetics: { "MA-KPI-1": 176, "MA-KPI-2": 177, "MA-KPI-3": 178 },
  },
};

export const MA_PRODUCT_TIME_REPORT_IDS_BY_DATE: Record<
  MADateBasis,
  Record<MAReportProduct, { face: number; median: number; average: number }>
> = {
  submission: {
    medicine: { face: 179, median: 180, average: 181 },
    food: { face: 182, median: 183, average: 184 },
    foodNotification: { face: 185, median: 186, average: 187 },
    medicalDevice: { face: 188, median: 189, average: 190 },
    cosmetics: { face: 191, median: 192, average: 193 },
  },
  decision: MA_PRODUCT_TIME_REPORT_IDS,
};

export const MA_PRODUCT_PAR_REPORT_IDS_BY_DATE: Record<
  MADateBasis,
  Record<MAReportProduct, { face: number; drilldown: number }>
> = {
  submission: {
    medicine: { face: 194, drilldown: 195 },
    food: { face: 196, drilldown: 197 },
    foodNotification: { face: 198, drilldown: 199 },
    medicalDevice: { face: 200, drilldown: 201 },
    cosmetics: { face: 202, drilldown: 203 },
  },
  decision: MA_PRODUCT_PAR_REPORT_IDS,
};
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
