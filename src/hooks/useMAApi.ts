'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMAFaceTabularData,
  fetchMAKpi1DrilldownTabularData,
  fetchMAKpi2DrilldownTabularData,
  fetchMAKpi3DrilldownTabularData,
} from '@/lib/ma-api/client';
import {
  maFaceDataCacheKey,
  maKpi1DrilldownCacheKey,
  maKpi2DrilldownCacheKey,
  maKpi3DrilldownCacheKey,
  peekMaApiCache,
} from '@/lib/ma-api/cache';
import { getConfiguredMAModuleToKpiMapping } from '@/lib/ma-api/mapping';
import { normalizeMAFaceData } from '@/lib/ma-api/normalizer';
import type {
  MAApiDataRow,
  MAApiDrilldownRow,
  MAApiResponse,
  MAApiFilterParams,
  MAKPITransformedData,
  MANormalizationWarning,
  MASubmoduleTypeCode,
} from '@/types/ma-api';
import { MA_MODULE_CODE_ALIASES } from '@/lib/ma-api/constants';

interface UseMAApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

type MATabularFetcher<T> = (
  accessToken: string,
  filters?: MAApiFilterParams,
  options?: { force?: boolean }
) => Promise<MAApiResponse<T>>;

function useMATabularReportData<T>(
  fetcher: MATabularFetcher<T>,
  filters: MAApiFilterParams | undefined,
  enabled: boolean,
  getCacheKey: (filters?: MAApiFilterParams) => string
): UseMAApiState<MAApiResponse<T>> {
  const { isAuthenticated, loading: authLoading, accessToken } = useAuth();
  const [data, setData] = useState<MAApiResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = useMemo(() => getCacheKey(filters), [filters, getCacheKey]);

  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      if (authLoading) return;
      if (!isAuthenticated || !accessToken) {
        setLoading(false);
        return;
      }

      if (!force) {
        const cached = peekMaApiCache<MAApiResponse<T>>(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const json = await fetcher(accessToken, filters, { force });
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch MA KPI data'));
      } finally {
        setLoading(false);
      }
    },
    [enabled, isAuthenticated, authLoading, accessToken, filters, fetcher, cacheKey]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!authLoading && isAuthenticated && accessToken) {
      void fetchData(false);
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [enabled, authLoading, isAuthenticated, accessToken, fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading: loading || authLoading,
    error,
    refetch,
  };
}

/**
 * Fetches MA KPI data from the API (endpoint /8).
 * Returns raw response; use useMAKPIDataMedicine for Medicine-only transformed data.
 */
export function useMAKPIData(filters?: MAApiFilterParams): UseMAApiState<MAApiResponse> {
  return useMATabularReportData<MAApiDataRow>(
    fetchMAFaceTabularData,
    filters,
    true,
    maFaceDataCacheKey
  );
}

/**
 * Fetches MA KPI 1 drilldown data from the API (endpoint /9).
 */
export function useMAKPI1DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAKpi1DrilldownTabularData,
    filters,
    enabled,
    maKpi1DrilldownCacheKey
  );
}

/**
 * Fetches MA KPI 2 drilldown data from the API (endpoint /10).
 */
export function useMAKPI2DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAKpi2DrilldownTabularData,
    filters,
    enabled,
    maKpi2DrilldownCacheKey
  );
}

/**
 * Fetches MA KPI 3 drilldown data from the API (endpoint /11).
 */
export function useMAKPI3DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAKpi3DrilldownTabularData,
    filters,
    enabled,
    maKpi3DrilldownCacheKey
  );
}

interface MAKPIDataFacade {
  kpiFaceDataById: Partial<MAKPITransformedData> | null;
  rawData: MAApiResponse | null;
  loading: boolean;
  error: Error | null;
  warnings: MANormalizationWarning[];
  metadata: {
    totalRows: number;
    filteredRows: number;
    acceptedRows: number;
    fetchedAt: string | null;
  };
  refetch: () => Promise<void>;
}

function useMAKPIDataBySubmodule(
  submoduleFilter: MASubmoduleTypeCode,
  filters?: MAApiFilterParams
): MAKPIDataFacade {
  const { data: rawData, loading, error, refetch } = useMAKPIData(filters);

  const transformed = useMemo(() => {
    if (!rawData?.data?.length) {
      return {
        kpiFaceDataById: null,
        warnings: [] as MANormalizationWarning[],
        totals: { totalRows: rawData?.data?.length ?? 0, filteredRows: 0, acceptedRows: 0 },
      };
    }

    const moduleToKpiMapping = getConfiguredMAModuleToKpiMapping();
    return normalizeMAFaceData(rawData.data, {
      submoduleFilter,
      moduleToKpiMapping,
      moduleCodeAliases: MA_MODULE_CODE_ALIASES,
    });
  }, [rawData, submoduleFilter]);

  useEffect(() => {
    if (!transformed.warnings.length) return;
    transformed.warnings.forEach((warning) => {
      if (warning.code === 'EMPTY_RESULT') return;
      console.warn(`[MA API] ${warning.code}: ${warning.message}`, warning.row ?? {});
    });
  }, [transformed.warnings]);

  return {
    kpiFaceDataById: transformed.kpiFaceDataById,
    rawData,
    loading,
    error,
    warnings: transformed.warnings,
    metadata: {
      totalRows: transformed.totals.totalRows,
      filteredRows: transformed.totals.filteredRows,
      acceptedRows: transformed.totals.acceptedRows,
      fetchedAt: rawData ? new Date().toISOString() : null,
    },
    refetch,
  };
}

/**
 * MA KPI data transformed for Medicine (MDCN) only.
 * Use on the Market Authorizations page when product tab is Medicine for MA-KPI-1, MA-KPI-2, MA-KPI-3.
 */
export function useMAKPIDataMedicine(filters?: MAApiFilterParams) {
  const facade = useMAKPIDataBySubmodule('MDCN', filters);
  return {
    data: facade.kpiFaceDataById,
    rawData: facade.rawData,
    loading: facade.loading,
    error: facade.error,
    warnings: facade.warnings,
    metadata: facade.metadata,
    refetch: facade.refetch,
  };
}

export function useMAKPIDataMedicineFacade(filters?: MAApiFilterParams): MAKPIDataFacade {
  return useMAKPIDataBySubmodule('MDCN', filters);
}
