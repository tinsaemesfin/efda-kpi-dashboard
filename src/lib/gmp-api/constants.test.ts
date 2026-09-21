import { describe, expect, it } from "vitest";
import { GMP_DRILLDOWN_REPORTS, GMP_FACE_REPORTS, GMP_REPORT_CHAINS } from "@/lib/gmp-api/constants";

describe("GMP report catalogue", () => {
  it("maps front and drilldown reports to the updated workbook", () => {
    expect(GMP_FACE_REPORTS).toEqual({
      "GMP-KPI-1": [121, 122], "GMP-KPI-2": [],
      "GMP-KPI-3": [124], "GMP-KPI-4": [126, 211], "GMP-KPI-5": [129],
      "GMP-KPI-6": [131, 133, 136], "GMP-KPI-7": [139, 141],
      "GMP-KPI-8": [143, 145], "GMP-KPI-9": [147, 148],
    });
    expect(GMP_DRILLDOWN_REPORTS).toEqual({
      "GMP-KPI-1": [135, 152, 151, 205, 153, 123], "GMP-KPI-2": [], "GMP-KPI-3": [208, 154, 125],
      "GMP-KPI-4": [127, 128], "GMP-KPI-5": [130], "GMP-KPI-6": [132, 134, 137],
      "GMP-KPI-7": [140, 142], "GMP-KPI-8": [144, 146], "GMP-KPI-9": [149, 150],
    });
  });

  it("wires the supplied face, breakdown, and detail report catalogue", () => {
    const wired = new Set([
      ...Object.values(GMP_FACE_REPORTS).flat(),
      ...Object.values(GMP_DRILLDOWN_REPORTS).flat(),
      ...GMP_REPORT_CHAINS.map(chain => chain.detail),
    ]);
    const expected = [
      ...Array.from({ length: 34 }, (_, index) => index + 121),
      ...Array.from({ length: 12 }, (_, index) => index + 204),
    ];

    expect([...wired].sort((a, b) => a - b)).toEqual(expected);
  });

  it("preserves the agreed face to drilldown to detail chains", () => {
    expect(GMP_REPORT_CHAINS).toEqual([
      { face: 121, drilldown: 135, detail: 138, location: "Local" },
      { face: 121, drilldown: 152, detail: 206, location: "Local" },
      { face: 122, drilldown: 205, detail: 204, location: "Abroad" },
      { face: 122, drilldown: 153, detail: 207, location: "Abroad" },
      { face: 124, drilldown: 208, detail: 209, location: "Abroad" },
      { face: 124, drilldown: 154, detail: 210, location: "Abroad" },
      { face: 126, drilldown: 127, detail: 212, location: "Local" },
      { face: 211, drilldown: 128, detail: 213, location: "Abroad" },
      { face: 139, drilldown: 140, detail: 214, location: "Local" },
      { face: 141, drilldown: 142, detail: 215, location: "Abroad" },
    ]);
  });
});
