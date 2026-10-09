import { CT_KPI_TO_EXPECTED_SUBMODULE } from "@/lib/ct-api/constants";
import type {
  CTApiDataRow,
  CTFaceKPIId,
  CTNormalizeResult,
  CTNormalizationWarning,
  CTRatioKPIId,
} from "@/types/ct-api";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function emptyResult(rows: CTApiDataRow[], warnings: CTNormalizationWarning[]): CTNormalizeResult {
  return {
    kpiFaceDataById: {},
    warnings,
    totals: { totalRows: rows.length, filteredRows: 0, acceptedRows: 0 },
  };
}

/**
 * Normalize a ratio face report into one KPI row.
 * SAE and NSAE rows on the same report are summed.
 * When those rows use different targets, targetDays is omitted.
 */
export function normalizeCTFaceReport(
  rows: CTApiDataRow[],
  kpiId: CTRatioKPIId
): CTNormalizeResult {
  const warnings: CTNormalizationWarning[] = [];
  const expectedSubmodule = CT_KPI_TO_EXPECTED_SUBMODULE[kpiId].toUpperCase();

  let numerator = 0;
  let denominator = 0;
  let targetDays: number | undefined;
  let mixedTargets = false;
  let filteredRows = 0;
  let acceptedRows = 0;

  rows.forEach((row, rowIndex) => {
    if (!row?.submodule_code || row.on_time_count == null || row.total_count == null) {
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

    const onTime = asNumber(row.on_time_count);
    const total = asNumber(row.total_count);
    if (onTime == null || total == null) {
      warnings.push({
        code: "INVALID_NUMERIC_VALUE",
        message: "Row skipped because numeric fields are invalid.",
        rowIndex,
        row,
      });
      return;
    }

    numerator += onTime;
    denominator += total;
    const target = asNumber(row.target_days);
    if (target != null) {
      if (targetDays === undefined) targetDays = target;
      else if (targetDays !== target) mixedTargets = true;
    }
    acceptedRows += 1;
  });

  if (acceptedRows === 0) {
    warnings.push({
      code: "EMPTY_RESULT",
      message: "No rows were accepted after applying filters and mapping.",
    });
    return {
      kpiFaceDataById: {},
      warnings,
      totals: { totalRows: rows.length, filteredRows, acceptedRows },
    };
  }

  return {
    kpiFaceDataById: {
      [kpiId]: {
        kind: "ratio",
        numerator,
        denominator,
        percentage: denominator > 0 ? (numerator / denominator) * 100 : 0,
        targetDays: mixedTargets ? undefined : targetDays,
      },
    },
    warnings,
    totals: { totalRows: rows.length, filteredRows, acceptedRows },
  };
}

/**
 * CT-KPI-8 is an average, not a ratio.
 * A combined period uses SUM(total_days) / SUM(total_count).
 */
export function normalizeCTTurnaroundReport(rows: CTApiDataRow[]): CTNormalizeResult {
  const warnings: CTNormalizationWarning[] = [];
  const expectedSubmodule = CT_KPI_TO_EXPECTED_SUBMODULE["CT-KPI-8"].toUpperCase();
  let totalDays = 0;
  let totalCount = 0;
  let targetDays: number | undefined;
  let filteredRows = 0;
  let acceptedRows = 0;

  rows.forEach((row, rowIndex) => {
    if (!row?.submodule_code || row.total_count == null) {
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
    const count = asNumber(row.total_count);
    const days = asNumber(row.total_days);
    if (count == null || (count > 0 && days == null)) {
      warnings.push({
        code: "INVALID_NUMERIC_VALUE",
        message: "Row skipped because turnaround fields are invalid.",
        rowIndex,
        row,
      });
      return;
    }
    totalCount += count;
    totalDays += days ?? 0;
    const target = asNumber(row.target_days);
    if (target != null) targetDays = target;
    acceptedRows += 1;
  });

  if (acceptedRows === 0 || totalCount <= 0) {
    warnings.push({
      code: "EMPTY_RESULT",
      message: "No decided applications were returned for the selected period.",
    });
    return emptyResult(rows, warnings);
  }

  const averageDays = totalDays / totalCount;
  return {
    kpiFaceDataById: {
      "CT-KPI-8": {
        kind: "turnaround",
        numerator: totalDays,
        denominator: totalCount,
        percentage: averageDays,
        averageDays,
        targetDays,
      },
    },
    warnings,
    totals: { totalRows: rows.length, filteredRows, acceptedRows },
  };
}

export function normalizeCTReport(rows: CTApiDataRow[], kpiId: CTFaceKPIId): CTNormalizeResult {
  if (kpiId === "CT-KPI-8") return normalizeCTTurnaroundReport(rows);
  return normalizeCTFaceReport(rows, kpiId);
}
