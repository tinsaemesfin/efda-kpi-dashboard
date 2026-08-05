import { describe, expect, it } from "vitest";
import { normalizeCTFaceReport } from "@/lib/ct-api/normalizer";
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
});

describe("mergeCTCardsWithStrictFaceData", () => {
  it("applies live rows to KPI 1–2 and keeps sample for 3–8", () => {
    const merged = mergeCTCardsWithStrictFaceData(ctKpiSeed.cards, {
      "CT-KPI-1": { numerator: 8, denominator: 10, percentage: 80, targetDays: 90 },
      "CT-KPI-2": { numerator: 9, denominator: 10, percentage: 90, targetDays: 60 },
    });
    expect(merged[0]?.value).toBe(80);
    expect(merged[0]?.faceDataMissing).toBe(false);
    expect(merged[1]?.value).toBe(90);
    expect(merged[2]?.value).toBe(ctKpiSeed.cards[2]?.value);
    expect(merged[2]?.faceDataMissing).toBeUndefined();
  });

  it("marks missing live KPI as empty without seed fallback", () => {
    const merged = mergeCTCardsWithStrictFaceData(ctKpiSeed.cards, {});
    expect(merged[0]?.faceDataMissing).toBe(true);
    expect(merged[0]?.value).toBe(0);
    expect(merged[1]?.faceDataMissing).toBe(true);
  });
});
