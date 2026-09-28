import { describe, expect, it } from "vitest";
import {
  mergeFirCardsWithStrictFaceData,
  mergeFoodCardsWithStrictFaceData,
  mergeMedicalDeviceCardsWithStrictFaceData,
  mergeCosmeticsCardsWithStrictFaceData,
  mergeMedicineCardsWithStrictFaceData,
} from "@/lib/ma-api/merge";
import { normalizeMAFirFaceData } from "@/lib/ma-api/fir-normalizer";
import { maProductKpiSeed } from "@/data/ma-dummy-data";
import type { MAApiDataRow } from "@/types/ma-api";

describe("mergeMedicineCardsWithStrictFaceData", () => {
  const medicineSeed = maProductKpiSeed.medicine.cards;

  it("overrides KPI 1..4 from API rows and preserves 5..8 from seed when face data exists", () => {
    const merged = mergeMedicineCardsWithStrictFaceData(medicineSeed, {
      "MA-KPI-1": { numerator: 100, denominator: 200, percentage: 50 },
      "MA-KPI-2": { numerator: 60, denominator: 100, percentage: 60 },
      "MA-KPI-3": { numerator: 75, denominator: 100, percentage: 75 },
      "MA-KPI-4": { numerator: 20, denominator: 50, percentage: 40 },
    });

    const kpi1 = merged.find((card) => card.drilldownId === "MA-KPI-1");
    const kpi5 = merged.find((card) => card.drilldownId === "MA-KPI-5");
    const seedKpi5 = medicineSeed.find((card) => card.drilldownId === "MA-KPI-5");

    expect(kpi1?.value).toBe(50);
    expect(kpi1?.faceDataMissing).toBe(false);
    expect(kpi5?.value).toBe(seedKpi5?.value);
    expect(kpi5?.numerator).toBe(seedKpi5?.numerator);
    expect(kpi5?.denominator).toBe(seedKpi5?.denominator);
  });

  it("marks KPI 1..4 missing when face map is null (no seed fallback)", () => {
    const merged = mergeMedicineCardsWithStrictFaceData(medicineSeed, null);
    for (const id of ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3", "MA-KPI-4"] as const) {
      const card = merged.find((c) => c.drilldownId === id);
      expect(card?.faceDataMissing).toBe(true);
    }
  });
});

describe("mergeFoodCardsWithStrictFaceData", () => {
  const foodSeed = maProductKpiSeed.food.cards;

  it("marks KPI 1..4 as faceDataMissing when face map is null", () => {
    const merged = mergeFoodCardsWithStrictFaceData(foodSeed, null);
    for (const id of ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3", "MA-KPI-4"] as const) {
      const card = merged.find((c) => c.drilldownId === id);
      expect(card?.faceDataMissing).toBe(true);
    }
    const kpi5 = merged.find((c) => c.drilldownId === "MA-KPI-5");
    const seed5 = foodSeed.find((c) => c.drilldownId === "MA-KPI-5");
    expect(kpi5?.faceDataMissing).toBeUndefined();
    expect(kpi5?.value).toBe(seed5?.value);
  });

  it("marks a KPI as missing when denominator is zero", () => {
    const merged = mergeFoodCardsWithStrictFaceData(foodSeed, {
      "MA-KPI-1": { numerator: 0, denominator: 0, percentage: 0 },
    });
    const kpi1 = merged.find((c) => c.drilldownId === "MA-KPI-1");
    expect(kpi1?.faceDataMissing).toBe(true);
    const kpi2 = merged.find((c) => c.drilldownId === "MA-KPI-2");
    expect(kpi2?.faceDataMissing).toBe(true);
  });

  it("uses API values when row is valid", () => {
    const merged = mergeFoodCardsWithStrictFaceData(foodSeed, {
      "MA-KPI-1": { numerator: 9, denominator: 10, percentage: 90 },
    });
    const kpi1 = merged.find((c) => c.drilldownId === "MA-KPI-1");
    expect(kpi1?.faceDataMissing).toBe(false);
    expect(kpi1?.value).toBe(90);
    expect(kpi1?.numerator).toBe(9);
    expect(kpi1?.denominator).toBe(10);
  });
});

describe("mergeMedicalDeviceCardsWithStrictFaceData", () => {
  const mdSeed = maProductKpiSeed.medicalDevice.cards;

  it("requires API rows for KPI 1–4 strictly", () => {
    expect(mdSeed.some((c) => c.drilldownId === "MA-KPI-4")).toBe(true);
    const merged = mergeMedicalDeviceCardsWithStrictFaceData(mdSeed, null);
    for (const id of ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3", "MA-KPI-4"] as const) {
      const card = merged.find((c) => c.drilldownId === id);
      expect(card?.faceDataMissing).toBe(true);
    }
    const kpi5 = merged.find((c) => c.drilldownId === "MA-KPI-5");
    const seed5 = mdSeed.find((c) => c.drilldownId === "MA-KPI-5");
    expect(kpi5?.value).toBe(seed5?.value);
  });

  it("merges KPI 1–4 when API provides valid rows", () => {
    const merged = mergeMedicalDeviceCardsWithStrictFaceData(mdSeed, {
      "MA-KPI-1": { numerator: 1, denominator: 2, percentage: 50 },
      "MA-KPI-2": { numerator: 3, denominator: 4, percentage: 75 },
      "MA-KPI-3": { numerator: 10, denominator: 20, percentage: 50 },
      "MA-KPI-4": { numerator: 2, denominator: 4, percentage: 50 },
    });
    expect(merged.find((c) => c.drilldownId === "MA-KPI-1")?.value).toBe(50);
    expect(merged.find((c) => c.drilldownId === "MA-KPI-2")?.value).toBe(75);
    expect(merged.find((c) => c.drilldownId === "MA-KPI-3")?.faceDataMissing).toBe(false);
    expect(merged.find((c) => c.drilldownId === "MA-KPI-4")?.faceDataMissing).toBe(false);
    expect(merged.find((c) => c.drilldownId === "MA-KPI-4")?.value).toBe(50);
  });
});

describe("mergeFirCardsWithStrictFaceData", () => {
  const sharedRows: MAApiDataRow[] = [
    { module_code: "REN", submoduletype_code: "MDCN", target_days: 30, on_time_count: 1767, total_count: 2298, percentage: 76.89 },
    { module_code: "VAR", submoduletype_code: "MDCN", target_days: 30, on_time_count: 1561, total_count: 2373, percentage: 65.78 },
    { module_code: "VAR", submoduletype_code: "FD", target_days: 30, on_time_count: 92, total_count: 99, percentage: 92.93 },
    { module_code: "REN", submoduletype_code: "MD", target_days: 30, on_time_count: 991, total_count: 1053, percentage: 94.11 },
    { module_code: "NMR", submoduletype_code: "CO", target_days: 30, on_time_count: 8, total_count: 10, percentage: 80 },
  ];

  it("shows only the selected product on the FIR card", () => {
    const result = normalizeMAFirFaceData(sharedRows);
    const merged = mergeFirCardsWithStrictFaceData(maProductKpiSeed.medicine.cards, "medicine", result);
    const fir = merged.find((card) => card.drilldownId === "MA-KPI-5");
    const renewal = merged.find((card) => card.drilldownId === "MA-KPI-2");
    const foodFir = mergeFirCardsWithStrictFaceData(maProductKpiSeed.food.cards, "food", result).find(
      (card) => card.drilldownId === "MA-KPI-5"
    );

    expect(fir?.faceDataMissing).toBe(false);
    expect(fir?.numerator).toBe(1767 + 1561);
    expect(fir?.denominator).toBe(2298 + 2373);
    expect(fir?.targetDays).toBe(30);
    expect(fir?.moduleBreakdown?.map((lane) => lane.code)).toEqual(["Renewal", "Variation"]);
    expect(foodFir?.numerator).toBe(92);
    expect(foodFir?.denominator).toBe(99);
    expect(renewal?.value).toBe(maProductKpiSeed.medicine.cards.find((card) => card.drilldownId === "MA-KPI-2")?.value);
  });

  it("hides sample FIR numbers when the selected product has no rows", () => {
    const result = normalizeMAFirFaceData(sharedRows);
    const merged = mergeFirCardsWithStrictFaceData(maProductKpiSeed.food.cards, "foodNotification", result);
    const fir = merged.find((card) => card.drilldownId === "MA-KPI-5");
    expect(fir?.faceDataMissing).toBe(true);
    expect(fir?.value).toBe(0);
    expect(fir?.moduleBreakdown).toBeUndefined();
  });

  it("marks FIR missing while the report has not loaded", () => {
    const merged = mergeFirCardsWithStrictFaceData(maProductKpiSeed.cosmetics.cards, "cosmetics", null);
    expect(merged.find((card) => card.drilldownId === "MA-KPI-5")?.faceDataMissing).toBe(true);
  });
});

describe("mergeCosmeticsCardsWithStrictFaceData", () => {
  const cosSeed = maProductKpiSeed.cosmetics.cards;

  it("has no MA-KPI-4 face card and requires API rows for KPI 1–3 strictly", () => {
    expect(cosSeed.some((c) => c.drilldownId === "MA-KPI-4")).toBe(false);
    const merged = mergeCosmeticsCardsWithStrictFaceData(cosSeed, null);
    ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3"].forEach((id) => {
      const card = merged.find((c) => c.drilldownId === id);
      expect(card?.faceDataMissing).toBe(true);
    });
    const kpi5 = merged.find((c) => c.drilldownId === "MA-KPI-5");
    const seed5 = cosSeed.find((c) => c.drilldownId === "MA-KPI-5");
    expect(kpi5?.value).toBe(seed5?.value);
  });
});
