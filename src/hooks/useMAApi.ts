'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMAFaceTabularData,
  fetchMAFoodFaceTabularData,
  fetchMAFoodNotificationFaceTabularData,
  fetchMACosmeticsFaceTabularData,
  fetchMAMedicalDeviceFaceTabularData,
  fetchMAKpi1DrilldownTabularData,
  fetchMAFoodKpi1DrilldownTabularData,
  fetchMAKpi2DrilldownTabularData,
  fetchMAFoodKpi2DrilldownTabularData,
  fetchMAKpi3DrilldownTabularData,
  fetchMAFoodKpi3DrilldownTabularData,
  fetchMAKpi4DrilldownTabularData,
  fetchMAFoodKpi4DrilldownTabularData,
  fetchMAMedicalDeviceKpi1DrilldownTabularData,
  fetchMAMedicalDeviceKpi2DrilldownTabularData,
  fetchMAMedicalDeviceKpi3DrilldownTabularData,
  fetchMAMedicalDeviceKpi4DrilldownTabularData,
  fetchMAMedicineMedianAverageFaceTabularData,
} from '@/lib/ma-api/client';
import {
  maFaceDataCacheKey,
  maFoodFaceDataCacheKey,
  maFoodNotificationFaceDataCacheKey,
  maCosmeticsFaceDataCacheKey,
  maMedicalDeviceFaceDataCacheKey,
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
  maMedicineMedianAverageFaceDataCacheKey,
  peekMaApiCache,
} from '@/lib/ma-api/cache';
import { getConfiguredMAModuleToKpiMapping } from '@/lib/ma-api/mapping';
import { normalizeMAFaceData } from '@/lib/ma-api/normalizer';
import { normalizeMAMedicineMedianAverageFaceData } from '@/lib/ma-api/median-average-normalizer';
import type {
  MAApiDataRow,
  MAApiDrilldownRow,
  MAApiMedianAverageDataRow,
  MAApiResponse,
  MAApiFilterParams,
  MAKPITransformedData,
  MAKPITimeTransformedData,
  MANormalizationWarning,
  MANormalizeMedianAverageWarning,
  MAModuleToKpiMapping,
  MASubmoduleTypeCode,
} from '@/types/ma-api';
import { MA_COSMETICS_FACE_MODULE_TO_KPI_MAPPING, MA_MODULE_CODE_ALIASES } from '@/lib/ma-api/constants';

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
 * Fetches Food MA KPI 1 drilldown data from the API (endpoint /18).
 */
export function useMAFoodKPI1DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAFoodKpi1DrilldownTabularData,
    filters,
    enabled,
    maFoodKpi1DrilldownCacheKey
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
 * Fetches Food MA KPI 2 drilldown data from the API (endpoint /19).
 */
export function useMAFoodKPI2DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAFoodKpi2DrilldownTabularData,
    filters,
    enabled,
    maFoodKpi2DrilldownCacheKey
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

/**
 * Fetches Food MA KPI 3 (VMIN) drilldown data from the API (endpoint /20).
 */
export function useMAFoodKPI3DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAFoodKpi3DrilldownTabularData,
    filters,
    enabled,
    maFoodKpi3DrilldownCacheKey
  );
}

/**
 * Fetches MA KPI 4 (major variation) drilldown data from the API (endpoint /13).
 */
export function useMAKPI4DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAKpi4DrilldownTabularData,
    filters,
    enabled,
    maKpi4DrilldownCacheKey
  );
}

/**
 * Fetches Food MA KPI 4 (VMAJ) drilldown data from the API (endpoint /21).
 */
export function useMAFoodKPI4DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAFoodKpi4DrilldownTabularData,
    filters,
    enabled,
    maFoodKpi4DrilldownCacheKey
  );
}

/**
 * Fetches Medical Device MA KPI 1 (New) drilldown data from the API (endpoint /22).
 */
export function useMAMedicalDeviceKPI1DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAMedicalDeviceKpi1DrilldownTabularData,
    filters,
    enabled,
    maMedicalDeviceKpi1DrilldownCacheKey
  );
}

/**
 * Fetches Medical Device MA KPI 2 (Renewal) drilldown data from the API (endpoint /23).
 */
export function useMAMedicalDeviceKPI2DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAMedicalDeviceKpi2DrilldownTabularData,
    filters,
    enabled,
    maMedicalDeviceKpi2DrilldownCacheKey
  );
}

/**
 * Fetches Medical Device MA KPI 3 (VMIN) drilldown data from the API (endpoint /24).
 */
export function useMAMedicalDeviceKPI3DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAMedicalDeviceKpi3DrilldownTabularData,
    filters,
    enabled,
    maMedicalDeviceKpi3DrilldownCacheKey
  );
}

/**
 * Fetches Medical Device MA KPI 4 (VMAJ) drilldown data from the API (endpoint /25).
 */
export function useMAMedicalDeviceKPI4DrilldownData(
  filters?: MAApiFilterParams,
  enabled = true
): UseMAApiState<MAApiResponse<MAApiDrilldownRow>> {
  return useMATabularReportData<MAApiDrilldownRow>(
    fetchMAMedicalDeviceKpi4DrilldownTabularData,
    filters,
    enabled,
    maMedicalDeviceKpi4DrilldownCacheKey
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

interface MAFaceFacadeSource {
  fetcher: MATabularFetcher<MAApiDataRow>;
  cacheKey: (filters?: MAApiFilterParams) => string;
  /** Omit when the tabular report is already scoped to one product (e.g. Food /14). */
  submoduleFilter?: MASubmoduleTypeCode;
  /** Override default/env module→KPI mapping (e.g. Cosmetics aggregates VMAJ into MA-KPI-3). */
  moduleToKpiMapping?: MAModuleToKpiMapping;
}

function useMAKPIDataFaceFacade(
  { fetcher, cacheKey, submoduleFilter, moduleToKpiMapping: moduleMappingOverride }: MAFaceFacadeSource,
  filters?: MAApiFilterParams
): MAKPIDataFacade {
  const { data: rawData, loading, error, refetch } = useMATabularReportData<MAApiDataRow>(
    fetcher,
    filters,
    true,
    cacheKey
  );

  const transformed = useMemo(() => {
    if (!rawData?.data?.length) {
      return {
        kpiFaceDataById: null,
        warnings: [] as MANormalizationWarning[],
        totals: { totalRows: rawData?.data?.length ?? 0, filteredRows: 0, acceptedRows: 0 },
      };
    }

    const moduleToKpiMapping = moduleMappingOverride ?? getConfiguredMAModuleToKpiMapping();
    return normalizeMAFaceData(rawData.data, {
      submoduleFilter,
      moduleToKpiMapping,
      moduleCodeAliases: MA_MODULE_CODE_ALIASES,
    });
  }, [rawData, submoduleFilter, moduleMappingOverride]);

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
  const facade = useMAKPIDataMedicineFacade(filters);
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
  return useMAKPIDataFaceFacade(
    {
      fetcher: fetchMAFaceTabularData,
      cacheKey: maFaceDataCacheKey,
      submoduleFilter: 'MDCN',
    },
    filters
  );
}

/** Food MA-KPI-1..4 face values from tabular report /14 (same normalization as Medicine /8). */
export function useMAKPIDataFoodFacade(filters?: MAApiFilterParams): MAKPIDataFacade {
  return useMAKPIDataFaceFacade(
    {
      fetcher: fetchMAFoodFaceTabularData,
      cacheKey: maFoodFaceDataCacheKey,
    },
    filters
  );
}

/** Food Notification MA-KPI-1..4 face values from tabular report /15. */
export function useMAKPIDataFoodNotificationFacade(
  filters?: MAApiFilterParams
): MAKPIDataFacade {
  return useMAKPIDataFaceFacade(
    {
      fetcher: fetchMAFoodNotificationFaceTabularData,
      cacheKey: maFoodNotificationFaceDataCacheKey,
    },
    filters
  );
}

/** Medical Device MA-KPI-1..4 face values from tabular report /16. */
export function useMAKPIDataMedicalDeviceFacade(
  filters?: MAApiFilterParams
): MAKPIDataFacade {
  return useMAKPIDataFaceFacade(
    {
      fetcher: fetchMAMedicalDeviceFaceTabularData,
      cacheKey: maMedicalDeviceFaceDataCacheKey,
      submoduleFilter: "MD",
    },
    filters
  );
}

/** Cosmetics MA-KPI-1..3 face values from tabular report /17 (single variation KPI; minor+major → MA-KPI-3). */
export function useMAKPIDataCosmeticsFacade(filters?: MAApiFilterParams): MAKPIDataFacade {
  return useMAKPIDataFaceFacade(
    {
      fetcher: fetchMACosmeticsFaceTabularData,
      cacheKey: maCosmeticsFaceDataCacheKey,
      moduleToKpiMapping: MA_COSMETICS_FACE_MODULE_TO_KPI_MAPPING,
    },
    filters
  );
}

interface MAKPIDataTimeFacade {
  kpiTimeDataById: MAKPITimeTransformedData | null;
  rawData: MAApiResponse<MAApiMedianAverageDataRow> | null;
  loading: boolean;
  error: Error | null;
  warnings: MANormalizeMedianAverageWarning[];
  metadata: {
    totalRows: number;
    filteredRows: number;
    acceptedRows: number;
    fetchedAt: string | null;
  };
  refetch: () => Promise<void>;
}

/**
 * Medicine MA-KPI-6 (median) & MA-KPI-7 (average) from tabular report /26.
 * Normalizer field mapping will be finalized once the backend response format is confirmed.
 */
export function useMAMedicineMedianAverageFaceFacade(
  filters?: MAApiFilterParams
): MAKPIDataTimeFacade {
  const { data: rawData, loading, error, refetch } = useMATabularReportData<MAApiMedianAverageDataRow>(
    fetchMAMedicineMedianAverageFaceTabularData,
    filters,
    true,
    maMedicineMedianAverageFaceDataCacheKey
  );

  const transformed = useMemo(() => {
    if (!rawData?.data?.length) {
      return {
        kpiTimeDataById: null,
        warnings: [] as MANormalizeMedianAverageWarning[],
        totals: { totalRows: rawData?.data?.length ?? 0, filteredRows: 0, acceptedRows: 0 },
      };
    }

    return normalizeMAMedicineMedianAverageFaceData(rawData.data, {
      submoduleFilter: 'MDCN',
      moduleFilter: 'NMR',
    });
  }, [rawData]);

  useEffect(() => {
    if (!transformed.warnings.length) return;
    transformed.warnings.forEach((warning) => {
      if (warning.code === 'EMPTY_RESULT') return;
      console.warn(`[MA API /26] ${warning.code}: ${warning.message}`, warning.row ?? {});
    });
  }, [transformed.warnings]);

  return {
    kpiTimeDataById: transformed.kpiTimeDataById,
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
