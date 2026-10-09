import { describe, expect, it } from "vitest";
import { buildCTExplorer } from "@/lib/ct-api/drilldown-views";
import type { CTDrilldownRow } from "@/types/ct-api";

const applications: CTDrilldownRow[] = [
  { application_number: "A", received_date: "2026-01-15", regulatory_days: "40", target_days: 90, result: "On time" },
  { application_number: "B", received_date: "2026-01-20", regulatory_days: 120, target_days: 90, result: "Late" },
  { application_number: "C", received_date: "2026-03-02", regulatory_days: 10, target_days: 90, result: "On time" },
];

describe("buildCTExplorer", () => {
  it("builds month, quarter, time-band, and result charts for a timeline rate", () => {
    const model = buildCTExplorer("CT-KPI-1", applications);
    expect(model.kind).toBe("rate");
    expect(model.data.currentValue.percentage).toBeCloseTo((2 / 3) * 100);
    expect(model.data.currentValue.numerator).toBe(2);
    expect(model.data.currentValue.denominator).toBe(3);
    expect(model.targetText).toBe("90% · 90 days");

    const labels = model.data.dimensionViews?.map((view) => view.label);
    expect(labels).toEqual(["By month", "By quarter", "Processing time band", "Result mix"]);
    expect(model.chartByViewId.result_mix).toBe("volume");
    expect(model.chartByViewId.by_month).toBeUndefined();

    const months = model.data.dimensionViews?.find((view) => view.id === "by_month");
    expect(months?.data.map((item) => item.category)).toEqual(["Jan 2026", "Mar 2026"]);
    expect(months?.data[0]).toMatchObject({ count: 1, total: 2 });
    expect(months?.data[1]).toMatchObject({ count: 1, total: 1, percentage: 100 });

    const mix = model.data.dimensionViews?.find((view) => view.id === "result_mix");
    expect(mix?.data.map((item) => [item.category, item.total])).toEqual([["On time", 2], ["Late", 1]]);
  });

  it("averages days and charts status separately from the time band", () => {
    const rows: CTDrilldownRow[] = [
      { status: "APR", decision_date: "2026-02-01", regulatory_days: 40 },
      { status: "APR", decision_date: "2026-02-10", regulatory_days: 80 },
      { status: "REJ", decision_date: "2026-05-01", regulatory_days: 20 },
    ];
    const model = buildCTExplorer("CT-KPI-8", rows);
    expect(model.kind).toBe("days");
    expect(model.data.currentValue.average).toBeCloseTo(140 / 3);
    expect(model.targetText).toBe("58 days");
    expect(model.chartByViewId.status).toBe("days");
    expect(model.chartByViewId.processing_time_band).toBe("volume");

    const status = model.data.dimensionViews?.find((view) => view.id === "status");
    expect(status?.data.find((item) => item.category === "APR")?.value).toBeCloseTo(60);
    expect(status?.data.find((item) => item.category === "REJ")?.value).toBe(20);
    expect(status?.data[0]?.targetDays).toBe(58);
  });

  it("keeps each safety report type on its own day target", () => {
    const rows: CTDrilldownRow[] = [
      { report_type: "SAE", received_date: "2026-04-01", assessment_days: 10, target_days: 15, result: "On time" },
      { report_type: "NSAE", received_date: "2026-04-02", assessment_days: 40, target_days: 30, result: "Late" },
      { report_type: "NSAE", received_date: "2026-04-03", assessment_days: null, target_days: 30, result: "Pending" },
    ];
    const model = buildCTExplorer("CT-KPI-4", rows);
    expect(model.data.currentValue).toMatchObject({ numerator: 1, denominator: 3 });
    expect(model.targetText).toBe("90% · mixed SLAs");
    const types = model.data.dimensionViews?.find((view) => view.id === "report_type");
    expect(types?.data.find((item) => item.category === "SAE")).toMatchObject({ count: 1, total: 1, targetDays: 15 });
    expect(types?.data.find((item) => item.category === "NSAE")).toMatchObject({ count: 0, total: 2, targetDays: 30 });
  });

  it("counts distinct trials for regulatory measures", () => {
    const rows: CTDrilldownRow[] = [
      { application_number: "T1", outcome_family: "Inspection", outcome_code: "GCPRST", outcome_date: "2026-06-01", result: "Measure" },
      { application_number: "T1", outcome_family: "Safety", outcome_code: "SRAPP", outcome_date: "2026-06-02", result: "Other outcome" },
      { application_number: "T2", outcome_family: "CAPA", outcome_code: "GCPAPP", outcome_date: "2026-07-01", result: "Other outcome" },
    ];
    const model = buildCTExplorer("CT-KPI-10", rows);
    expect(model.data.currentValue).toMatchObject({ numerator: 1, denominator: 2 });
    expect(model.data.currentValue.percentage).toBe(50);
    const families = model.data.dimensionViews?.find((view) => view.id === "outcome_type");
    expect(families?.data.find((item) => item.category === "Inspection")).toMatchObject({ count: 1, total: 1 });
    expect(model.chartByViewId.outcome).toBe("volume");
  });

  it("returns an empty explorer when the period has no rows", () => {
    const model = buildCTExplorer("CT-KPI-3", []);
    expect(model.kind).toBe("count");
    expect(model.data.dimensionViews).toEqual([]);
    expect(model.data.currentValue).toMatchObject({ numerator: 0, denominator: 0 });
  });
});
