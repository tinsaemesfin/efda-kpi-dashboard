import type { CTApiFilterParams } from "@/types/ct-api";
import {
  getOrFetchMaApiCache,
  peekMaApiCache,
} from "@/lib/ma-api/cache";

/** Reuse MA client cache store with CT-prefixed keys. */
function stableFiltersKey(filters?: CTApiFilterParams): string {
  return JSON.stringify(filters ?? null);
}

export function ctKpi1FaceDataCacheKey(filters?: CTApiFilterParams): string {
  return `ct-kpi1-face:${stableFiltersKey(filters)}`;
}

export function ctKpi2FaceDataCacheKey(filters?: CTApiFilterParams): string {
  return `ct-kpi2-face:${stableFiltersKey(filters)}`;
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
