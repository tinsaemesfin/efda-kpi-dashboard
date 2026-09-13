import { describe, expect, it } from "vitest";
import { combineTimeDistributions, timeComparison, timeDistribution } from "./distribution";
import { buildMAKpi6DrilldownData, buildMAKpi7DrilldownData } from "./time-drilldown";
import type { MATimeDrillDownItem } from "@/types/ma-drilldown";

const item: MATimeDrillDownItem = { category: "Regular", targetDays: 270, onTimeCount: 5, totalCount: 10, percentage: 50, decisionDays: 20, p25Days: 10, p75Days: 30, meanMedianSkewDays: 5 };
describe("reported processing-time distributions", () => {
  it("supplies average box plots from the matching legacy median report and preserves headlines", () => {
    const cohort = { category_name: "Application type", category_value: "Regular", module_code: "NMR", target_days: 270, on_time_count: 5, total_count: 10, percentage: 50 };
    const median = buildMAKpi6DrilldownData([{ ...cohort, median_decision_days: 20, p25_days: 10, p75_days: 30 }]);
    const average = buildMAKpi7DrilldownData([{ ...cohort, avg_decision_days: 25, max_decision_days: 90 }]);
    for (const [primary, companion] of [[median, average], [average, median]]) {
      const merged = combineTimeDistributions(primary, companion);
      expect(merged.currentValue).toEqual(primary.currentValue);
      expect(timeDistribution(merged.categoryViews[0].items[0], merged.metricType)).toEqual({ q1: 10, median: 20, q3: 30, mean: 25, min: null, max: 90 });
    }
    const changed = buildMAKpi6DrilldownData([{ ...cohort, total_count: 11, median_decision_days: 20, p25_days: 10, p75_days: 30 }]);
    expect(timeDistribution(combineTimeDistributions(average, changed).categoryViews[0].items[0], "average")).toBeNull();
    expect(average.categoryViews[0].items[0].p25Days).toBeUndefined();
  });
  it("compares reported means and medians even without quartiles", () => {
    expect(timeComparison({ ...item, p25Days: null, p75Days: null }, "median")).toEqual({ median: 20, mean: 25 });
    expect(timeComparison({ ...item, medianDays: 15 }, "average")).toEqual({ median: 15, mean: 20 });
    expect(timeComparison(item, "average")).toBeNull();
    expect(timeComparison({ ...item, meanDays: Infinity }, "median")).toBeNull();
    expect(timeComparison({ ...item, decisionDays: 0, meanMedianSkewDays: 0 }, "median")).toEqual({ median: 0, mean: 0 });
  });
  it("preserves the mean, median and quartiles without inventing whiskers", () => {
    expect(timeDistribution(item, "median")).toEqual({ q1: 10, median: 20, q3: 30, mean: 25, min: null, max: null });
  });
  it("does not turn an average into a median or missing quartiles into zero", () => {
    expect(timeDistribution(item, "average")).toBeNull();
    expect(timeDistribution({ ...item, p25Days: null }, "median")).toBeNull();
    expect(timeDistribution({ ...item, p25Days: 25 }, "median")).toBeNull();
  });
  it("handles single-valued and zero-day cohorts", () => {
    expect(timeDistribution({ ...item, decisionDays: 0, p25Days: 0, p75Days: 0, minDecisionDays: 0, maxDecisionDays: 0, meanMedianSkewDays: 0 }, "median")).toEqual({ q1: 0, median: 0, q3: 0, mean: 0, min: 0, max: 0 });
  });
  it("carries exact SQL summaries through both normalizers", () => {
    const row = { category_name: "Application type", category_value: "Regular", module_code: "NMR", on_time_count: 5, total_count: 10, percentage: 50, median_decision_days: 20, avg_decision_days: 25, distribution_min_days: 0, distribution_q1_days: 10, distribution_median_days: 20, distribution_q3_days: 30, distribution_max_days: 90, distribution_mean_days: 25 };
    for (const build of [buildMAKpi6DrilldownData, buildMAKpi7DrilldownData]) {
      const result = build([row]);
      expect(timeDistribution(result.categoryViews[0].items[0], result.metricType)).toEqual({ min: 0, q1: 10, median: 20, q3: 30, max: 90, mean: 25 });
    }
  });
});
