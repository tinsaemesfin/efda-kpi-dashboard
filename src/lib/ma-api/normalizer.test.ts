import { describe, expect, it } from "vitest";
import {
  MA_DEFAULT_MODULE_TO_KPI_MAPPING,
  MA_MODULE_CODE_ALIASES,
} from "@/lib/ma-api/constants";
import { normalizeMAFaceData } from "@/lib/ma-api/normalizer";
import type { MAApiDataRow } from "@/types/ma-api";

const sampleRows: MAApiDataRow[] = [
  {
    module_code: "NMR",
    submoduletype_code: "MDCN",
    target_days: 270,
    on_time_count: 941,
    total_count: 6194,
    percentage: 15.19,
  },
  {
    module_code: "REN",
    submoduletype_code: "MDCN",
    target_days: 90,
    on_time_count: 448,
    total_count: 1925,
    percentage: 23.27,
  },
  {
    module_code: "VMIN",
    submoduletype_code: "MDCN",
    target_days: 60,
    on_time_count: 190,
    total_count: 1487,
    percentage: 12.78,
  },
  {
    module_code: "VMAJ",
    submoduletype_code: "MDCN",
    target_days: 60,
    on_time_count: 41,
    total_count: 610,
    percentage: 6.72,
  },
  {
    module_code: "NMR",
    submoduletype_code: "FD",
    target_days: 120,
    on_time_count: 99,
    total_count: 123,
    percentage: 80.5,
  },
];

describe("normalizeMAFaceData", () => {
  it("maps and filters Medicine face rows for KPI 1..4", () => {
    const result = normalizeMAFaceData(sampleRows, {
      submoduleFilter: "MDCN",
      moduleToKpiMapping: {
        NMR: "MA-KPI-1",
        REN: "MA-KPI-2",
        VMIN: "MA-KPI-3",
        VMAJ: "MA-KPI-4",
        VAR: "MA-KPI-3",
      },
    });

    expect(result.kpiFaceDataById["MA-KPI-1"]).toMatchObject({
      numerator: 941,
      denominator: 6194,
    });
    expect(result.kpiFaceDataById["MA-KPI-2"]).toMatchObject({
      numerator: 448,
      denominator: 1925,
    });
    expect(result.kpiFaceDataById["MA-KPI-3"]).toMatchObject({
      numerator: 190,
      denominator: 1487,
    });
    expect(result.kpiFaceDataById["MA-KPI-4"]).toMatchObject({
      numerator: 41,
      denominator: 610,
    });
    expect(result.totals.filteredRows).toBe(4);
    expect(result.totals.acceptedRows).toBe(4);
  });

  it("supports backend alias module codes", () => {
    const result = normalizeMAFaceData(
      [
        {
          module_code: "IMR",
          submoduletype_code: "MDCN",
          on_time_count: 10,
          total_count: 40,
          percentage: 25,
        },
      ],
      {
        submoduleFilter: "MDCN",
        moduleToKpiMapping: {
          NMR: "MA-KPI-1",
          REN: "MA-KPI-2",
          VMIN: "MA-KPI-3",
          VMAJ: "MA-KPI-4",
          VAR: "MA-KPI-3",
        },
        moduleCodeAliases: {
          IMR: "NMR",
        },
      }
    );

    expect(result.kpiFaceDataById["MA-KPI-1"]).toMatchObject({
      numerator: 10,
      denominator: 40,
      percentage: 25,
    });
  });

  it("aggregates Food face-style rows (FD) with VMIN and VMAJ when report is product-scoped (no submodule filter)", () => {
    const rows: MAApiDataRow[] = [
      {
        module_code: "NMR",
        submoduletype_code: "FD",
        target_days: 120,
        on_time_count: 10,
        total_count: 20,
        percentage: 50,
      },
      {
        module_code: "REN",
        submoduletype_code: "FD",
        target_days: 90,
        on_time_count: 2,
        total_count: 8,
        percentage: 25,
      },
      {
        module_code: "VMIN",
        submoduletype_code: "FD",
        target_days: 60,
        on_time_count: 30,
        total_count: 40,
        percentage: 75,
      },
      {
        module_code: "VMAJ",
        submoduletype_code: "FD",
        target_days: 60,
        on_time_count: 5,
        total_count: 10,
        percentage: 50,
      },
    ];
    const result = normalizeMAFaceData(rows, {
      moduleToKpiMapping: MA_DEFAULT_MODULE_TO_KPI_MAPPING,
      moduleCodeAliases: MA_MODULE_CODE_ALIASES,
    });

    expect(result.kpiFaceDataById["MA-KPI-1"]).toMatchObject({
      numerator: 10,
      denominator: 20,
    });
    expect(result.kpiFaceDataById["MA-KPI-2"]).toMatchObject({
      numerator: 2,
      denominator: 8,
    });
    expect(result.kpiFaceDataById["MA-KPI-3"]).toMatchObject({
      numerator: 30,
      denominator: 40,
    });
    expect(result.kpiFaceDataById["MA-KPI-4"]).toMatchObject({
      numerator: 5,
      denominator: 10,
    });
    expect(result.totals.acceptedRows).toBe(4);
  });

  it("warns and skips unknown module codes", () => {
    const result = normalizeMAFaceData(
      [
        {
          module_code: "UNKNOWN",
          submoduletype_code: "MDCN",
          on_time_count: 5,
          total_count: 10,
          percentage: 50,
        },
      ],
      {
        submoduleFilter: "MDCN",
        moduleToKpiMapping: {
          NMR: "MA-KPI-1",
          REN: "MA-KPI-2",
          VMIN: "MA-KPI-3",
          VMAJ: "MA-KPI-4",
          VAR: "MA-KPI-3",
        },
      }
    );

    expect(result.totals.acceptedRows).toBe(0);
    expect(result.warnings.some((warning) => warning.code === "UNKNOWN_MODULE_CODE")).toBe(true);
  });
});
