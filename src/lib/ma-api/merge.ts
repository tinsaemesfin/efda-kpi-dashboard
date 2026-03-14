import type { MAProductKpiSeedItem } from "@/data/ma-dummy-data";
import type { MAKPITransformedData } from "@/types/ma-api";

const API_KPI_IDS = ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3", "MA-KPI-4"] as const;

export function mergeMedicineCardsWithFaceData(
  seedCards: MAProductKpiSeedItem[],
  kpiFaceDataById: Partial<MAKPITransformedData> | null
): MAProductKpiSeedItem[] {
  if (!kpiFaceDataById) return seedCards;

  return seedCards.map((card) => {
    const isApiBackedKpi = API_KPI_IDS.includes(card.drilldownId as (typeof API_KPI_IDS)[number]);
    if (!isApiBackedKpi) return card;

    const apiRow = kpiFaceDataById[card.drilldownId as keyof MAKPITransformedData];
    if (!apiRow || apiRow.denominator === 0) return card;

    return {
      ...card,
      value: apiRow.percentage,
      numerator: apiRow.numerator,
      denominator: apiRow.denominator,
      decimals: 1,
    };
  });
}
