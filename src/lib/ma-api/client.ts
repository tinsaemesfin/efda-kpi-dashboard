import {
  MA_TABULAR_FACE_REPORT_ID,
  MA_TABULAR_FOOD_FACE_REPORT_ID,
  MA_TABULAR_FOOD_NOTIFICATION_FACE_REPORT_ID,
  MA_TABULAR_MEDICAL_DEVICE_FACE_REPORT_ID,
  MA_TABULAR_COSMETICS_FACE_REPORT_ID,
  MA_TABULAR_KPI1_DRILLDOWN_REPORT_ID,
  MA_TABULAR_FOOD_KPI1_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI2_DRILLDOWN_REPORT_ID,
  MA_TABULAR_FOOD_KPI2_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI3_DRILLDOWN_REPORT_ID,
  MA_TABULAR_FOOD_KPI3_DRILLDOWN_REPORT_ID,
  MA_TABULAR_KPI4_DRILLDOWN_REPORT_ID,
  MA_TABULAR_FOOD_KPI4_DRILLDOWN_REPORT_ID,
  buildMAFaceRequestBody,
  buildMATabularUrl,
  getApiBaseUrl,
} from "@/lib/ma-api/constants";
import {
  getOrFetchMaApiCache,
  maFaceDataCacheKey,
  maFoodFaceDataCacheKey,
  maFoodNotificationFaceDataCacheKey,
  maMedicalDeviceFaceDataCacheKey,
  maCosmeticsFaceDataCacheKey,
  maKpi1DrilldownCacheKey,
  maFoodKpi1DrilldownCacheKey,
  maFoodKpi2DrilldownCacheKey,
  maFoodKpi3DrilldownCacheKey,
  maFoodKpi4DrilldownCacheKey,
  maKpi2DrilldownCacheKey,
  maKpi3DrilldownCacheKey,
  maKpi4DrilldownCacheKey,
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

export async function fetchMAFoodFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maFoodFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, MA_TABULAR_FOOD_FACE_REPORT_ID, filters)
  );
}

export async function fetchMAFoodNotificationFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maFoodNotificationFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, MA_TABULAR_FOOD_NOTIFICATION_FACE_REPORT_ID, filters)
  );
}

export async function fetchMAMedicalDeviceFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maMedicalDeviceFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, MA_TABULAR_MEDICAL_DEVICE_FACE_REPORT_ID, filters)
  );
}

export async function fetchMACosmeticsFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maCosmeticsFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, MA_TABULAR_COSMETICS_FACE_REPORT_ID, filters)
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

export async function fetchMAFoodKpi1DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maFoodKpi1DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_FOOD_KPI1_DRILLDOWN_REPORT_ID,
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

export async function fetchMAFoodKpi2DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maFoodKpi2DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_FOOD_KPI2_DRILLDOWN_REPORT_ID,
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

export async function fetchMAFoodKpi3DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maFoodKpi3DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_FOOD_KPI3_DRILLDOWN_REPORT_ID,
      filters,
      "500"
    )
  );
}

export async function fetchMAKpi4DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maKpi4DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_KPI4_DRILLDOWN_REPORT_ID,
      filters,
      "500"
    )
  );
}

export async function fetchMAFoodKpi4DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maFoodKpi4DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      MA_TABULAR_FOOD_KPI4_DRILLDOWN_REPORT_ID,
      filters,
      "500"
    )
  );
}
