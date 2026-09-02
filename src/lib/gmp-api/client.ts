import { buildMAFaceRequestBody, buildMATabularUrl, getApiBaseUrl } from "@/lib/ma-api/constants";
import { GMP_REPORT_LABELS } from "@/lib/gmp-api/constants";
import type { GMPApiFilterParams, GMPApiResponse, GMPReportResult } from "@/types/gmp-api";

export async function fetchGMPReport(
  accessToken: string,
  reportId: number,
  filters?: GMPApiFilterParams,
  length = "500"
): Promise<GMPReportResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_KPI or NEXT_PUBLIC_API_ROOT is not set");

  const response = await fetch(buildMATabularUrl(baseUrl, reportId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: buildMAFaceRequestBody(filters, length).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Report ${reportId}: HTTP ${response.status}${body ? `: ${body}` : ""}`);
  }

  const json = (await response.json()) as GMPApiResponse;
  if (json.error) throw new Error(`Report ${reportId}: ${json.error}`);

  return {
    reportId,
    label: GMP_REPORT_LABELS[reportId] ?? `Report ${reportId}`,
    rows: Array.isArray(json.data) ? json.data : [],
  };
}

export async function fetchGMPReports(
  accessToken: string,
  reportIds: readonly number[],
  filters?: GMPApiFilterParams
): Promise<GMPReportResult[]> {
  const results = await Promise.allSettled(
    reportIds.map((reportId) => fetchGMPReport(accessToken, reportId, filters))
  );

  return results.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          reportId: reportIds[index],
          label: GMP_REPORT_LABELS[reportIds[index]] ?? `Report ${reportIds[index]}`,
          rows: [],
          error: result.reason instanceof Error ? result.reason.message : "Report request failed",
        }
  );
}
