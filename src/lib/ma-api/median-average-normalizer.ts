import type {
  MAApiMedianAverageDataRow,
  MAKPITimeId,
  MAKPITimeTransformedRow,
  MANormalizeMedianAverageResult,
  MASubmoduleTypeCode,
} from "@/types/ma-api";

export interface MANormalizeMedianAverageOptions {
  submoduleFilter?: MASubmoduleTypeCode;
  /** Restrict to New MA rows (default NMR). */
  moduleFilter?: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Map /26 `metric` label to MA-KPI-6 (median) or MA-KPI-7 (average). */
function resolveTimeKpiId(metric: string): MAKPITimeId | null {
  const normalized = metric.trim().toUpperCase();
  if (normalized.includes("MEDIAN")) return "MA-KPI-6";
  if (normalized.includes("AVERAGE")) return "MA-KPI-7";
  return null;
}

function buildTimeRow(row: MAApiMedianAverageDataRow, kpiId: MAKPITimeId): MAKPITimeTransformedRow | null {
  if (!isFiniteNumber(row.decision_time_in_days) || !isFiniteNumber(row.total_count)) {
    return null;
  }

  const denominator = row.total_count;
  if (kpiId === "MA-KPI-6") {
    return {
      median: row.decision_time_in_days,
      numerator: 0,
      denominator,
    };
  }

  return {
    average: row.decision_time_in_days,
    numerator: row.decision_time_in_days * denominator,
    denominator,
  };
}

/**
 * Normalizes tabular report /26 rows into MA-KPI-6 (median) and MA-KPI-7 (average).
 *
 * Expected row shape:
 * - module_code: NMR
 * - submoduletype_code: MDCN
 * - metric: "Median Decision Time" | "Average Decision Time"
 * - total_count, decision_time_in_days
 */
export function normalizeMAMedicineMedianAverageFaceData(
  rows: MAApiMedianAverageDataRow[],
  options?: MANormalizeMedianAverageOptions
): MANormalizeMedianAverageResult {
  const warnings: MANormalizeMedianAverageResult["warnings"] = [];
  const kpiTimeDataById: MANormalizeMedianAverageResult["kpiTimeDataById"] = {};
  const submoduleFilter = options?.submoduleFilter?.toUpperCase();
  const moduleFilter = (options?.moduleFilter ?? "NMR").toUpperCase();

  let filteredRows = 0;
  let acceptedRows = 0;

  rows.forEach((row, rowIndex) => {
    if (!row?.module_code || !row?.submoduletype_code || !row?.metric) {
      warnings.push({
        code: "MISSING_REQUIRED_FIELD",
        message: "Row skipped because module_code, submoduletype_code, or metric is missing.",
        rowIndex,
        row,
      });
      return;
    }

    const rowSubmodule = row.submoduletype_code.toUpperCase();
    if (submoduleFilter && rowSubmodule !== submoduleFilter) {
      return;
    }

    const rowModule = String(row.module_code).toUpperCase();
    if (moduleFilter && rowModule !== moduleFilter) {
      return;
    }

    filteredRows += 1;

    const kpiId = resolveTimeKpiId(row.metric);
    if (!kpiId) {
      warnings.push({
        code: "UNKNOWN_KPI_CODE",
        message: `Row skipped because metric "${row.metric}" is not recognized.`,
        rowIndex,
        row,
      });
      return;
    }

    const transformed = buildTimeRow(row, kpiId);
    if (!transformed) {
      warnings.push({
        code: "INVALID_NUMERIC_VALUE",
        message: `Row skipped because ${kpiId} numeric fields are invalid.`,
        rowIndex,
        row,
      });
      return;
    }

    kpiTimeDataById[kpiId] = transformed;
    acceptedRows += 1;
  });

  if (acceptedRows === 0) {
    warnings.push({
      code: rows.length > 0 ? "EMPTY_RESULT" : "EMPTY_RESULT",
      message:
        rows.length > 0
          ? "No rows were accepted after applying MDCN/NMR filters and metric mapping."
          : "No rows were returned from tabular report /26.",
    });
  }

  return {
    kpiTimeDataById,
    warnings,
    totals: {
      totalRows: rows.length,
      filteredRows,
      acceptedRows,
    },
  };
}
