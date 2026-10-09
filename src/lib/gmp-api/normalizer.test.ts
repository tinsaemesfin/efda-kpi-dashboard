import { describe, expect, it } from "vitest";
import { normalizeGMPFaceMetric, normalizeGMPOverview } from "@/lib/gmp-api/normalizer";
import type { GMPReportResult } from "@/types/gmp-api";

const report = (reportId: number, label: string, rows: GMPReportResult["rows"]): GMPReportResult => ({ reportId, label, rows });

describe("normalizeGMPFaceMetric", () => {
  it("keeps local and abroad face reports as separate card results", () => {
    const metric = normalizeGMPFaceMetric("GMP-KPI-1", [
      report(121, "Inspected · Local", [{ category_name: "Overall", numerator: "1", denominator: "10", percentage: "10" }]),
      report(122, "Inspected · Abroad", [{ category_name: "Overall", numerator: "1", denominator: "15", percentage: "6.67" }]),
    ]);

    expect(metric.state).toBe("live");
    expect(metric.value).toBeUndefined();
    expect(metric.segments).toMatchObject([
      { label: "Inspected · Local", value: 10, numerator: 1, denominator: 10 },
      { label: "Inspected · Abroad", value: 6.67, numerator: 1, denominator: 15 },
    ]);
  });

  it("shows the database percentage even when it exceeds 100", () => {
    const metric = normalizeGMPFaceMetric("GMP-KPI-3", [
      report(124, "Foreign inspection waivers", [{ category_name: "Overall", numerator: "71", denominator: "22", percentage: "322.73" }]),
    ]);

    expect(metric).toMatchObject({ state: "live", value: 322.73, numerator: 71, denominator: 22 });
  });

  it("marks a KPI with no database face report as work in progress", () => {
    const metric = normalizeGMPFaceMetric("GMP-KPI-2", []);
    expect(metric).toMatchObject({ state: "work-in-progress", reports: [], segments: [] });
  });

  it("keeps local and abroad turnaround results separate", () => {
    const metric = normalizeGMPFaceMetric("GMP-KPI-7", [
      report(139, "Local average turnaround", [{ category_name: "Overall", completed_count: "2", average_days: "15" }]),
      report(141, "Foreign average turnaround", [{ category_name: "Overall", completed_count: "1", average_days: "30" }]),
    ]);
    expect(metric.segments.map((segment) => segment.value)).toEqual([15, 30]);
  });

  it("shows each stage row from a face report side by side", () => {
    const metric = normalizeGMPFaceMetric("GMP-KPI-1", [
      report(151, "Stage timeline · Local", [
        { category_name: "Stage", category_value: "Screening", percentage: "20", on_time_count: "2", total_count: "10" },
        { category_name: "Stage", category_value: "Inspection", percentage: "50", on_time_count: "5", total_count: "10" },
      ]),
    ]);
    expect(metric.segments).toHaveLength(2);
    expect(metric.segments.map((segment) => segment.label)).toEqual([
      "Stage timeline · Local · Screening",
      "Stage timeline · Local · Inspection",
    ]);
  });
});

 it("uses separate local and abroad compliance face reports", () => {
   const metric = normalizeGMPFaceMetric("GMP-KPI-4", [
     report(126, "Compliant Local", [{ category_name: "Overall", numerator: 2, denominator: 3, percentage: 66.67 }]),
     report(211, "Compliant Abroad", [{ category_name: "Overall", numerator: 16, denominator: 21, percentage: 76.19 }]),
   ]);
   expect(metric.segments.map(s => s.value)).toEqual([66.67, 76.19]);
   expect(metric.value).toBeUndefined();
 });
 it("displays stage processing days without converting them to percentages", () => {
   const metric = normalizeGMPFaceMetric("GMP-KPI-1", [report(151, "Local stages", [
     { category_name: "Stage", category_value: "Screening", avg_actual_days: 12, percentage: 80 },
   ])]);
   expect(metric.segments[0]).toMatchObject({ value: 12, unit: "days" });
 });

describe("normalizeGMPOverview", () => {
  const count = (reportId: number, value: string | number) =>
    report(reportId, `Report ${reportId}`, [{ category_name: "Overall", total_count: value, numerator: value }]);

  it("groups all-time counts by scope and sums live values", () => {
    const groups = normalizeGMPOverview([
      count(218, "12"), count(219, 30), count(220, "8"),
      count(224, 5), { reportId: 225, label: "Assigned · Abroad", rows: [], error: "HTTP 500" },
      count(237, 0), count(238, 4),
    ]);

    expect(groups.map((group) => group.id)).toEqual(["approved", "assigned", "capa"]);
    expect(groups[0]).toMatchObject({
      title: "Approved GMP",
      total: 50,
      items: [{ scope: "Local", value: 12 }, { scope: "Abroad", value: 30 }, { scope: "Waiver", value: 8 }],
    });
    expect(groups[1].total).toBe(5);
    expect(groups[1].items[1]).toMatchObject({ scope: "Abroad", error: "HTTP 500" });
    expect(groups[1].items[1].value).toBeUndefined();
    expect(groups[2]).toMatchObject({ total: 4, items: [{ value: 0 }, { value: 4 }] });
  });

  it("leaves the total empty when no report in a group has data", () => {
    const [approved] = normalizeGMPOverview([]);
    expect(approved.total).toBeUndefined();
    expect(approved.items.every((item) => item.value === undefined)).toBe(true);
  });
});
