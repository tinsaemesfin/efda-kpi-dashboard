import { MA_MODULE_CODE_ALIASES } from "@/lib/ma-api/constants";
import { resolveMAModuleCode } from "@/lib/ma-api/normalizer";
import type { MAApiDataRow, MAReportProduct } from "@/types/ma-api";

export interface MAFirPathway {
  code: "new" | "renewal" | "variation" | "other";
  label: string;
  numerator: number;
  denominator: number;
  percentage: number;
}

export interface MAFirProductFace {
  numerator: number;
  denominator: number;
  percentage: number;
  targetDays?: number;
  pathways: MAFirPathway[];
}

export interface MAFirNormalizeWarning {
  code: "MISSING_REQUIRED_FIELD" | "INVALID_NUMERIC_VALUE" | "UNKNOWN_SUBMODULE" | "NON_MA_MODULE" | "EMPTY_RESULT";
  message: string;
  rowIndex?: number;
}

export interface MAFirNormalizeResult {
  byProduct: Partial<Record<MAReportProduct, MAFirProductFace>>;
  warnings: MAFirNormalizeWarning[];
  totals: {
    totalRows: number;
    acceptedRows: number;
  };
}

const SUBMODULE_TO_PRODUCT: Record<string, MAReportProduct> = {
  MDCN: "medicine",
  FD: "food",
  FNT: "foodNotification",
  FDN: "foodNotification",
  MD: "medicalDevice",
  CO: "cosmetics",
};

const PATHWAY_ORDER: MAFirPathway["code"][] = ["new", "renewal", "variation", "other"];

const PATHWAY_LABEL: Record<MAFirPathway["code"], string> = {
  new: "New",
  renewal: "Renewal",
  variation: "Variation",
  other: "Other",
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pathwayForModule(moduleCode: string): MAFirPathway["code"] {
  const canonical = resolveMAModuleCode(moduleCode, MA_MODULE_CODE_ALIASES);
  if (canonical === "NMR") return "new";
  if (canonical === "REN") return "renewal";
  if (canonical === "VAR" || canonical === "VMIN" || canonical === "VMAJ") return "variation";
  return "other";
}

function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

/**
 * Report 218 returns one row per application type and product line.
 * Each product total is the sum of its rows. Pathways keep New, Renewal, and Variation visible.
 */
export function normalizeMAFirFaceData(rows: MAApiDataRow[]): MAFirNormalizeResult {
  const warnings: MAFirNormalizeWarning[] = [];
  const buckets = new Map<
    MAReportProduct,
    Map<MAFirPathway["code"], { numerator: number; denominator: number; targetDays?: number }>
  >();

  let acceptedRows = 0;

  rows.forEach((row, rowIndex) => {
    if (!row?.module_code || !row?.submoduletype_code || row.on_time_count == null || row.total_count == null) {
      warnings.push({
        code: "MISSING_REQUIRED_FIELD",
        message: "Row skipped because module, product, or counts are missing.",
        rowIndex,
      });
      return;
    }

    // A catalogue ID can be reassigned to GMP; those inspection rows cannot represent MA FIRs.
    if (["LOCAL", "ABROAD", "WAIVER"].includes(String(row.module_code).toUpperCase())) {
      warnings.push({ code: "NON_MA_MODULE", message: "Inspection data cannot be used as MA FIR data.", rowIndex });
      return;
    }

    const numerator = toFiniteNumber(row.on_time_count);
    const denominator = toFiniteNumber(row.total_count);
    if (numerator == null || denominator == null) {
      warnings.push({
        code: "INVALID_NUMERIC_VALUE",
        message: "Row skipped because counts are not numeric.",
        rowIndex,
      });
      return;
    }

    const product = SUBMODULE_TO_PRODUCT[String(row.submoduletype_code).toUpperCase()];
    if (!product) {
      warnings.push({
        code: "UNKNOWN_SUBMODULE",
        message: `No product mapping for submodule ${row.submoduletype_code}.`,
        rowIndex,
      });
      return;
    }

    const lane = pathwayForModule(String(row.module_code));
    const productBuckets = buckets.get(product) ?? new Map();
    const existing = productBuckets.get(lane) ?? { numerator: 0, denominator: 0 };
    existing.numerator += numerator;
    existing.denominator += denominator;
    const targetDays = toFiniteNumber(row.target_days);
    if (targetDays != null) existing.targetDays = targetDays;
    productBuckets.set(lane, existing);
    buckets.set(product, productBuckets);
    acceptedRows += 1;
  });

  const byProduct: MAFirNormalizeResult["byProduct"] = {};
  buckets.forEach((productBuckets, product) => {
    let numerator = 0;
    let denominator = 0;
    let targetDays: number | undefined;
    const pathways: MAFirPathway[] = [];

    PATHWAY_ORDER.forEach((code) => {
      const lane = productBuckets.get(code);
      if (!lane || lane.denominator <= 0) return;
      numerator += lane.numerator;
      denominator += lane.denominator;
      if (lane.targetDays != null) targetDays = lane.targetDays;
      pathways.push({
        code,
        label: PATHWAY_LABEL[code],
        numerator: lane.numerator,
        denominator: lane.denominator,
        percentage: percentage(lane.numerator, lane.denominator),
      });
    });

    if (denominator <= 0) return;
    byProduct[product] = {
      numerator,
      denominator,
      percentage: percentage(numerator, denominator),
      targetDays,
      pathways,
    };
  });

  if (acceptedRows === 0) {
    warnings.push({
      code: "EMPTY_RESULT",
      message: "No FIR rows were accepted.",
    });
  }

  return {
    byProduct,
    warnings,
    totals: { totalRows: rows.length, acceptedRows },
  };
}
