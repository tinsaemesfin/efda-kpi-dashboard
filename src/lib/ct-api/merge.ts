import type { CTKpiSeedItem } from "@/data/ct-kpi-seed";
import { CT_FACE_KPI_IDS } from "@/lib/ct-api/constants";
import type { CTFaceKPIId, CTKPITransformedData, CTKPITransformedRow } from "@/types/ct-api";

function isUsableFaceRow(row: CTKPITransformedRow | undefined): row is CTKPITransformedRow {
  if (!row) return false;
  if (
    !Number.isFinite(row.numerator) ||
    !Number.isFinite(row.denominator) ||
    !Number.isFinite(row.percentage)
  ) {
    return false;
  }
  return row.denominator > 0;
}

/**
 * CT-KPI-1 and CT-KPI-2: only show values from the face API.
 * If a KPI has no usable row, mark `faceDataMissing` (no seed fallback).
 * CT-KPI-3..8 remain sample seed values.
 */
export function mergeCTCardsWithStrictFaceData(
  seedCards: CTKpiSeedItem[],
  kpiFaceDataById: CTKPITransformedData | null
): CTKpiSeedItem[] {
  return seedCards.map((card) => {
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

    return {
      ...card,
      faceDataMissing: false,
      value: apiRow.percentage,
      numerator: apiRow.numerator,
      denominator: apiRow.denominator,
      decimals: 1,
    };
  });
}
