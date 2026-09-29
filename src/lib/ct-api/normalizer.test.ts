import { describe, expect, it } from "vitest";
import { normalizeCTFaceReport, normalizeCTTurnaroundReport } from "@/lib/ct-api/normalizer";
import { mergeCTCardsWithStrictFaceData } from "@/lib/ct-api/merge";
import { ctKpiSeed } from "@/data/ct-kpi-seed";
import type { CTApiDataRow } from "@/types/ct-api";

describe("normalizeCTFaceReport", () => {
  it("maps CTNAPP rows to CT-KPI-1", () => {
    const rows: CTApiDataRow[] = [
      {
        submodule_code: "CTNAPP",
        target_days: 90,
        on_time_count: 10,
        total_count: 12,
        percentage: 83.33,
      },
    ];
    const result = normalizeCTFaceReport(rows, "CT-KPI-1");
    expect(result.kpiFaceDataById["CT-KPI-1"]).toEqual({
      kind: "ratio",
      numerator: 10,
      denominator: 12,
      percentage: (10 / 12) * 100,
      targetDays: 90,
    });
    expect(result.totals.acceptedRows).toBe(1);
  });

  it("rejects wrong submodule for CT-KPI-2", () => {
    const rows: CTApiDataRow[] = [
      {
        submodule_code: "CTNAPP",
        target_days: 60,
        on_time_count: 5,
        total_count: 5,
        percentage: 100,
      },
    ];
    const result = normalizeCTFaceReport(rows, "CT-KPI-2");
    expect(result.kpiFaceDataById["CT-KPI-2"]).toBeUndefined();
    expect(result.totals.acceptedRows).toBe(0);
  });

  it("sums SAE and NSAE and drops a single target when they differ", () => {
    const rows: CTApiDataRow[] = [
      { submodule_code: "CTSR", report_type: "NSAE", target_days: 30, on_time_count: "1", total_count: "5", percentage: "20" },
      { submodule_code: "CTSR", report_type: "SAE", target_days: 15, on_time_count: "0", total_count: "5", percentage: "0" },
    ];
    const result = normalizeCTFaceReport(rows, "CT-KPI-4");
    expect(result.kpiFaceDataById["CT-KPI-4"]).toEqual({
      kind: "ratio",
      numerator: 1,
      denominator: 10,
      percentage: 10,
      targetDays: undefined,
    });
  });
});

describe("normalizeCTTurnaroundReport", () => {
  it("uses total days divided by the application count", () => {
    const rows: CTApiDataRow[] = [
      { submodule_code: "CTNAPP", target_days: 58, total_count: "10", total_days: "400", average_days: "40" },
      { submodule_code: "CTNAPP", target_days: 58, total_count: "10", total_days: "800", average_days: "80" },
    ];
    const result = normalizeCTTurnaroundReport(rows);
    expect(result.kpiFaceDataById["CT-KPI-8"]?.averageDays).toBe(60);
    expect(result.kpiFaceDataById["CT-KPI-8"]?.denominator).toBe(20);
    expect(result.kpiFaceDataById["CT-KPI-8"]?.targetDays).toBe(58);
  });
});

describe("mergeCTCardsWithStrictFaceData", () => {
  it("applies live rows and leaves the registry card not applicable", () => {
    const merged = mergeCTCardsWithStrictFaceData(ctKpiSeed.cards, {
      "CT-KPI-1": { kind: "ratio", numerator: 8, denominator: 10, percentage: 80, targetDays: 90 },
      "CT-KPI-2": { kind: "ratio", numerator: 9, denominator: 10, percentage: 90, targetDays: 60 },
      "CT-KPI-8": { kind: "turnaround", numerator: 580, denominator: 10, percentage: 58, averageDays: 58, targetDays: 58 },
    });
    expect(merged[0]?.value).toBe(80);
    expect(merged[0]?.faceDataMissing).toBe(false);
    expect(merged[0]?.targetDays).toBe(90);
    expect(merged[1]?.value).toBe(90);
    expect(merged.find((card) => card.drilldownId === "CT-KPI-3")?.faceDataMissing).toBe(true);
    expect(merged.find((card) => card.drilldownId === "CT-KPI-8")?.value).toBe(58);
    expect(merged.find((card) => card.drilldownId === "CT-KPI-8")?.suffix).toBe(" days");
    const registry = merged.find((card) => card.drilldownId === "CT-KPI-6");
    expect(registry?.notApplicableReason).toMatch(/not recorded/);
    expect(registry?.value).toBe(0);
  });

  it("marks missing live KPI as empty without seed fallback", () => {
    const merged = mergeCTCardsWithStrictFaceData(ctKpiSeed.cards, {});
    expect(merged[0]?.faceDataMissing).toBe(true);
    expect(merged[0]?.value).toBe(0);
    expect(merged[1]?.faceDataMissing).toBe(true);
  });
});
