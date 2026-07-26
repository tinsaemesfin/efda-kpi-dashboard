import { MA_MODULE_CODE_ALIASES } from "@/lib/ma-api/constants";
import { resolveMAModuleCode } from "@/lib/ma-api/normalizer";
import {
  MA_PAR_MODULE_ORDER,
  type MAApiDataRow,
  type MAKPIParModuleBreakdownItem,
  type MAKPIParTransformedData,
  type MAParModuleCode,
  type MANormalizeParResult,
  type MANormalizeParWarning,
} from "@/types/ma-api";

const MODULE_LABELS: Record<MAParModuleCode, string> = {
  NMR: "New",
  REN: "Renewal",
  VMIN: "Minor",
  VMAJ: "Major",
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function emptyModule(code: MAParModuleCode): MAKPIParModuleBreakdownItem {
  return {
    code,
    label: MODULE_LABELS[code],
    numerator: 0,
    denominator: 0,
    percentage: 0,
  };
}

/**
 * Normalize PAR / MA-KPI-8 face rows (NMR/REN/VMIN/VMAJ) into:
 * - one overall total (sum of on_time / total)
 * - four fixed module breakdown slots
 */
export function normalizeMAPARFaceData(rows: MAApiDataRow[]): MANormalizeParResult {
  const warnings: MANormalizeParWarning[] = [];
  const byModule = new Map<MAParModuleCode, { numerator: number; denominator: number; targetDays?: number }>();

  let acceptedRows = 0;
  let targetDays: number | undefined;

  rows.forEach((row, rowIndex) => {
    if (!row?.module_code || row.on_time_count == null || row.total_count == null) {
      warnings.push({
        code: "MISSING_REQUIRED_FIELD",
        message: "Row skipped because one or more required fields are missing.",
        rowIndex,
        row,
      });
      return;
    }

    const numerator = toFiniteNumber(row.on_time_count);
    const denominator = toFiniteNumber(row.total_count);
    if (numerator == null || denominator == null) {
      warnings.push({
        code: "INVALID_NUMERIC_VALUE",
        message: "Row skipped because numeric fields are invalid.",
        rowIndex,
        row,
      });
      return;
    }

    const canonical = resolveMAModuleCode(String(row.module_code), MA_MODULE_CODE_ALIASES);
    if (!MA_PAR_MODULE_ORDER.includes(canonical as MAParModuleCode)) {
      warnings.push({
        code: "UNKNOWN_MODULE_CODE",
        message: `No PAR module slot for module code: ${canonical}.`,
        rowIndex,
        row,
      });
      return;
    }

    const moduleCode = canonical as MAParModuleCode;
    const existing = byModule.get(moduleCode) ?? { numerator: 0, denominator: 0 };
    existing.numerator += numerator;
    existing.denominator += denominator;
    const rowTarget = toFiniteNumber(row.target_days);
    if (rowTarget != null) {
      existing.targetDays = rowTarget;
      targetDays = rowTarget;
    }
    byModule.set(moduleCode, existing);
    acceptedRows += 1;
  });

  if (acceptedRows === 0) {
    warnings.push({
      code: "EMPTY_RESULT",
      message: "No rows were accepted after applying filters and mapping.",
    });
    return {
      parData: null,
      warnings,
      totals: {
        totalRows: rows.length,
        filteredRows: rows.length,
        acceptedRows: 0,
      },
    };
  }

  let totalNumerator = 0;
  let totalDenominator = 0;
  const modules = MA_PAR_MODULE_ORDER.map((code) => {
    const agg = byModule.get(code);
    if (!agg || agg.denominator <= 0) {
      return emptyModule(code);
    }
    totalNumerator += agg.numerator;
    totalDenominator += agg.denominator;
    return {
      code,
      label: MODULE_LABELS[code],
      numerator: agg.numerator,
      denominator: agg.denominator,
      percentage: (agg.numerator / agg.denominator) * 100,
    };
  });

  const parData: MAKPIParTransformedData = {
    numerator: totalNumerator,
    denominator: totalDenominator,
    percentage: totalDenominator > 0 ? (totalNumerator / totalDenominator) * 100 : 0,
    targetDays,
    modules,
  };

  return {
    parData,
    warnings,
    totals: {
      totalRows: rows.length,
      filteredRows: rows.length,
      acceptedRows,
    },
  };
}
