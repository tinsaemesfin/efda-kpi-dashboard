"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchCTFaceTabularData } from "@/lib/ct-api/client";
import { CT_FACE_REPORTS } from "@/lib/ct-api/constants";
import { ctFaceDataCacheKey, peekCtApiCache } from "@/lib/ct-api/cache";
import { normalizeCTReport } from "@/lib/ct-api/normalizer";
import type {
  CTApiDataRow,
  CTApiFilterParams,
  CTApiResponse,
  CTKPITransformedData,
  CTNormalizationWarning,
} from "@/types/ct-api";

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
 * Live CT face KPIs. Each report is fetched and normalized on its own,
 * so one failed report does not hide the others.
 */
export function useCTKPIDataFacade(filters?: CTApiFilterParams): CTKPIDataFacade {
  const { isAuthenticated, loading: authLoading, accessToken } = useAuth();
  const [reports, setReports] = useState<Partial<Record<string, CTApiResponse<CTApiDataRow>>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const filterKey = useMemo(() => JSON.stringify(filters ?? null), [filters]);

  const fetchData = useCallback(
    async (force: boolean) => {
      if (authLoading) return;
      if (!isAuthenticated || !accessToken) {
        setLoading(false);
        return;
      }

      if (!force) {
        const cachedEntries = CT_FACE_REPORTS.map((report) => {
          const cached = peekCtApiCache<CTApiResponse<CTApiDataRow>>(ctFaceDataCacheKey(report.kpiId, filters));
          return cached ? ([report.kpiId, cached] as const) : null;
        });
        if (cachedEntries.every(Boolean)) {
          setReports(Object.fromEntries(cachedEntries.filter((entry) => entry != null)));
          setLoading(false);
          setError(null);
          setFetchedAt(new Date().toISOString());
          return;
        }
      }

      setLoading(true);
      setError(null);
      const next: Partial<Record<string, CTApiResponse<CTApiDataRow>>> = {};
      const failures: string[] = [];

      await Promise.all(
        CT_FACE_REPORTS.map(async (report) => {
          try {
            next[report.kpiId] = await fetchCTFaceTabularData(
              accessToken,
              report.kpiId,
              report.reportId,
              filters,
              { force }
            );
          } catch (err) {
            failures.push(err instanceof Error ? err.message : `${report.kpiId} failed`);
          }
        })
      );

      setReports(next);
      setFetchedAt(new Date().toISOString());
      setError(failures.length ? new Error(failures.join("; ")) : null);
      setLoading(false);
    },
    [isAuthenticated, authLoading, accessToken, filters]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated && accessToken) {
      void fetchData(reloadToken > 0);
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, accessToken, fetchData, filterKey, reloadToken]);

  const transformed = useMemo(() => {
    const warnings: CTNormalizationWarning[] = [];
    const kpiFaceDataById: CTKPITransformedData = {};
    let totalRows = 0;
    let filteredRows = 0;
    let acceptedRows = 0;

    if (!reports) return { kpiFaceDataById: null, warnings, totals: { totalRows, filteredRows, acceptedRows } };

    for (const report of CT_FACE_REPORTS) {
      const payload = reports[report.kpiId];
      if (!payload?.data) continue;
      const result = normalizeCTReport(payload.data, report.kpiId);
      Object.assign(kpiFaceDataById, result.kpiFaceDataById);
      warnings.push(...result.warnings);
      totalRows += result.totals.totalRows;
      filteredRows += result.totals.filteredRows;
      acceptedRows += result.totals.acceptedRows;
    }

    return { kpiFaceDataById, warnings, totals: { totalRows, filteredRows, acceptedRows } };
  }, [reports]);

  useEffect(() => {
    transformed.warnings.forEach((warning) => {
      if (warning.code === "EMPTY_RESULT") return;
      console.warn(`[CT API] ${warning.code}: ${warning.message}`, warning.row ?? {});
    });
  }, [transformed.warnings]);

  const refetch = useCallback(async () => {
    setReloadToken((value) => value + 1);
  }, []);

  return {
    kpiFaceDataById: transformed.kpiFaceDataById,
    loading: loading || authLoading,
    error,
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
