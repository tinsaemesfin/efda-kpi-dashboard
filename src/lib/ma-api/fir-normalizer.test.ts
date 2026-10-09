import { describe, expect, it } from "vitest";
import { normalizeMAFirFaceData } from "@/lib/ma-api/fir-normalizer";
import type { MAApiDataRow } from "@/types/ma-api";
import deployed from "../../../analysis/ma-fir-restoration-2026-10-01/deployment.json";

const screenshotRows: MAApiDataRow[] = [
  { module_code: "REN", submoduletype_code: "MD", target_days: 30, on_time_count: 991, total_count: 1053, percentage: 94.11 },
  { module_code: "REN", submoduletype_code: "MDCN", target_days: 30, on_time_count: 1767, total_count: 2298, percentage: 76.89 },
  { module_code: "VAR", submoduletype_code: "FD", target_days: 30, on_time_count: 92, total_count: 99, percentage: 92.93 },
  { module_code: "VAR", submoduletype_code: "MD", target_days: 30, on_time_count: 443, total_count: 498, percentage: 88.96 },
  { module_code: "VAR", submoduletype_code: "MDCN", target_days: 30, on_time_count: 1561, total_count: 2373, percentage: 65.78 },
  { module_code: "NMR", submoduletype_code: "CO", target_days: 30, on_time_count: 40, total_count: 50, percentage: 80 },
  { module_code: "VMIN", submoduletype_code: "MDCN", target_days: "30" as unknown as number, on_time_count: "10" as unknown as number, total_count: "40" as unknown as number, percentage: 25 },
];

describe("normalizeMAFirFaceData", () => {
  it("displays verified database totals for both restored FIR date cohorts", () => {
    const submission = normalizeMAFirFaceData(deployed.results[0].rows as unknown as MAApiDataRow[]);
    const decision = normalizeMAFirFaceData(deployed.results[1].rows as unknown as MAApiDataRow[]);
    expect(submission.byProduct.medicine).toMatchObject({ numerator: 871, denominator: 1256, targetDays: 30 });
    expect(submission.byProduct.medicalDevice).toMatchObject({ numerator: 1138, denominator: 1454 });
    expect(submission.byProduct.food).toMatchObject({ numerator: 332, denominator: 402 });
    expect(submission.byProduct.cosmetics).toMatchObject({ numerator: 1, denominator: 1 });
    expect(decision.byProduct.medicine).toMatchObject({ numerator: 962, denominator: 1695, targetDays: 30 });
    expect(decision.byProduct.medicalDevice).toMatchObject({ numerator: 908, denominator: 1224 });
    expect(decision.byProduct.food).toMatchObject({ numerator: 236, denominator: 289 });
    expect(decision.byProduct.cosmetics).toBeUndefined();
    expect(submission.totals.acceptedRows).toBe(10);
    expect(decision.totals.acceptedRows).toBe(9);
  });
  it("rejects GMP inspection rows when the configured report ID has been reassigned", () => {
    const result = normalizeMAFirFaceData([
      { module_code: "LOCAL", submoduletype_code: "MDCN", on_time_count: 2, total_count: 2, percentage: 100 },
      { module_code: "ABROAD", submoduletype_code: "MDCN", on_time_count: 16, total_count: 16, percentage: 100 },
    ]);
    expect(result.byProduct.medicine).toBeUndefined();
    expect(result.totals.acceptedRows).toBe(0);
    expect(result.warnings.some(warning => warning.code === "NON_MA_MODULE")).toBe(true);
  });
  it("sums every application type for a product and keeps the lanes separate", () => {
    const result = normalizeMAFirFaceData(screenshotRows);
    const medicine = result.byProduct.medicine;
    const device = result.byProduct.medicalDevice;
    const food = result.byProduct.food;
    const cosmetics = result.byProduct.cosmetics;

    expect(medicine).toMatchObject({
      numerator: 1767 + 1561 + 10,
      denominator: 2298 + 2373 + 40,
      targetDays: 30,
    });
    expect(medicine?.percentage).toBeCloseTo(((1767 + 1561 + 10) / (2298 + 2373 + 40)) * 100, 5);
    expect(medicine?.pathways.map((lane) => lane.label)).toEqual(["Renewal", "Variation"]);
    expect(medicine?.pathways.find((lane) => lane.label === "Variation")).toMatchObject({
      numerator: 1561 + 10,
      denominator: 2373 + 40,
    });

    expect(device).toMatchObject({ numerator: 991 + 443, denominator: 1053 + 498, targetDays: 30 });
    expect(device?.pathways.map((lane) => lane.code)).toEqual(["renewal", "variation"]);
    expect(food).toMatchObject({ numerator: 92, denominator: 99 });
    expect(food?.pathways).toEqual([
      expect.objectContaining({ label: "Variation", numerator: 92, denominator: 99 }),
    ]);
    expect(cosmetics).toMatchObject({ numerator: 40, denominator: 50 });
    expect(cosmetics?.pathways[0]?.label).toBe("New");
    expect(result.byProduct.foodNotification).toBeUndefined();
  });

  it("maps legacy module aliases into the same lanes", () => {
    const result = normalizeMAFirFaceData([
      { module_code: "IEN", submoduletype_code: "fd", target_days: 30, on_time_count: 1, total_count: 4, percentage: 25 },
      { module_code: "MDVMAJ", submoduletype_code: "MD", target_days: 30, on_time_count: 3, total_count: 4, percentage: 75 },
    ]);

    expect(result.byProduct.food?.pathways[0]?.code).toBe("renewal");
    expect(result.byProduct.medicalDevice?.pathways[0]?.code).toBe("variation");
  });

  it("skips rows that cannot be placed on a product", () => {
    const result = normalizeMAFirFaceData([
      { module_code: "NMR", submoduletype_code: "ZZ", target_days: 30, on_time_count: 1, total_count: 1, percentage: 100 },
      { module_code: "", submoduletype_code: "MDCN", on_time_count: 1, total_count: 1, percentage: 100 },
    ]);

    expect(result.byProduct.medicine).toBeUndefined();
    expect(result.totals.acceptedRows).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "UNKNOWN_SUBMODULE",
      "MISSING_REQUIRED_FIELD",
      "EMPTY_RESULT",
    ]);
  });
});
