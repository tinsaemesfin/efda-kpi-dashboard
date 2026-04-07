import type { MAApiFilterParams } from '@/types/ma-api';

/** Client-side cache TTL for MA tabular API responses (face + drilldown). */
export const MA_API_CACHE_TTL_MS = 10 * 60 * 1000;

type CacheBucket<T> = { body: T; expiresAt: number };

const store = new Map<string, CacheBucket<unknown>>();

function stableFiltersKey(filters?: MAApiFilterParams): string {
  return JSON.stringify(filters ?? null);
}

export function maFaceDataCacheKey(filters?: MAApiFilterParams): string {
  return `ma-face:${stableFiltersKey(filters)}`;
}

export function maKpi1DrilldownCacheKey(filters?: MAApiFilterParams): string {
  return `ma-kpi1-dd:${stableFiltersKey(filters)}`;
}

export function maKpi2DrilldownCacheKey(filters?: MAApiFilterParams): string {
  return `ma-kpi2-dd:${stableFiltersKey(filters)}`;
}

export function peekMaApiCache<T>(key: string): T | null {
  const hit = store.get(key) as CacheBucket<T> | undefined;
  if (!hit || hit.expiresAt <= Date.now()) {
    if (hit && hit.expiresAt <= Date.now()) store.delete(key);
    return null;
  }
  return hit.body;
}

function setMaApiCache<T>(key: string, body: T): void {
  store.set(key, { body, expiresAt: Date.now() + MA_API_CACHE_TTL_MS });
}

/**
 * Returns cached data when fresh and force is false; otherwise runs fetcher and refreshes the cache.
 */
export async function getOrFetchMaApiCache<T>(
  key: string,
  force: boolean,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!force) {
    const cached = peekMaApiCache<T>(key);
    if (cached !== null) return cached;
  }
  const fresh = await fetcher();
  setMaApiCache(key, fresh);
  return fresh;
}
