import type { MAApiFilterParams, MAKPIId, MAModuleToKpiMapping } from "@/types/ma-api";

export const MA_TABULAR_FACE_REPORT_ID = 8;
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

export function getApiBaseUrl(): string {
  const kpi = process.env.NEXT_PUBLIC_API_KPI;
  const root = process.env.NEXT_PUBLIC_API_ROOT;
  return kpi || root || "";
}

export function buildMATabularFaceUrl(baseUrl: string): string {
  const cleanedBase = baseUrl.replace(/\/$/, "");

  // Supports both styles:
  // 1) NEXT_PUBLIC_API_KPI=https://host/api/kpi
  // 2) NEXT_PUBLIC_API_KPI=https://host
  // Also tolerates accidental /tabular suffix.
  if (/\/api\/kpi\/tabular$/i.test(cleanedBase)) {
    return `${cleanedBase}/${MA_TABULAR_FACE_REPORT_ID}`;
  }
  if (/\/api\/kpi$/i.test(cleanedBase)) {
    return `${cleanedBase}/tabular/${MA_TABULAR_FACE_REPORT_ID}`;
  }
  if (/\/tabular$/i.test(cleanedBase)) {
    return `${cleanedBase}/${MA_TABULAR_FACE_REPORT_ID}`;
  }
  return `${cleanedBase}${MA_TABULAR_ENDPOINT_PREFIX}/${MA_TABULAR_FACE_REPORT_ID}`;
}

export function buildMAFaceRequestBody(filters?: MAApiFilterParams): URLSearchParams {
  const formData = new URLSearchParams();
  formData.append("draw", MA_DEFAULT_TABULAR_PARAMS.draw);
  formData.append("start", MA_DEFAULT_TABULAR_PARAMS.start);
  formData.append("length", MA_DEFAULT_TABULAR_PARAMS.length);
  if (filters?.startDate) formData.append("startDate", filters.startDate);
  if (filters?.endDate) formData.append("endDate", filters.endDate);
  if (filters?.quarter) formData.append("quarter", filters.quarter);
  if (filters?.year != null) formData.append("year", String(filters.year));
  return formData;
}
