import { describe, expect, it } from "vitest";
import { normalizeMAMedicineMedianAverageFaceData } from "@/lib/ma-api/median-average-normalizer";

const sampleRows = [
  {
    module_code: "NMR" as const,
    submoduletype_code: "MDCN" as const,
    target_days: 270,
    metric: "Median Decision Time",
    total_count: 3869,
    decision_time_in_days: 34.68,
  },
  {
    module_code: "NMR" as const,
    submoduletype_code: "MDCN" as const,
    target_days: 270,
    metric: "Average Decision Time",
    total_count: 3869,
    decision_time_in_days: 143.5,
  },
];

describe("normalizeMAMedicineMedianAverageFaceData", () => {
  it("maps /26 median and average decision time rows", () => {
    const result = normalizeMAMedicineMedianAverageFaceData(sampleRows);

    expect(result.kpiTimeDataById["MA-KPI-6"]).toEqual({
      median: 34.68,
      numerator: 0,
      denominator: 3869,
    });
    expect(result.kpiTimeDataById["MA-KPI-7"]).toEqual({
      average: 143.5,
      numerator: 143.5 * 3869,
      denominator: 3869,
    });
    expect(result.totals.acceptedRows).toBe(2);
    expect(result.warnings).toHaveLength(0);
  });

  it("filters to MDCN and NMR when options are set", () => {
    const result = normalizeMAMedicineMedianAverageFaceData(
      [
        {
          module_code: "NMR",
          submoduletype_code: "FD",
          metric: "Median Decision Time",
          total_count: 100,
          decision_time_in_days: 99,
        },
        ...sampleRows,
      ],
      { submoduleFilter: "MDCN", moduleFilter: "NMR" }
    );

    expect(result.kpiTimeDataById["MA-KPI-6"]?.median).toBe(34.68);
    expect(result.totals.acceptedRows).toBe(2);
  });

  it("warns on unknown metric labels", () => {
    const result = normalizeMAMedicineMedianAverageFaceData([
      {
        module_code: "NMR",
        submoduletype_code: "MDCN",
        metric: "Unknown Metric",
        total_count: 10,
        decision_time_in_days: 5,
      },
    ]);

    expect(result.kpiTimeDataById["MA-KPI-6"]).toBeUndefined();
    expect(result.warnings.some((w) => w.code === "UNKNOWN_KPI_CODE")).toBe(true);
  });
});
