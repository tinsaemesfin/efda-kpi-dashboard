"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCTKpi1FaceTabularData,
  fetchCTKpi2FaceTabularData,
} from "@/lib/ct-api/client";
import {
  ctKpi1FaceDataCacheKey,
  ctKpi2FaceDataCacheKey,
  peekCtApiCache,
} from "@/lib/ct-api/cache";
import { normalizeCTFaceReport } from "@/lib/ct-api/normalizer";
import type {
  CTApiDataRow,
  CTApiFilterParams,
  CTApiResponse,
  CTKPITransformedData,
  CTNormalizationWarning,
} from "@/types/ct-api";

interface UseCTApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

type CTTabularFetcher = (
  accessToken: string,
  filters?: CTApiFilterParams,
  options?: { force?: boolean }
) => Promise<CTApiResponse<CTApiDataRow>>;

function useCTTabularReportData(
  fetcher: CTTabularFetcher,
  filters: CTApiFilterParams | undefined,
  enabled: boolean,
  getCacheKey: (filters?: CTApiFilterParams) => string
): UseCTApiState<CTApiResponse<CTApiDataRow>> {
  const { isAuthenticated, loading: authLoading, accessToken } = useAuth();
  const [data, setData] = useState<CTApiResponse<CTApiDataRow> | null>(null);
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
        const cached = peekCtApiCache<CTApiResponse<CTApiDataRow>>(cacheKey);
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
        setError(err instanceof Error ? err : new Error("Failed to fetch CT KPI data"));
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

export interface CTKPIDataFacade {
  kpiFaceDataById: CTKPITransformedData | null;
  loading: boolean;
  error: Error | null;
  warnings: CTNormalizationWarning[];
  metadata: {
    totalRows: number;
    filteredRows: number;
    acceptedRows: number;
    fetchedAt: string | null;
  };
  refetch: () => Promise<void>;
}

/**
 * CT face KPIs 1–2 from tabular reports /33 and /34.
 * Same stream as MA: fetch → normalize → merge on the page.
 */
export function useCTKPIDataFacade(filters?: CTApiFilterParams): CTKPIDataFacade {
  const kpi1 = useCTTabularReportData(
    fetchCTKpi1FaceTabularData,
    filters,
    true,
    ctKpi1FaceDataCacheKey
  );
  const kpi2 = useCTTabularReportData(
    fetchCTKpi2FaceTabularData,
    filters,
    true,
    ctKpi2FaceDataCacheKey
  );

  const transformed = useMemo(() => {
    const warnings: CTNormalizationWarning[] = [];
    const kpiFaceDataById: CTKPITransformedData = {};
    let totalRows = 0;
    let filteredRows = 0;
    let acceptedRows = 0;

    if (kpi1.data?.data) {
      const result = normalizeCTFaceReport(kpi1.data.data, "CT-KPI-1");
      Object.assign(kpiFaceDataById, result.kpiFaceDataById);
      warnings.push(...result.warnings);
      totalRows += result.totals.totalRows;
      filteredRows += result.totals.filteredRows;
      acceptedRows += result.totals.acceptedRows;
    }

    if (kpi2.data?.data) {
      const result = normalizeCTFaceReport(kpi2.data.data, "CT-KPI-2");
      Object.assign(kpiFaceDataById, result.kpiFaceDataById);
      warnings.push(...result.warnings);
      totalRows += result.totals.totalRows;
      filteredRows += result.totals.filteredRows;
      acceptedRows += result.totals.acceptedRows;
    }

    const hasAnyData = Boolean(kpi1.data || kpi2.data);
    return {
      kpiFaceDataById: hasAnyData ? kpiFaceDataById : null,
      warnings,
      totals: { totalRows, filteredRows, acceptedRows },
    };
  }, [kpi1.data, kpi2.data]);

  useEffect(() => {
    if (!transformed.warnings.length) return;
    transformed.warnings.forEach((warning) => {
      if (warning.code === "EMPTY_RESULT") return;
      console.warn(`[CT API] ${warning.code}: ${warning.message}`, warning.row ?? {});
    });
  }, [transformed.warnings]);

  const refetchKpi1 = kpi1.refetch;
  const refetchKpi2 = kpi2.refetch;
  const refetch = useCallback(async () => {
    await Promise.all([refetchKpi1(), refetchKpi2()]);
  }, [refetchKpi1, refetchKpi2]);

  const combinedError = kpi1.error ?? kpi2.error;
  const loading = kpi1.loading || kpi2.loading;
  const fetchedAt =
    kpi1.data || kpi2.data ? new Date().toISOString() : null;

  return {
    kpiFaceDataById: transformed.kpiFaceDataById,
    loading,
    error: combinedError,
    warnings: transformed.warnings,
    metadata: {
      totalRows: transformed.totals.totalRows,
      filteredRows: transformed.totals.filteredRows,
      acceptedRows: transformed.totals.acceptedRows,
      fetchedAt,
    },
    refetch,
  };
}
