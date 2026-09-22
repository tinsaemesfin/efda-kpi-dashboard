import { describe, expect, it } from "vitest";
import { CHART_TYPES, chartUnavailableReason } from "./chart-types";

describe("chart compatibility", () => {
  const counts = [{ name: "A", value: 2 }, { name: "B", value: 3 }, { name: "C", value: 5 }];

  it("supports at least seven styles without changing the source values", () => {
    const snapshot = structuredClone(counts);
    expect(CHART_TYPES.length).toBeGreaterThanOrEqual(7);
    for (const { id } of CHART_TYPES) expect(chartUnavailableReason(id, counts, { ordered: true, additive: true })).toBeUndefined();
    expect(counts).toEqual(snapshot);
  });

  it("does not represent rates or durations as parts of a whole", () => {
    for (const id of ["pie", "doughnut"] as const) {
      expect(chartUnavailableReason(id, counts)).toContain("parts of a whole");
      expect(chartUnavailableReason(id, counts, { additive: true })).toBeUndefined();
    }
  });

  it("does not connect unordered categories or a single point", () => {
    for (const id of ["line", "area"] as const) {
      expect(chartUnavailableReason(id, counts)).toContain("ordered");
      expect(chartUnavailableReason(id, counts.slice(0, 1), { ordered: true })).toContain("two");
    }
    expect(chartUnavailableReason("radar", counts.slice(0, 2))).toContain("three");
  });

  it("distinguishes reported zero from missing or non-finite values", () => {
    expect(chartUnavailableReason("bar", [{ name: "Zero", value: 0 }])).toBeUndefined();
    for (const value of [null, undefined, NaN, Infinity]) {
      for (const { id } of CHART_TYPES) expect(chartUnavailableReason(id, [{ name: "Missing", value }])).toContain("No numeric data");
    }
    expect(chartUnavailableReason("pie", [{ name: "Zero", value: 0 }], { additive: true })).toContain("greater than zero");
  });

  it("rejects incomplete and negative compositions", () => {
    expect(chartUnavailableReason("pie", [...counts, { name: "Missing", value: null }], { additive: true })).toContain("every category");
    expect(chartUnavailableReason("doughnut", [{ name: "Negative", value: -1 }], { additive: true })).toContain("non-negative");
  });
});
