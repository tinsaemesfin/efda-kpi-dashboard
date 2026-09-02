"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchGMPReports } from "@/lib/gmp-api/client";
import { GMP_DRILLDOWN_REPORTS, GMP_FACE_REPORTS, GMP_KPI_IDS } from "@/lib/gmp-api/constants";
import { normalizeGMPFaceMetric } from "@/lib/gmp-api/normalizer";
import type { GMPApiFilterParams, GMPFaceMetric, GMPKPIId, GMPReportResult } from "@/types/gmp-api";

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
  const [reports, setReports] = useState<GMPReportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reportIds = useMemo(() => kpiId ? GMP_DRILLDOWN_REPORTS[kpiId] : [], [kpiId]);
  const load = useCallback(async () => {
    if (!enabled || !kpiId || !accessToken || !isAuthenticated || !reportIds.length) return;
    let active = true;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchGMPReports(accessToken, reportIds, filters);
      if (!active) return;
      setReports(next);
      if (next.some((report) => report.error)) setError(new Error("Some drilldown reports could not be loaded."));
    } catch (reason) {
      if (active) setError(reason instanceof Error ? reason : new Error("Unable to load drilldown"));
    } finally {
      if (active) setLoading(false);
    }
    return () => { active = false; };
  }, [accessToken, enabled, filters, isAuthenticated, kpiId, reportIds]);

  useEffect(() => { void load(); }, [load]);

  return { reports, loading, error, supported: reportIds.length > 0 };
}
