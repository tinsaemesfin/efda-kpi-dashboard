import type { MATimeDrillDownData, MATimeDrillDownItem } from "@/types/ma-drilldown";

/** Join the paired reports fetched with identical product/date filters. */
export function combineTimeDistributions(primary: MATimeDrillDownData, companion: MATimeDrillDownData): MATimeDrillDownData {
  if (primary.metricType === companion.metricType) return primary;
  return { ...primary, categoryViews: primary.categoryViews.map(view => {
    const otherView = companion.categoryViews.find(other => other.label === view.label);
    return { ...view, items: view.items.map(item => {
      const matches = otherView?.items.filter(other => other.category === item.category &&
        other.targetDays === item.targetDays && other.totalCount === item.totalCount &&
        other.onTimeCount === item.onTimeCount) ?? [];
      if (matches.length !== 1) return item;
      const other = matches[0];
      const median = primary.metricType === "median" ? item : other;
      const average = primary.metricType === "average" ? item : other;
      return { ...item,
        medianDays: item.medianDays ?? median.medianDays ?? median.decisionDays,
        meanDays: item.meanDays ?? average.meanDays ?? average.decisionDays,
        p25Days: item.p25Days ?? median.p25Days,
        p75Days: item.p75Days ?? median.p75Days,
        minDecisionDays: item.minDecisionDays ?? other.minDecisionDays,
        maxDecisionDays: item.maxDecisionDays ?? other.maxDecisionDays,
      };
    }) };
  }) };
}

export interface TimeDistribution {
  q1: number;
  median: number;
  q3: number;
  mean: number | null;
  min: number | null;
  max: number | null;
}
const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** A mean/median comparison does not require quartiles. */
export function timeComparison(item: MATimeDrillDownItem, metric: "median" | "average") {
  const median = item.medianDays ?? (metric === "median" ? item.decisionDays : null);
  const mean = item.meanDays ?? (metric === "average" ? item.decisionDays :
    valid(median) && item.meanMedianSkewDays != null ? median + item.meanMedianSkewDays : null);
  return valid(median) && valid(mean) ? { median, mean } : null;
}

/** Use reported quantiles only. Never estimate a distribution from category averages. */
export function timeDistribution(item: MATimeDrillDownItem, metric: "median" | "average"): TimeDistribution | null {
  const median = item.medianDays ?? (metric === "median" ? item.decisionDays : null);
  const q1 = item.p25Days;
  const q3 = item.p75Days;
  if (!valid(q1) || !valid(median) || !valid(q3) || q1 > median || median > q3) return null;
  const mean = item.meanDays ?? (metric === "average" ? item.decisionDays :
    item.meanMedianSkewDays != null ? median + item.meanMedianSkewDays : null);
  const min = item.minDecisionDays;
  const max = item.maxDecisionDays;
  return { q1, median, q3, mean: valid(mean) ? mean : null,
    min: valid(min) && min <= q1 ? min : null,
    max: valid(max) && max >= q3 ? max : null };
}
