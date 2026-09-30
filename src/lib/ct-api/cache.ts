import {
  CT_TABULAR_KPI1_FACE_REPORT_ID,
  CT_TABULAR_KPI2_FACE_REPORT_ID,
} from "@/lib/ct-api/constants";
import type { CTApiFilterParams, CTFaceKPIId } from "@/types/ct-api";
import { getOrFetchMaApiCache, peekMaApiCache } from "@/lib/ma-api/cache";

function stableFiltersKey(filters?: CTApiFilterParams): string {
  return JSON.stringify(filters ?? null);
}

export function ctFaceDataCacheKey(kpiId: CTFaceKPIId, reportId: number, filters?: CTApiFilterParams): string {
  return `ct-face:${kpiId}:${reportId}:${stableFiltersKey(filters)}`;
}

export function ctDrilldownCacheKey(kpiId: string, reportId: number, filters?: CTApiFilterParams): string {
  return `ct-drill:${kpiId}:${reportId}:${stableFiltersKey(filters)}`;
}

/** @deprecated Use ctFaceDataCacheKey */
export function ctKpi1FaceDataCacheKey(filters?: CTApiFilterParams): string {
  return ctFaceDataCacheKey("CT-KPI-1", CT_TABULAR_KPI1_FACE_REPORT_ID, filters);
}

/** @deprecated Use ctFaceDataCacheKey */
export function ctKpi2FaceDataCacheKey(filters?: CTApiFilterParams): string {
  return ctFaceDataCacheKey("CT-KPI-2", CT_TABULAR_KPI2_FACE_REPORT_ID, filters);
}

export function peekCtApiCache<T>(key: string): T | null {
  return peekMaApiCache<T>(key);
}

export async function getOrFetchCtApiCache<T>(
  key: string,
  force: boolean,
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrFetchMaApiCache(key, force, fetcher);
}
