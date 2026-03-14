import { describe, expect, it } from "vitest";
import { mergeMedicineCardsWithFaceData } from "@/lib/ma-api/merge";
import { maProductKpiSeed } from "@/data/ma-dummy-data";

describe("mergeMedicineCardsWithFaceData", () => {
  it("overrides only KPI 1..4 and keeps 5..8 from seed", () => {
    const medicineSeed = maProductKpiSeed.medicine.cards;
    const merged = mergeMedicineCardsWithFaceData(medicineSeed, {
      "MA-KPI-1": { numerator: 100, denominator: 200, percentage: 50 },
      "MA-KPI-2": { numerator: 60, denominator: 100, percentage: 60 },
      "MA-KPI-3": { numerator: 75, denominator: 100, percentage: 75 },
      "MA-KPI-4": { numerator: 20, denominator: 50, percentage: 40 },
    });

    const kpi1 = merged.find((card) => card.drilldownId === "MA-KPI-1");
    const kpi2 = merged.find((card) => card.drilldownId === "MA-KPI-2");
    const kpi3 = merged.find((card) => card.drilldownId === "MA-KPI-3");
    const kpi4 = merged.find((card) => card.drilldownId === "MA-KPI-4");
    const kpi5 = merged.find((card) => card.drilldownId === "MA-KPI-5");
    const seedKpi5 = medicineSeed.find((card) => card.drilldownId === "MA-KPI-5");

    expect(kpi1?.value).toBe(50);
    expect(kpi2?.value).toBe(60);
    expect(kpi3?.value).toBe(75);
    expect(kpi4?.value).toBe(40);
    expect(kpi5?.value).toBe(seedKpi5?.value);
    expect(kpi5?.numerator).toBe(seedKpi5?.numerator);
    expect(kpi5?.denominator).toBe(seedKpi5?.denominator);
  });
});
