"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchGMPReports } from "@/lib/gmp-api/client";
import { GMP_DRILLDOWN_REPORTS, GMP_FACE_REPORTS, GMP_KPI_IDS, GMP_OVERVIEW_REPORT_IDS } from "@/lib/gmp-api/constants";
import { normalizeGMPFaceMetric, normalizeGMPOverview } from "@/lib/gmp-api/normalizer";
import type { GMPApiFilterParams, GMPFaceMetric, GMPKPIId } from "@/types/gmp-api";

export function useGMPFaceMetrics(filters: GMPApiFilterParams, enabled = true) {
  const { accessToken, isAuthenticated, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<Partial<Record<GMPKPIId, GMPFaceMetric>>>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!enabled || authLoading || !isAuthenticated || !accessToken) {
      if (!authLoading) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const entries = await Promise.all(
        GMP_KPI_IDS.map(async (kpiId) => {
          const reports = await fetchGMPReports(accessToken, GMP_FACE_REPORTS[kpiId], filters);
          return [kpiId, normalizeGMPFaceMetric(kpiId, reports)] as const;
        })
      );
      setMetrics(Object.fromEntries(entries));
      const failed = entries.flatMap(([, metric]) => metric.reports.filter((report) => report.error));
      if (failed.length) setError(new Error(`${failed.length} GMP report request${failed.length === 1 ? "" : "s"} failed.`));
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error("Unable to load GMP KPI reports"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading, enabled, filters, isAuthenticated]);

  useEffect(() => { void load(); }, [load]);
  return { metrics, loading: loading || authLoading, error, refetch: load };
}

export function useGMPDrilldown(kpiId: GMPKPIId | null, filters: GMPApiFilterParams, enabled: boolean) {
  const { accessToken, isAuthenticated } = useAuth();
  const reportIds = useMemo(() => kpiId ? GMP_DRILLDOWN_REPORTS[kpiId] : [], [kpiId]);
  const query = useQuery({
    queryKey: ["gmp-drilldown", kpiId, filters, accessToken],
    queryFn: () => fetchGMPReports(accessToken!, reportIds, filters),
    enabled: enabled && !!kpiId && !!accessToken && isAuthenticated && reportIds.length > 0,
  });
  const reports = query.data ?? [];
  return {
    reports,
    loading: query.isFetching,
    error: query.error ?? (reports.some(report => report.error) ? new Error("Some drilldown reports could not be loaded.") : null),
    supported: reportIds.length > 0,
  };
}

/** All-time overview counts for the page hero. Deliberately ignores the page date filters. */
export function useGMPOverview() {
  const { accessToken, isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: ["gmp-overview", accessToken],
    queryFn: () => fetchGMPReports(accessToken!, GMP_OVERVIEW_REPORT_IDS),
    enabled: !!accessToken && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const groups = useMemo(() => normalizeGMPOverview(query.data ?? []), [query.data]);
  return { groups, loading: query.isPending, error: query.error };
}
