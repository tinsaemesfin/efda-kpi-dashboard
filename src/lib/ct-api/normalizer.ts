import {
  CT_KPI_TO_EXPECTED_SUBMODULE,
} from "@/lib/ct-api/constants";
import type {
  CTApiDataRow,
  CTFaceKPIId,
  CTNormalizeResult,
} from "@/types/ct-api";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Normalize a single CT face report into one KPI row.
 * Each report (/33, /34) is already scoped to one KPI; we aggregate matching rows.
 */
export function normalizeCTFaceReport(
  rows: CTApiDataRow[],
  kpiId: CTFaceKPIId
): CTNormalizeResult {
  const warnings: CTNormalizeResult["warnings"] = [];
  const expectedSubmodule = CT_KPI_TO_EXPECTED_SUBMODULE[kpiId].toUpperCase();

  let numerator = 0;
  let denominator = 0;
  let targetDays: number | undefined;
  let filteredRows = 0;
  let acceptedRows = 0;

  rows.forEach((row, rowIndex) => {
    if (
      !row?.submodule_code ||
      row.on_time_count == null ||
      row.total_count == null
    ) {
      warnings.push({
        code: "MISSING_REQUIRED_FIELD",
        message: "Row skipped because one or more required fields are missing.",
        rowIndex,
        row,
      });
      return;
    }

    const submodule = String(row.submodule_code).toUpperCase();
    if (submodule !== expectedSubmodule) {
      warnings.push({
        code: "UNKNOWN_SUBMODULE_CODE",
        message: `Expected submodule ${expectedSubmodule}, got ${submodule}.`,
        rowIndex,
        row,
      });
      return;
    }
    filteredRows += 1;

    if (!isFiniteNumber(row.on_time_count) || !isFiniteNumber(row.total_count)) {
      warnings.push({
        code: "INVALID_NUMERIC_VALUE",
        message: "Row skipped because numeric fields are invalid.",
        rowIndex,
        row,
      });
      return;
    }

    numerator += row.on_time_count;
    denominator += row.total_count;
    if (isFiniteNumber(row.target_days)) {
      targetDays = row.target_days;
    }
    acceptedRows += 1;
  });

  const kpiFaceDataById: CTNormalizeResult["kpiFaceDataById"] = {};
  if (acceptedRows > 0) {
    const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
    kpiFaceDataById[kpiId] = {
      numerator,
      denominator,
      percentage,
      targetDays,
    };
  } else {
    warnings.push({
      code: "EMPTY_RESULT",
      message: "No rows were accepted after applying filters and mapping.",
    });
  }

  return {
    kpiFaceDataById,
    warnings,
    totals: {
      totalRows: rows.length,
      filteredRows,
      acceptedRows,
    },
  };
}
