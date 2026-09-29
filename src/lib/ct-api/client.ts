import {
  buildCTFaceRequestBody,
  buildCTTabularUrl,
  CT_TABULAR_KPI1_FACE_REPORT_ID,
  CT_TABULAR_KPI2_FACE_REPORT_ID,
  getApiBaseUrl,
} from "@/lib/ct-api/constants";
import {
  ctDrilldownCacheKey,
  ctFaceDataCacheKey,
  ctKpi1FaceDataCacheKey,
  ctKpi2FaceDataCacheKey,
  getOrFetchCtApiCache,
} from "@/lib/ct-api/cache";
import type { CTApiDataRow, CTApiFilterParams, CTApiResponse, CTDrilldownRow, CTFaceKPIId } from "@/types/ct-api";

export type CTApiFetchOptions = { force?: boolean };

export async function fetchCTTabularData<T = CTApiDataRow>(
  accessToken: string,
  reportId: number,
  filters?: CTApiFilterParams,
  lengthOverride?: string
): Promise<CTApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_KPI or NEXT_PUBLIC_API_ROOT is not set");
  }

  const url = buildCTTabularUrl(baseUrl, reportId);
  const body = buildCTFaceRequestBody(filters, lengthOverride);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const json: CTApiResponse<T> = await response.json();
  if (json.error) {
    throw new Error(json.error);
  }

  return json;
}

export async function fetchCTFaceTabularData(
  accessToken: string,
  kpiId: CTFaceKPIId,
  reportId: number,
  filters?: CTApiFilterParams,
  options?: CTApiFetchOptions
): Promise<CTApiResponse<CTApiDataRow>> {
  const key = ctFaceDataCacheKey(kpiId, filters);
  return getOrFetchCtApiCache(key, options?.force ?? false, () =>
    fetchCTTabularData(accessToken, reportId, filters)
  );
}

export async function fetchCTDrilldownTabularData(
  accessToken: string,
  kpiId: string,
  reportId: number,
  filters?: CTApiFilterParams,
  options?: CTApiFetchOptions
): Promise<CTApiResponse<CTDrilldownRow>> {
  const key = ctDrilldownCacheKey(kpiId, filters);
  return getOrFetchCtApiCache(key, options?.force ?? false, () =>
    fetchCTTabularData<CTDrilldownRow>(accessToken, reportId, filters, "500")
  );
}

/** CT-KPI-1 face data from tabular report /33. */
export async function fetchCTKpi1FaceTabularData(
  accessToken: string,
  filters?: CTApiFilterParams,
  options?: CTApiFetchOptions
): Promise<CTApiResponse<CTApiDataRow>> {
  const key = ctKpi1FaceDataCacheKey(filters);
  return getOrFetchCtApiCache(key, options?.force ?? false, () =>
    fetchCTTabularData(accessToken, CT_TABULAR_KPI1_FACE_REPORT_ID, filters)
  );
}

/** CT-KPI-2 face data from tabular report /34. */
export async function fetchCTKpi2FaceTabularData(
  accessToken: string,
  filters?: CTApiFilterParams,
  options?: CTApiFetchOptions
): Promise<CTApiResponse<CTApiDataRow>> {
  const key = ctKpi2FaceDataCacheKey(filters);
  return getOrFetchCtApiCache(key, options?.force ?? false, () =>
    fetchCTTabularData(accessToken, CT_TABULAR_KPI2_FACE_REPORT_ID, filters)
  );
}
