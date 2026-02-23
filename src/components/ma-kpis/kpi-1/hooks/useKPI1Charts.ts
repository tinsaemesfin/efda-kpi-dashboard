/**
 * Hook for KPI-1 chart data transformations
 */

import { useMemo, useCallback } from "react";
import { maKPIData } from "@/data/ma-dummy-data";
import type { IndividualApplication } from "@/types/ma-drilldown";

interface TimeSeriesDataPoint {
  name: string;
  onTime: number;
  gap: number;
  volume: number;
  averageDays: number;
  target: number;
}

interface HistogramDataPoint {
  range: string;
  count: number;
}

interface ScatterDataPoint {
  name: string;
  processingDays: number;
  targetDays: number;
  onTime: boolean;
  status: string;
}

interface BoxStats {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
}

export function useKPI1Charts(workingSet: IndividualApplication[], period: string) {
  const getBucketKey = useCallback(
    (date: Date) => {
      if (period === "Monthly") {
        return `${date.getFullYear()}-${date.toLocaleString("default", { month: "short" })}`;
      }
      if (period === "Annually") {
        return `${date.getFullYear()}`;
      }
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    },
    [period]
  );

  const timeSeries = useMemo((): TimeSeriesDataPoint[] => {
    if (!workingSet.length) {
      // Fallback to quarterly data
      return maKPIData.kpi1.quarterlyData.map((entry) => ({
        name: entry.quarter,
        onTime: entry.value.percentage ?? 0,
        volume: entry.value.denominator ?? 0,
        averageDays: entry.value.average ?? entry.value.median ?? 0,
        gap: Math.max(0, 100 - (entry.value.percentage ?? 0)),
        target: 90,
      }));
    }

    const bucketMap = new Map<
      string,
      { name: string; onTime: number; volume: number; totalDays: number; order: number }
    >();

    workingSet.forEach((app) => {
      const date = new Date(app.decisionDate ?? app.submissionDate ?? "");
      if (Number.isNaN(date.getTime())) return;
      const key = getBucketKey(date);
      const startMonth =
        period === "Monthly"
          ? date.getMonth()
          : period === "Annually"
          ? 0
          : Math.floor(date.getMonth() / 3) * 3;
      const order = new Date(date.getFullYear(), startMonth, 1).getTime();

      if (!bucketMap.has(key)) {
        bucketMap.set(key, { name: key, onTime: 0, volume: 0, totalDays: 0, order });
      }

      const bucket = bucketMap.get(key)!;
      bucket.volume += 1;
      bucket.totalDays += app.processingDays;
      if (app.onTime) bucket.onTime += 1;
    });

    return Array.from(bucketMap.values())
      .sort((a, b) => a.order - b.order)
      .map((bucket) => ({
        name: bucket.name,
        onTime: bucket.volume ? (bucket.onTime / bucket.volume) * 100 : 0,
        gap: bucket.volume ? Math.max(0, 100 - (bucket.onTime / bucket.volume) * 100) : 0,
        volume: bucket.volume,
        averageDays: bucket.volume ? bucket.totalDays / bucket.volume : 0,
        target: 90,
      }));
  }, [workingSet, period, getBucketKey]);

  const histogramData = useMemo((): HistogramDataPoint[] => {
    const bins = [0, 90, 120, 150, 180, 210, 240, 270];
    const counts = bins.slice(0, -1).map((start, index) => {
      const end = bins[index + 1];
      const count = workingSet.filter(
        (app) => app.processingDays >= start && app.processingDays < end
      ).length;
      return { range: `${start}-${end - 1} days`, count };
    });
    const tail = workingSet.filter((app) => app.processingDays >= bins[bins.length - 1]).length;
    counts.push({ range: `${bins[bins.length - 1]}+ days`, count: tail });
    return counts;
  }, [workingSet]);

  const scatterData = useMemo((): ScatterDataPoint[] => {
    return workingSet.slice(0, 24).map((app) => ({
      name: app.brandName,
      processingDays: app.processingDays,
      targetDays: app.targetDays,
      onTime: app.onTime,
      status: app.status,
    }));
  }, [workingSet]);

  const boxStats = useMemo((): BoxStats | null => {
    if (!workingSet.length) return null;
    const days = [...workingSet.map((app) => app.processingDays)].sort((a, b) => a - b);
    const percentile = (p: number) => {
      const index = (days.length - 1) * p;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return days[lower];
      return days[lower] + (days[upper] - days[lower]) * (index - lower);
    };

    return {
      min: days[0],
      max: days[days.length - 1],
      q1: percentile(0.25),
      median: percentile(0.5),
      q3: percentile(0.75),
    };
  }, [workingSet]);

  const boxData = boxStats
    ? [
        {
          name: "Processing days",
          ...boxStats,
        },
      ]
    : [];

  const metrics = useMemo(() => {
    const onTimeCount = workingSet.filter((app) => app.onTime).length;
    const volume = workingSet.length || (maKPIData.kpi1.currentQuarter.denominator ?? 0);
    const onTimeRate =
      volume > 0
        ? (onTimeCount / volume) * 100
        : maKPIData.kpi1.currentQuarter.percentage ?? 0;
    const averageProcessing =
      workingSet.reduce((sum, app) => sum + app.processingDays, 0) / (workingSet.length || 1) || 0;
    const medianProcessing = boxStats?.median ?? 0;

    return {
      onTimeRate,
      volume,
      onTimeCount,
      averageProcessing,
      medianProcessing,
    };
  }, [workingSet, boxStats]);

  return {
    timeSeries,
    histogramData,
    scatterData,
    boxStats,
    boxData,
    metrics,
  };
}
