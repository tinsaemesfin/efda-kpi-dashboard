import { describe, expect, it } from "vitest";
import { GMP_DRILLDOWN_REPORTS, GMP_FACE_REPORTS } from "@/lib/gmp-api/constants";

describe("GMP report catalogue", () => {
  it("maps reports strictly to the KPI number and role in the database title", () => {
    expect(GMP_FACE_REPORTS["GMP-KPI-2"]).toEqual([126, 127]);
    expect(GMP_DRILLDOWN_REPORTS["GMP-KPI-2"]).toEqual([128]);
    expect(GMP_FACE_REPORTS["GMP-KPI-4"]).toEqual([]);
    expect(GMP_DRILLDOWN_REPORTS["GMP-KPI-4"]).toEqual([]);
    expect(GMP_FACE_REPORTS["GMP-KPI-6"]).toEqual([123, 125, 131, 133, 136, 151]);
    expect(GMP_DRILLDOWN_REPORTS["GMP-KPI-6"]).toEqual([132, 134, 137, 152, 153, 154]);
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
