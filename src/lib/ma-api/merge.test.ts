import { describe, expect, it } from "vitest";
import {
  mergeFoodCardsWithStrictFaceData,
  mergeMedicalDeviceCardsWithStrictFaceData,
  mergeCosmeticsCardsWithStrictFaceData,
  mergeMedicineCardsWithStrictFaceData,
} from "@/lib/ma-api/merge";
import { maProductKpiSeed } from "@/data/ma-dummy-data";

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
