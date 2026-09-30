import {
  buildMAFaceRequestBody,
  buildMATabularUrl,
  getApiBaseUrl,
} from "@/lib/ma-api/constants";
import type { CTApiFilterParams, CTFaceKPIId, CTKPIId, CTRatioKPIId, CTSubmoduleCode } from "@/types/ct-api";

/** CT-KPI-1 — approved new CT applications within the evaluation target (CTNAPP). */
export const CT_TABULAR_KPI1_FACE_REPORT_ID = 33;
/** CT-KPI-2 — approved CT amendments within the evaluation target (CTAMAPP). */
export const CT_TABULAR_KPI2_FACE_REPORT_ID = 34;
export const CT_TABULAR_KPI3_FACE_REPORT_ID = 241;
export const CT_TABULAR_KPI4_FACE_REPORT_ID = 242;
export const CT_TABULAR_KPI5_FACE_REPORT_ID = 243;
export const CT_TABULAR_KPI7_FACE_REPORT_ID = 244;
export const CT_TABULAR_KPI8_FACE_REPORT_ID = 245;
export const CT_TABULAR_KPI9_FACE_REPORT_ID = 246;
export const CT_TABULAR_KPI10_FACE_REPORT_ID = 247;
export const CT_TABULAR_KPI11_FACE_REPORT_ID = 248;

export const CT_FACE_REPORTS = [
  { kpiId: "CT-KPI-1", reportId: CT_TABULAR_KPI1_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-2", reportId: CT_TABULAR_KPI2_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-3", reportId: CT_TABULAR_KPI3_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-4", reportId: CT_TABULAR_KPI4_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-5", reportId: CT_TABULAR_KPI5_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-7", reportId: CT_TABULAR_KPI7_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-8", reportId: CT_TABULAR_KPI8_FACE_REPORT_ID, kind: "turnaround" },
  { kpiId: "CT-KPI-9", reportId: CT_TABULAR_KPI9_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-10", reportId: CT_TABULAR_KPI10_FACE_REPORT_ID, kind: "ratio" },
  { kpiId: "CT-KPI-11", reportId: CT_TABULAR_KPI11_FACE_REPORT_ID, kind: "ratio" },
] as const satisfies readonly { kpiId: CTFaceKPIId; reportId: number; kind: "ratio" | "turnaround" }[];

export const CT_FACE_KPI_IDS: readonly CTFaceKPIId[] = CT_FACE_REPORTS.map((report) => report.kpiId);

export const CT_REPORT_ID_TO_KPI: Record<number, CTFaceKPIId> = Object.fromEntries(
  CT_FACE_REPORTS.map((report) => [report.reportId, report.kpiId])
);

export const CT_KPI_TO_EXPECTED_SUBMODULE: Record<CTFaceKPIId, CTSubmoduleCode> = {
  "CT-KPI-1": "CTNAPP",
  "CT-KPI-2": "CTAMAPP",
  "CT-KPI-3": "CTGCP",
  "CT-KPI-4": "CTSR",
  "CT-KPI-5": "CTGCP",
  "CT-KPI-7": "CTGCPCP",
  "CT-KPI-8": "CTNAPP",
  "CT-KPI-9": "CTAMAPP",
  "CT-KPI-10": "CT",
  "CT-KPI-11": "CTSR",
};

export function isCTRatioKPIId(kpiId: CTFaceKPIId): kpiId is CTRatioKPIId {
  return kpiId !== "CT-KPI-8";
}

/** Tabular list behind each live face card. CT-KPI-6 has no list. */
export const CT_DRILLDOWN_REPORT_IDS: Partial<Record<CTKPIId, number>> = {
  "CT-KPI-1": 249,
  "CT-KPI-2": 228,
  "CT-KPI-3": 229,
  "CT-KPI-4": 230,
  "CT-KPI-5": 231,
  "CT-KPI-7": 232,
  "CT-KPI-8": 233,
  "CT-KPI-9": 234,
  "CT-KPI-10": 235,
  "CT-KPI-11": 236,
};

export { getApiBaseUrl };

export function buildCTTabularUrl(baseUrl: string, reportId: number): string {
  return buildMATabularUrl(baseUrl, reportId);
}

export function buildCTFaceRequestBody(
  filters?: CTApiFilterParams,
  lengthOverride?: string
): URLSearchParams {
  return buildMAFaceRequestBody(filters, lengthOverride);
}
