'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type {
  MAApiResponse,
  MAApiDataRow,
  MAApiFilterParams,
  MAKPITransformedRow,
  MASubmoduleTypeCode,
} from '@/types/ma-api';
import { MODULE_CODE_TO_KPI } from '@/types/ma-api';

interface UseMAApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Transform API data to KPI format for a single product (submodule).
 * API has module_code: NMR (New→KPI-1), REN (Renewal→KPI-2), VAR (Variation→KPI-3).
 * Filter by submoduletype_code for product: MDCN=Medicine, FD=Food, MD=Medical Device.
 */
function transformToKPIFormat(
  rows: MAApiDataRow[],
  submoduleFilter: MASubmoduleTypeCode
): Record<string, MAKPITransformedRow> {
  const result: Record<string, MAKPITransformedRow> = {};
  const filtered = rows.filter(
    (row) => row.submoduletype_code?.toUpperCase() === submoduleFilter
  );

  const byModule = new Map<string, MAApiDataRow[]>();
  filtered.forEach((row) => {
    const code = row.module_code;
    const list = byModule.get(code) ?? [];
    list.push(row);
    byModule.set(code, list);
  });

  byModule.forEach((moduleRows, moduleCode) => {
    const kpiId = MODULE_CODE_TO_KPI[moduleCode as keyof typeof MODULE_CODE_TO_KPI];
    if (!kpiId) return;

    const totalOnTime = moduleRows.reduce((s, r) => s + (r.on_time_count ?? 0), 0);
    const totalCount = moduleRows.reduce((s, r) => s + (r.total_count ?? 0), 0);
    const percentage = totalCount > 0 ? (totalOnTime / totalCount) * 100 : 0;

    result[kpiId] = {
      numerator: totalOnTime,
      denominator: totalCount,
      percentage,
    };
  });

  return result;
}

const getApiBase = (): string => {
  const kpi = process.env.NEXT_PUBLIC_API_KPI;
  const root = process.env.NEXT_PUBLIC_API_ROOT;
  return kpi || root || '';
};

/**
 * Fetches MA KPI data from the API (endpoint /8).
 * Returns raw response; use useMAKPIDataMedicine for Medicine-only transformed data.
 */
export function useMAKPIData(filters?: MAApiFilterParams): UseMAApiState<MAApiResponse> {
  const { isAuthenticated, loading: authLoading, accessToken } = useAuth();
  const [data, setData] = useState<MAApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken) {
      setLoading(false);
      return;
    }

    const baseUrl = getApiBase();
    if (!baseUrl) {
      setError(new Error('NEXT_PUBLIC_API_KPI or NEXT_PUBLIC_API_ROOT is not set'));
      setLoading(false);
      return;
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/kpi/tabular/8`;
    setLoading(true);
    setError(null);

    try {
      const formData = new URLSearchParams();
      formData.append('draw', '1');
      formData.append('start', '0');
      formData.append('length', '25');
      if (filters?.startDate) formData.append('startDate', filters.startDate);
      if (filters?.endDate) formData.append('endDate', filters.endDate);
      if (filters?.quarter) formData.append('quarter', filters.quarter);
      if (filters?.year != null) formData.append('year', String(filters.year));

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }

      const json: MAApiResponse = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch MA KPI data'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, accessToken, filters?.startDate, filters?.endDate, filters?.quarter, filters?.year]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && accessToken) {
      fetchData();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, accessToken, fetchData]);

  return {
    data,
    loading: loading || authLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * MA KPI data transformed for Medicine (MDCN) only.
 * Use on the Market Authorizations page when product tab is Medicine for MA-KPI-1, MA-KPI-2, MA-KPI-3.
 */
export function useMAKPIDataMedicine(filters?: MAApiFilterParams) {
  const { data: rawData, loading, error, refetch } = useMAKPIData(filters);

  const medicineData = useMemo(() => {
    if (!rawData?.data?.length) return null;
    return transformToKPIFormat(rawData.data, 'MDCN');
  }, [rawData]);

  return {
    data: medicineData,
    rawData,
    loading,
    error,
    refetch,
  };
}
