import type { MAProductKpiSeedItem } from "@/data/ma-dummy-data";
import type { MAKPITransformedData, MAKPITransformedRow } from "@/types/ma-api";

const API_KPI_IDS = ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3", "MA-KPI-4"] as const;
const COSMETICS_FACE_KPI_IDS = ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3"] as const;

function isUsableFaceRow(row: MAKPITransformedRow | undefined): row is MAKPITransformedRow {
  if (!row) return false;
  if (!Number.isFinite(row.numerator) || !Number.isFinite(row.denominator) || !Number.isFinite(row.percentage)) {
    return false;
  }
  return row.denominator > 0;
}

/**
 * Food MA-KPI-1..4: only show values from the face API; if a KPI has no valid row, mark
 * `faceDataMissing` (no seed fallback).
 */
export function mergeFoodCardsWithStrictFaceData(
  seedCards: MAProductKpiSeedItem[],
  kpiFaceDataById: Partial<MAKPITransformedData> | null
): MAProductKpiSeedItem[] {
  return seedCards.map((card) => {
    const isApiBackedKpi = API_KPI_IDS.includes(card.drilldownId as (typeof API_KPI_IDS)[number]);
    if (!isApiBackedKpi) return card;

    const apiRow = kpiFaceDataById?.[card.drilldownId as keyof MAKPITransformedData];
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

function mergeStrictFaceSlots(
  seedCards: MAProductKpiSeedItem[],
  kpiFaceDataById: Partial<MAKPITransformedData> | null,
  backedDrilldownIds: readonly string[]
): MAProductKpiSeedItem[] {
  return seedCards.map((card) => {
    const isBacked = backedDrilldownIds.includes(card.drilldownId);
    if (!isBacked) return card;

    const apiRow = kpiFaceDataById?.[card.drilldownId as keyof MAKPITransformedData];
    if (!isUsableFaceRow(apiRow)) {
      return {
        ...card,
        faceDataMissing: true,
        notApplicableReason: undefined,
        value: 0,
        numerator: 0,
        denominator: 0,
        decimals: 1,
      };
    }

    return {
      ...card,
      faceDataMissing: false,
      notApplicableReason: undefined,
      value: apiRow.percentage,
      numerator: apiRow.numerator,
      denominator: apiRow.denominator,
      decimals: 1,
    };
  });
}

/**
 * Medical Device face API (/16): MA-KPI-1..4 strict API-only (`VMIN` → 3, `VMAJ` → 4, legacy `VAR` → 3).
 */
export function mergeMedicalDeviceCardsWithStrictFaceData(
  seedCards: MAProductKpiSeedItem[],
  kpiFaceDataById: Partial<MAKPITransformedData> | null
): MAProductKpiSeedItem[] {
  return mergeStrictFaceSlots(seedCards, kpiFaceDataById, API_KPI_IDS);
}

/** Cosmetics face API (/17): MA-KPI-1..3 strict; all variation rows map to MA-KPI-3. */
export function mergeCosmeticsCardsWithStrictFaceData(
  seedCards: MAProductKpiSeedItem[],
  kpiFaceDataById: Partial<MAKPITransformedData> | null
): MAProductKpiSeedItem[] {
  return mergeStrictFaceSlots(seedCards, kpiFaceDataById, COSMETICS_FACE_KPI_IDS);
}

/**
 * Medicine MA-KPI-1..4: same strict rules as Food — card values come only from the face API (/8).
 * Missing or invalid rows are marked `faceDataMissing`; seed metrics are never shown for these slots.
 */
export function mergeMedicineCardsWithStrictFaceData(
  seedCards: MAProductKpiSeedItem[],
  kpiFaceDataById: Partial<MAKPITransformedData> | null
): MAProductKpiSeedItem[] {
  return mergeFoodCardsWithStrictFaceData(seedCards, kpiFaceDataById);
}
