import {
  buildMAFaceRequestBody,
  buildMATabularUrl,
  getApiBaseUrl,
} from "@/lib/ma-api/constants";
import type { CTApiFilterParams, CTFaceKPIId, CTSubmoduleCode } from "@/types/ct-api";

/** CT-KPI-1 — New CT applications evaluated within timeline (CTNAPP, 90 days). */
export const CT_TABULAR_KPI1_FACE_REPORT_ID = 33;
/** CT-KPI-2 — CT amendments evaluated within timelines (CTAMAPP, 60 days). */
export const CT_TABULAR_KPI2_FACE_REPORT_ID = 34;

export const CT_FACE_KPI_IDS: readonly CTFaceKPIId[] = ["CT-KPI-1", "CT-KPI-2"] as const;

export const CT_REPORT_ID_TO_KPI: Record<number, CTFaceKPIId> = {
  [CT_TABULAR_KPI1_FACE_REPORT_ID]: "CT-KPI-1",
  [CT_TABULAR_KPI2_FACE_REPORT_ID]: "CT-KPI-2",
};

export const CT_KPI_TO_EXPECTED_SUBMODULE: Record<CTFaceKPIId, CTSubmoduleCode> = {
  "CT-KPI-1": "CTNAPP",
  "CT-KPI-2": "CTAMAPP",
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
