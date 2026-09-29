import type { CTKpiSeedItem } from "@/data/ct-kpi-seed";
import { CT_FACE_KPI_IDS } from "@/lib/ct-api/constants";
import type { CTFaceKPIId, CTKPITransformedData, CTKPITransformedRow } from "@/types/ct-api";

function isUsableFaceRow(row: CTKPITransformedRow | undefined): row is CTKPITransformedRow {
  if (!row) return false;
  if (!Number.isFinite(row.numerator) || !Number.isFinite(row.denominator)) return false;
  if (row.kind === "turnaround") {
    return row.denominator > 0 && row.averageDays != null && Number.isFinite(row.averageDays);
  }
  return Number.isFinite(row.percentage) && row.denominator > 0;
}

/**
 * Live CT cards show the face API only. A missing row stays empty.
 * CT-KPI-6 stays not applicable and never uses sample numbers.
 */
export function mergeCTCardsWithStrictFaceData(
  seedCards: CTKpiSeedItem[],
  kpiFaceDataById: CTKPITransformedData | null
): CTKpiSeedItem[] {
  return seedCards.map((card) => {
    if (card.notApplicableReason) {
      return {
        ...card,
        faceDataMissing: false,
        value: 0,
        numerator: 0,
        denominator: 0,
      };
    }

    const isApiBacked = CT_FACE_KPI_IDS.includes(card.drilldownId as CTFaceKPIId);
    if (!isApiBacked) return card;

    const apiRow = kpiFaceDataById?.[card.drilldownId as CTFaceKPIId];
    if (!isUsableFaceRow(apiRow)) {
      return {
        ...card,
        faceDataMissing: true,
        value: 0,
        numerator: 0,
        denominator: 0,
        decimals: 1,
      };
    }

    if (apiRow.kind === "turnaround") {
      return {
        ...card,
        faceDataMissing: false,
        value: apiRow.averageDays ?? 0,
        numerator: apiRow.numerator,
        denominator: apiRow.denominator,
        targetDays: apiRow.targetDays,
        decimals: 1,
      };
    }

    return {
      ...card,
      faceDataMissing: false,
      value: apiRow.percentage,
      numerator: apiRow.numerator,
      denominator: apiRow.denominator,
      targetDays: apiRow.targetDays,
      decimals: 1,
    };
  });
}
