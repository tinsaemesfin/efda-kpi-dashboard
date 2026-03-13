import {
  MA_DEFAULT_MODULE_TO_KPI_MAPPING,
  MA_MODULE_CODE_ALIASES,
} from "@/lib/ma-api/constants";
import type {
  MAApiDataRow,
  MAKPIId,
  MANormalizeOptions,
  MANormalizeResult,
} from "@/types/ma-api";

interface AggregateRow {
  numerator: number;
  denominator: number;
  targetDays?: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function resolveModuleCode(
  moduleCode: string,
  aliases: Record<string, string>
): string {
  const upperModuleCode = moduleCode.toUpperCase();
  return aliases[upperModuleCode] ?? upperModuleCode;
}

export function normalizeMAFaceData(
  rows: MAApiDataRow[],
  options?: MANormalizeOptions
): MANormalizeResult {
  const warnings: MANormalizeResult["warnings"] = [];
  const aggregates = new Map<MAKPIId, AggregateRow>();
  const submoduleFilter = options?.submoduleFilter?.toUpperCase();
  const moduleToKpi = options?.moduleToKpiMapping ?? MA_DEFAULT_MODULE_TO_KPI_MAPPING;
  const moduleCodeAliases = options?.moduleCodeAliases ?? MA_MODULE_CODE_ALIASES;

  let filteredRows = 0;
  let acceptedRows = 0;

  rows.forEach((row, rowIndex) => {
    if (
      !row?.module_code ||
      !row?.submoduletype_code ||
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

    const rowSubmodule = row.submoduletype_code.toUpperCase();
    if (submoduleFilter && rowSubmodule !== submoduleFilter) {
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

    const canonicalModuleCode = resolveModuleCode(String(row.module_code), moduleCodeAliases);
    const kpiId = moduleToKpi[canonicalModuleCode];
    if (!kpiId) {
      warnings.push({
        code: "UNKNOWN_MODULE_CODE",
        message: `No KPI mapping configured for module code: ${canonicalModuleCode}.`,
        rowIndex,
        row,
      });
      return;
    }

    const existing = aggregates.get(kpiId) ?? { numerator: 0, denominator: 0 };
    existing.numerator += row.on_time_count;
    existing.denominator += row.total_count;
    if (isFiniteNumber(row.target_days)) {
      existing.targetDays = row.target_days;
    }
    aggregates.set(kpiId, existing);
    acceptedRows += 1;
  });

  const kpiFaceDataById: MANormalizeResult["kpiFaceDataById"] = {};
  aggregates.forEach((aggregateRow, kpiId) => {
    const denominator = aggregateRow.denominator;
    const percentage = denominator > 0 ? (aggregateRow.numerator / denominator) * 100 : 0;
    kpiFaceDataById[kpiId] = {
      numerator: aggregateRow.numerator,
      denominator,
      percentage,
      targetDays: aggregateRow.targetDays,
    };
  });

  if (acceptedRows === 0) {
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
