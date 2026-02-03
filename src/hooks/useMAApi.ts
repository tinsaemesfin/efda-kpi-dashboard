/**
 * useMAApi Hook
 * Simple React hook for fetching Market Authorization KPI data
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';
import type {
  MAApiResponse,
  MAApiDataRow,
  MAApiFilterParams,
  MAKPITransformedData,
} from '@/types/ma-api';
import {
  MODULE_CODE_TO_KPI,
  MODULE_CODE_LABELS,
  SUBMODULE_TYPE_LABELS,
} from '@/types/ma-api';

interface UseMAApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Transform API data to KPI format
 */
function transformToKPIFormat(data: MAApiDataRow[]): Record<string, MAKPITransformedData> {
  const transformed: Record<string, MAKPITransformedData> = {};
  
  // Group by module code
  const moduleMap = new Map<string, MAApiDataRow[]>();
  data.forEach((row) => {
    const existing = moduleMap.get(row.module_code) || [];
    existing.push(row);
    moduleMap.set(row.module_code, existing);
  });

  // Transform each module group
  moduleMap.forEach((rows, moduleCode) => {
    const kpiId = MODULE_CODE_TO_KPI[moduleCode as keyof typeof MODULE_CODE_TO_KPI];
    if (!kpiId) return;

    const totalOnTime = rows.reduce((sum, row) => sum + row.on_time_count, 0);
    const totalCount = rows.reduce((sum, row) => sum + row.total_count, 0);
    const overallPercentage = totalCount > 0 ? (totalOnTime / totalCount) * 100 : 0;

    // Build disaggregations by submodule type
    const submoduleMap = new Map<string, MAApiDataRow[]>();
    rows.forEach((row) => {
      const existing = submoduleMap.get(row.submoduletype_code) || [];
      existing.push(row);
      submoduleMap.set(row.submoduletype_code, existing);
    });

    const disaggregations: Record<string, { label: string; value: number; percentage: number }> = {};
    submoduleMap.forEach((subRows, submoduleCode) => {
      const onTimeCount = subRows.reduce((sum, row) => sum + row.on_time_count, 0);
      const subTotalCount = subRows.reduce((sum, row) => sum + row.total_count, 0);
      const subPercentage = subTotalCount > 0 ? (onTimeCount / subTotalCount) * 100 : 0;

      disaggregations[submoduleCode.toLowerCase()] = {
        label: SUBMODULE_TYPE_LABELS[submoduleCode as keyof typeof SUBMODULE_TYPE_LABELS],
        value: onTimeCount,
        percentage: subPercentage,
      };
    });

    transformed[kpiId] = {
      numerator: totalOnTime,
      denominator: totalCount,
      percentage: overallPercentage,
      disaggregations,
    };
  });

  return transformed;
}

/**
 * Hook for fetching MA KPI data
 */
export function useMAKPIData(filters?: MAApiFilterParams): UseMAApiState<MAApiResponse> {
  const { isAuthenticated, loading: authLoading, accessToken } = useAuth();
  const [data, setData] = useState<MAApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    if (authLoading) {
      console.log('[MA API] Auth still loading, waiting...');
      return;
    }

    if (!isAuthenticated || !accessToken) {
      console.log('[MA API] Not authenticated or no token, skipping fetch');
      setLoading(false);
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_KPI;
    if (!apiBaseUrl) {
      console.error('[MA API] NEXT_PUBLIC_API_KPI environment variable is not set');
      setError(new Error('API configuration missing'));
      setLoading(false);
      return;
    }

    console.log('[MA API] Starting fetch for MA KPI data...');
    setLoading(true);
    setError(null);

    try {
      const url = `${apiBaseUrl}/tabular/1`;
      
      // Prepare form-data body (matching Postman request)
      const formData = new URLSearchParams();
      formData.append('draw', '1');
      formData.append('start', '0');
      formData.append('length', '25');
      
      // Add filters when backend supports date filtering
      if (filters) {
        if (filters.startDate) formData.append('startDate', filters.startDate);
        if (filters.endDate) formData.append('endDate', filters.endDate);
        if (filters.quarter) formData.append('quarter', filters.quarter);
        if (filters.year) formData.append('year', filters.year.toString());
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      };

      console.log('[MA API] Request URL:', url);
      console.log('[MA API] Request body (form-data):', formData.toString());
      console.log('[MA API] Request headers:', headers);
      console.log('[MA API] Auth token present:', !!accessToken);
      console.log('[MA API] Auth token (first 20 chars):', accessToken?.substring(0, 20) + '...');

      const response = await axios.post<MAApiResponse>(url, formData.toString(), {
        headers,
        validateStatus: () => true, // Don't throw on any status, handle manually
      });

      console.log('[MA API] Response status:', response.status);
      console.log('[MA API] Response headers:', response.headers);
      
      if (response.status >= 400) {
        // Log the full error response for debugging
        console.error('[MA API] Error response status:', response.status);
        console.error('[MA API] Error response data:', response.data);
        console.error('[MA API] Error response headers:', response.headers);
        
        // Try to extract error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (response.data) {
          if (typeof response.data === 'string') {
            errorMessage = response.data;
          } else if (response.data.error) {
            errorMessage = response.data.error;
          } else if (response.data.message) {
            errorMessage = response.data.message;
          }
        }
        throw new Error(errorMessage);
      }

      console.log('[MA API] Received response:', response.data);
      setData(response.data);
      hasFetched.current = true;
    } catch (err) {
      let errorMessage = 'Failed to fetch MA KPI data';
      
      if (axios.isAxiosError(err)) {
        // Axios error - get detailed error info
        if (err.response) {
          // Server responded with error status
          errorMessage = `Server error ${err.response.status}: ${err.response.statusText}`;
          console.error('[MA API] Response error data:', err.response.data);
          console.error('[MA API] Response error headers:', err.response.headers);
        } else if (err.request) {
          // Request made but no response
          errorMessage = 'No response from server';
          console.error('[MA API] Request error:', err.request);
        } else {
          // Error setting up request
          errorMessage = `Request setup error: ${err.message}`;
        }
        console.error('[MA API] Axios error config:', err.config);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      const error = new Error(errorMessage);
      setError(error);
      console.error('[MA API] Error fetching MA KPI data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, accessToken, filters]);

  useEffect(() => {
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
 * Transform API data to the format expected by the MA KPI cards
 */
export function useMAKPITransformedData(filters?: MAApiFilterParams) {
  const { data, loading, error, refetch } = useMAKPIData(filters);

  const transformedData = useMemo(() => {
    return data ? transformToKPIFormat(data.data) : null;
  }, [data]);

  return {
    data: transformedData,
    rawData: data,
    loading,
    error,
    refetch,
  };
}
