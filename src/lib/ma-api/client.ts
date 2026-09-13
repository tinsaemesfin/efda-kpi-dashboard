import {
  MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE,
  MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS_BY_DATE,
  MA_PRODUCT_TIME_REPORT_IDS_BY_DATE,
  MA_PRODUCT_PAR_REPORT_IDS_BY_DATE,
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
  maMedicineMedianAverageFaceDataCacheKey,
  maMedicineMedianDrilldownCacheKey,
  maMedicineAverageDrilldownCacheKey,
  maMedicineParFaceDataCacheKey,
  maMedicalDeviceParFaceDataCacheKey,
  maFoodParFaceDataCacheKey,
  maCosmeticsParFaceDataCacheKey,
  maReportDataCacheKey,
  maKpi1DrilldownCacheKey,
  maFoodKpi1DrilldownCacheKey,
  maFoodKpi2DrilldownCacheKey,
  maFoodKpi3DrilldownCacheKey,
  maFoodKpi4DrilldownCacheKey,
  maKpi2DrilldownCacheKey,
  maKpi3DrilldownCacheKey,
  maKpi4DrilldownCacheKey,
  maMedicalDeviceKpi1DrilldownCacheKey,
  maMedicalDeviceKpi2DrilldownCacheKey,
  maMedicalDeviceKpi3DrilldownCacheKey,
  maMedicalDeviceKpi4DrilldownCacheKey,
} from "@/lib/ma-api/cache";
import type { MAApiDataRow, MAApiDrilldownRow, MAApiFilterParams, MADateBasis, MAApiMedianAverageDataRow, MAApiMedianDrilldownRow, MAApiAverageDrilldownRow, MAApiResponse, MAKPIId, MAKPITimeId, MAReportProduct } from "@/types/ma-api";

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

export async function fetchMAReportTabularData<T>(
  accessToken: string,
  reportId: number,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions,
  lengthOverride = "500"
): Promise<MAApiResponse<T>> {
  const key = maReportDataCacheKey(reportId, filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<T>(accessToken, reportId, filters, lengthOverride)
  );
}

export function getMAStandardDrilldownReportId(
  product: MAReportProduct,
  kpiId: MAKPIId,
  basis: MADateBasis = "submission"
): number | null {
  return MA_PRODUCT_STANDARD_DRILLDOWN_REPORT_IDS_BY_DATE[basis][product][kpiId] ?? null;
}

export function getMAStandardFaceReportId(
  product: MAReportProduct,
  basis: MADateBasis = "submission"
): number {
  return MA_PRODUCT_STANDARD_FACE_REPORT_IDS_BY_DATE[basis][product];
}

export function getMATimeReportId(
  product: MAReportProduct,
  kpiId: MAKPITimeId | "face",
  basis: MADateBasis = "submission"
): number {
  const reports = MA_PRODUCT_TIME_REPORT_IDS_BY_DATE[basis][product];
  return kpiId === "MA-KPI-6" ? reports.median : kpiId === "MA-KPI-7" ? reports.average : reports.face;
}

export function getMAParReportId(product: MAReportProduct, kind: "face" | "drilldown", basis: MADateBasis = "submission"): number {
  return MA_PRODUCT_PAR_REPORT_IDS_BY_DATE[basis][product][kind];
}

function getDateBasis(filters?: MAApiFilterParams): MADateBasis {
  return filters?.dateBasis ?? "submission";
}

export async function fetchMAFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAStandardFaceReportId("medicine", getDateBasis(filters)), filters)
  );
}

export async function fetchMAFoodFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maFoodFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAStandardFaceReportId("food", getDateBasis(filters)), filters)
  );
}

export async function fetchMAFoodNotificationFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maFoodNotificationFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAStandardFaceReportId("foodNotification", getDateBasis(filters)), filters)
  );
}

export async function fetchMAMedicalDeviceFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maMedicalDeviceFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAStandardFaceReportId("medicalDevice", getDateBasis(filters)), filters)
  );
}

export async function fetchMACosmeticsFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maCosmeticsFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAStandardFaceReportId("cosmetics", getDateBasis(filters)), filters)
  );
}

/** Medicine PAR face, selected by submission or decision date. */
export async function fetchMAMedicineParFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maMedicineParFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAParReportId("medicine", "face", getDateBasis(filters)), filters)
  );
}

/** Medical Device PAR face, selected by submission or decision date. */
export async function fetchMAMedicalDeviceParFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maMedicalDeviceParFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(
      accessToken,
      getMAParReportId("medicalDevice", "face", getDateBasis(filters)),
      filters
    )
  );
}

/** Food PAR face, selected by submission or decision date. */
export async function fetchMAFoodParFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maFoodParFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAParReportId("food", "face", getDateBasis(filters)), filters)
  );
}

/** Cosmetics PAR face, selected by submission or decision date. */
export async function fetchMACosmeticsParFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDataRow>> {
  const key = maCosmeticsParFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDataRow>(accessToken, getMAParReportId("cosmetics", "face", getDateBasis(filters)), filters)
  );
}

/** Medicine regulatory completion-time face for the selected date basis. */
export async function fetchMAMedicineMedianAverageFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiMedianAverageDataRow>> {
  const key = maMedicineMedianAverageFaceDataCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiMedianAverageDataRow>(
      accessToken,
      getMATimeReportId("medicine", "face", getDateBasis(filters)),
      filters
    )
  );
}

/** Medicine median completion-time drilldown for the selected date basis. */
export async function fetchMAMedicineMedianDrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiMedianDrilldownRow>> {
  const key = maMedicineMedianDrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiMedianDrilldownRow>(
      accessToken,
      getMATimeReportId("medicine", "MA-KPI-6", getDateBasis(filters)),
      filters,
      "500"
    )
  );
}

/** Medicine average completion-time drilldown for the selected date basis. */
export async function fetchMAMedicineAverageDrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiAverageDrilldownRow>> {
  const key = maMedicineAverageDrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiAverageDrilldownRow>(
      accessToken,
      getMATimeReportId("medicine", "MA-KPI-7", getDateBasis(filters)),
      filters,
      "500"
    )
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
      getMAStandardDrilldownReportId("medicine", "MA-KPI-1", getDateBasis(filters))!,
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
      getMAStandardDrilldownReportId("food", "MA-KPI-1", getDateBasis(filters))!,
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
      getMAStandardDrilldownReportId("medicine", "MA-KPI-2", getDateBasis(filters))!,
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
      getMAStandardDrilldownReportId("food", "MA-KPI-2", getDateBasis(filters))!,
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
      getMAStandardDrilldownReportId("medicine", "MA-KPI-3", getDateBasis(filters))!,
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
      getMAStandardDrilldownReportId("food", "MA-KPI-3", getDateBasis(filters))!,
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
      getMAStandardDrilldownReportId("medicine", "MA-KPI-4", getDateBasis(filters))!,
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
      getMAStandardDrilldownReportId("food", "MA-KPI-4", getDateBasis(filters))!,
      filters,
      "500"
    )
  );
}

export async function fetchMAMedicalDeviceKpi1DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maMedicalDeviceKpi1DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      getMAStandardDrilldownReportId("medicalDevice", "MA-KPI-1", getDateBasis(filters))!,
      filters,
      "500"
    )
  );
}

export async function fetchMAMedicalDeviceKpi2DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maMedicalDeviceKpi2DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      getMAStandardDrilldownReportId("medicalDevice", "MA-KPI-2", getDateBasis(filters))!,
      filters,
      "500"
    )
  );
}

export async function fetchMAMedicalDeviceKpi3DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maMedicalDeviceKpi3DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      getMAStandardDrilldownReportId("medicalDevice", "MA-KPI-3", getDateBasis(filters))!,
      filters,
      "500"
    )
  );
}

export async function fetchMAMedicalDeviceKpi4DrilldownTabularData(
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: MAApiFetchOptions
): Promise<MAApiResponse<MAApiDrilldownRow>> {
  const key = maMedicalDeviceKpi4DrilldownCacheKey(filters);
  return getOrFetchMaApiCache(key, options?.force ?? false, () =>
    fetchMATabularData<MAApiDrilldownRow>(
      accessToken,
      getMAStandardDrilldownReportId("medicalDevice", "MA-KPI-4", getDateBasis(filters))!,
      filters,
      "500"
    )
  );
}
