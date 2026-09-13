import { describe, expect, it } from "vitest";
import { normalizeMAPARFaceData } from "@/lib/ma-api/par-normalizer";
import type { MAApiDataRow } from "@/types/ma-api";

describe("normalizeMAPARFaceData", () => {
  it("aggregates overall total and keeps four module slots", () => {
    const rows: MAApiDataRow[] = [
      {
        module_code: "NMR",
        submoduletype_code: "MDCN",
        target_days: 30,
        on_time_count: 10,
        total_count: 20,
        percentage: 50,
      },
      {
        module_code: "REN",
        submoduletype_code: "MDCN",
        target_days: 30,
        on_time_count: 5,
        total_count: 10,
        percentage: 50,
      },
      {
        module_code: "VMIN",
        submoduletype_code: "MDCN",
        target_days: 30,
        on_time_count: 0,
        total_count: 5,
        percentage: 0,
      },
      {
        module_code: "VMAJ",
        submoduletype_code: "MDCN",
        target_days: 30,
        on_time_count: 1,
        total_count: 5,
        percentage: 20,
      },
    ];

    const result = normalizeMAPARFaceData(rows);
    expect(result.parData).not.toBeNull();
    expect(result.parData?.numerator).toBe(16);
    expect(result.parData?.denominator).toBe(40);
    expect(result.parData?.percentage).toBe(40);
    expect(result.parData?.modules).toHaveLength(4);
    expect(result.parData?.modules.map((m) => m.code)).toEqual([
      "NMR",
      "REN",
      "VMIN",
      "VMAJ",
    ]);
    expect(result.parData?.modules[0]?.percentage).toBe(50);
    expect(result.parData?.modules[2]?.percentage).toBe(0);
  });

  it("coerces string numerics from the API", () => {
    const rows = [
      {
        module_code: "NMR",
        submoduletype_code: "MDCN",
        on_time_count: "558" as unknown as number,
        total_count: "3070" as unknown as number,
        percentage: 18.18,
      },
    ] as MAApiDataRow[];

    const result = normalizeMAPARFaceData(rows);
    expect(result.parData?.numerator).toBe(558);
    expect(result.parData?.denominator).toBe(3070);
    expect(result.parData?.modules[0]?.percentage).toBeCloseTo((558 / 3070) * 100, 2);
  });

  it("returns null when no usable rows", () => {
    const result = normalizeMAPARFaceData([]);
    expect(result.parData).toBeNull();
    expect(result.warnings.some((w) => w.code === "EMPTY_RESULT")).toBe(true);
  });

  it("includes unsplit variation applications in the PAR total", () => {
    const result = normalizeMAPARFaceData([
      { module_code: 'NMR', submoduletype_code: 'CO', on_time_count: 3, total_count: 5, percentage: 60 },
      { module_code: 'VAR', submoduletype_code: 'CO', on_time_count: 2, total_count: 4, percentage: 50 },
    ]);
    expect(result.parData?.numerator).toBe(5);
    expect(result.parData?.denominator).toBe(9);
    expect(result.parData?.modules.find(m => m.code === 'VAR')?.denominator).toBe(4);
  });

  it("keeps food and device variation codes in the PAR denominator", () => {
    const result = normalizeMAPARFaceData([
      { module_code: 'VFMIN', submoduletype_code: 'FD', on_time_count: 1, total_count: 2, percentage: 50 },
      { module_code: 'MDVMAJ', submoduletype_code: 'MD', on_time_count: 3, total_count: 4, percentage: 75 },
    ]);
    expect(result.parData?.denominator).toBe(6);
    expect(result.parData?.numerator).toBe(4);
    expect(result.warnings).toHaveLength(0);
  });
});
