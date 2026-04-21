import {
  MA_TABULAR_FACE_REPORT_ID,
  MA_TABULAR_KPI1_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI2_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI3_DRILLDOWN_REPORT_ID,
  buildMAFaceRequestBody,
  buildMATabularUrl,
  getApiBaseUrl,
} from "@/lib/ma-api/constants";
import {
  getOrFetchMaApiCache,
  maFaceDataCacheKey,
  maKpi1DrilldownCacheKey,
  maKpi2DrilldownCacheKey,
  maKpi3DrilldownCacheKey,
} from "@/lib/ma-api/cache";
import type { MAApiDataRow, MAApiDrilldownRow, MAApiFilterParams, MAApiResponse } from "@/types/ma-api";

export type MAApiFetchOptions = { force?: boolean };

async function fetchMATabularData<T>(
  accessToken: string,
  reportId: number,
  filters?: MAApiFilterParams,
  lengthOverride?: string
): Promise<MAApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_KPI or NEXT_PUBLIC_API_ROOT is not set");
  }

  const url = buildMATabularUrl(baseUrl, reportId);
  const body = buildMAFaceRequestBody(filters, lengthOverride);

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

  const json: MAApiResponse<T> = await response.json();
  if (json.error) {
    throw new Error(json.error);
  }

  return json;
}

export async function fetchMAFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, MA_TABULAR_FACE_REPORT_ID, filters)
  );
}

export async function fetchMAKpi1DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maKpi1DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_KPI1_DRILLDOWN_REPORT_ID,
      filters,
      "500"
    )
  );
}

export async function fetchMAKpi2DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maKpi2DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_KPI2_DRILLDOWN_REPORT_ID,
      filters,
      "500"
    )
  );
}

export async function fetchMAKpi3DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maKpi3DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_KPI3_DRILLDOWN_REPORT_ID,
      filters,
      "500"
    )
  );
}
