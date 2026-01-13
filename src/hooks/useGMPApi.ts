/**
 * useGMPApi Hook
 * React hook for fetching GMP KPI data from the iLicense API
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { gmpApiService, TabularReportRow, GMPInspectionPerPlanResponse } from '@/lib/services/gmp-api.service';
import { useAuth } from './useAuth';

interface UseGMPApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching GMP Inspection Per Plan data (KPI-1)
 */
export function useGMPInspectionPerPlan(): UseGMPApiState<GMPInspectionPerPlanResponse> {
  const { isAuthenticated, loading: authLoading, accessToken } = useAuth();
  const [data, setData] = useState<GMPInspectionPerPlanResponse | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[GMP API] Auth still loading, waiting...');
      return;
    }

    if (!isAuthenticated || !accessToken) {
      console.log('[GMP API] Not authenticated or no token, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('[GMP API] Starting fetch for KPI-1 data...');
    setLoading(true);
    setError(null);

    try {
      const response = await gmpApiService.getInspectionPerPlanData();
      console.log('[GMP API] Received response:', response);
      setData(response);
      hasFetched.current = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch GMP data');
      setError(error);
      console.error('[GMP API] Error fetching GMP Inspection Per Plan:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, accessToken]);

  useEffect(() => {
    // Only fetch if auth is done loading and we haven't fetched yet
    if (!authLoading && isAuthenticated && accessToken && !hasFetched.current) {
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
 * Hook for fetching any tabular report by ID
 */
export function useTabularReport(reportId: number): UseGMPApiState<TabularReportRow[]> {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<TabularReportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await gmpApiService.getTabularReport(reportId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch report data'));
      console.error(`Error fetching tabular report ${reportId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, reportId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Transform API data to the format expected by the GMP KPI cards
 */
export function useGMPKPI1Data() {
  const { data, loading, error, refetch } = useGMPInspectionPerPlan();

  const transformedData = data ? gmpApiService.transformToKPIFormat(data.data) : null;

  return {
    data: transformedData,
    rawData: data,
    loading,
    error,
    refetch,
  };
}

