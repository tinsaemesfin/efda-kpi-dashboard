import { describe, expect, it } from "vitest";
import { buildMAKpi6DrilldownData, buildMAKpi7DrilldownData } from "@/lib/ma-api/time-drilldown";
import type { MAApiAverageDrilldownRow, MAApiMedianDrilldownRow } from "@/types/ma-api";

const averageSampleRows: MAApiAverageDrilldownRow[] = [
  {
    category_name: "Application type",
    category_value: "New Application - Generic without Bio-equivalency",
    module_code: "NMR",
    target_days: 270,
    on_time_count: 1127,
    total_count: 1533,
    percentage: 73.52,
    avg_decision_days: 238.3,
    overall_avg_days: 143.5,
    gap_vs_overall_avg_days: 94.8,
    max_decision_days: 2536.8,
    extreme_outlier_count: 201,
    extreme_outlier_pct: 13.11,
  },
  {
    category_name: "Decision time band",
    category_value: "Over 540 days",
    module_code: "NMR",
    target_days: 270,
    on_time_count: 0,
    total_count: 261,
    percentage: 0,
    avg_decision_days: 989.17,
    overall_avg_days: 143.5,
    gap_vs_overall_avg_days: 845.67,
    max_decision_days: 2536.8,
    extreme_outlier_count: 261,
    extreme_outlier_pct: 100,
  },
  {
    category_name: "MA type",
    category_value: "NGWOB",
    module_code: "NMR",
    target_days: 270,
    on_time_count: 1127,
    total_count: 1533,
    percentage: 73.52,
    avg_decision_days: 238.3,
    overall_avg_days: 143.5,
    gap_vs_overall_avg_days: 94.8,
    max_decision_days: 2536.8,
    extreme_outlier_count: 201,
    extreme_outlier_pct: 13.11,
  },
];

const medianSampleRows: MAApiMedianDrilldownRow[] = [
  {
    category_name: "Application type",
    category_value: "New Application - Generic Drug",
    module_code: "NMR",
    target_days: 270,
    on_time_count: 927,
    total_count: 942,
    percentage: 98.41,
    median_decision_days: 26.02,
    overall_median_days: 34.68,
    p25_days: 12,
    p75_days: 40,
    p90_days: 80,
    iqr_days: 28,
    mean_median_skew_days: 5.2,
  },
  {
    category_name: "MA type",
    category_value: "GNRUG",
    module_code: "NMR",
    target_days: 270,
    on_time_count: 927,
    total_count: 942,
    percentage: 98.41,
    median_decision_days: 26.02,
    overall_median_days: 34.68,
    p25_days: 12,
    p75_days: 40,
    p90_days: 80,
    iqr_days: 28,
    mean_median_skew_days: 5.2,
  },
];

describe("buildMAKpi7DrilldownData", () => {
  it("groups average drilldown rows and excludes MA type duplicates", () => {
    const result = buildMAKpi7DrilldownData(averageSampleRows);

    expect(result.kpiId).toBe("MA-KPI-7");
    expect(result.metricType).toBe("average");
    expect(result.categoryViews.map((view) => view.label)).toEqual([
      "Application type",
      "Decision time band",
    ]);

    const appType = result.categoryViews.find((view) => view.label === "Application type");
    expect(appType?.items[0]).toMatchObject({
      category: "Generic without Bio-equivalency",
      decisionDays: 238.3,
      maxDecisionDays: 2536.8,
      extremeOutlierCount: 201,
      extremeOutlierPct: 13.11,
    });

    const band = result.categoryViews.find((view) => view.label === "Decision time band");
    expect(band?.items.map((item) => item.category)).toEqual(["Over 540 days"]);
  });

  it("does not surface overall_avg_days or gap_vs_overall_avg_days in items", () => {
    const result = buildMAKpi7DrilldownData(averageSampleRows);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("overall_avg_days");
    expect(serialized).not.toContain("gap_vs_overall_avg_days");
    expect(serialized).not.toContain("overallAvgDays");
    expect(serialized).not.toContain("gapVsOverallAvgDays");
  });
});

describe("buildMAKpi6DrilldownData", () => {
  it("groups median drilldown rows and excludes MA type duplicates", () => {
    const result = buildMAKpi6DrilldownData(medianSampleRows);

    expect(result.kpiId).toBe("MA-KPI-6");
    expect(result.metricType).toBe("median");
    expect(result.categoryViews).toHaveLength(1);
    expect(result.categoryViews[0].label).toBe("Application type");
    expect(result.categoryViews[0].items[0]).toMatchObject({
      category: "Generic Drug",
      decisionDays: 26.02,
      p25Days: 12,
      p75Days: 40,
      p90Days: 80,
      iqrDays: 28,
      meanMedianSkewDays: 5.2,
    });
  });

  it("does not surface overall_median_days in items", () => {
    const result = buildMAKpi6DrilldownData(medianSampleRows);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("overall_median_days");
    expect(serialized).not.toContain("overallMedianDays");
  });
});
