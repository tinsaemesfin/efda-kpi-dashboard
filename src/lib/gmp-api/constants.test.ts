import { describe, expect, it } from "vitest";
import { GMP_DRILLDOWN_REPORTS, GMP_FACE_REPORTS } from "@/lib/gmp-api/constants";

describe("GMP report catalogue", () => {
  it("maps front and drilldown reports to the updated workbook", () => {
    expect(GMP_FACE_REPORTS).toEqual({
      "GMP-KPI-1": [121, 122, 151, 123], "GMP-KPI-2": [],
      "GMP-KPI-3": [124, 125], "GMP-KPI-4": [126], "GMP-KPI-5": [129],
      "GMP-KPI-6": [131, 133, 136], "GMP-KPI-7": [139, 141],
      "GMP-KPI-8": [143, 145], "GMP-KPI-9": [147, 148],
    });
    expect(GMP_DRILLDOWN_REPORTS).toEqual({
      "GMP-KPI-1": [152, 153], "GMP-KPI-2": [], "GMP-KPI-3": [154],
      "GMP-KPI-4": [127, 128], "GMP-KPI-5": [130], "GMP-KPI-6": [132, 134, 137],
      "GMP-KPI-7": [140, 142], "GMP-KPI-8": [144, 146], "GMP-KPI-9": [149, 150],
    });
  });

  it("wires every existing report from 121 through 154 without inventing missing IDs", () => {
    const wired = new Set([
      ...Object.values(GMP_FACE_REPORTS).flat(),
      ...Object.values(GMP_DRILLDOWN_REPORTS).flat(),
    ]);
    const expected = Array.from({ length: 34 }, (_, index) => index + 121).filter(
      (id) => id !== 135 && id !== 138
    );

    expect([...wired].sort((a, b) => a - b)).toEqual(expected);
  });
});
