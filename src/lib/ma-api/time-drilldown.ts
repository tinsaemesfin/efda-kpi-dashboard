import { resolveMAModuleCode } from "@/lib/ma-api/normalizer";
import type {
  MATimeDrillDownCategoryView,
  MATimeDrillDownData,
  MATimeDrillDownItem,
} from "@/types/ma-drilldown";
import type { MAApiAverageDrilldownRow, MAApiMedianDrilldownRow } from "@/types/ma-api";

const KPI6_ID = "MA-KPI-6" as const;
const KPI6_NAME = "Median Time for New MA Applications";
const KPI7_ID = "MA-KPI-7" as const;
const KPI7_NAME = "Average Time for New MA Applications";

const CATEGORY_LABEL_ORDER = [
  "Application type",
  "Internal regulatory pathway",
  "Reliance pathway",
  "Decision time band",
  "Regulatory outcome",
];

const EXCLUDED_CATEGORY_LABELS = new Set(["ma type"]);
const NEW_APPLICATION_PREFIX = /^new application\s*-\s*/i;

const DECISION_BAND_ORDER = [
  "0-30 days",
  "31-90 days",
  "91-180 days",
  "181-270 days",
  "271-540 days",
  "over 540 days",
];

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeCategoryName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  const matched = CATEGORY_LABEL_ORDER.find(
    (label) => label.toLowerCase() === cleaned.toLowerCase()
  );
  return matched ?? toTitleCase(cleaned);
}

function normalizeCategoryValue(categoryName: string, categoryValue: string): string {
  let cleaned = categoryValue.trim().replace(/\s+/g, " ");
  const lowerName = categoryName.toLowerCase();

  if (
    lowerName === "application type" ||
    lowerName === "internal regulatory pathway"
  ) {
    cleaned = cleaned.replace(NEW_APPLICATION_PREFIX, "");
  }

  cleaned = cleaned.replace(/^\-\s*/, "").trim();
  return cleaned || "Unknown";
}

function toViewId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toFiniteNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function sortCategoryItems(label: string, items: MATimeDrillDownItem[]): MATimeDrillDownItem[] {
  if (label.toLowerCase() === "decision time band") {
    return [...items].sort((a, b) => {
      const indexA = DECISION_BAND_ORDER.findIndex(
        (band) => band.toLowerCase() === a.category.toLowerCase()
      );
      const indexB = DECISION_BAND_ORDER.findIndex(
        (band) => band.toLowerCase() === b.category.toLowerCase()
      );
      if (indexA === -1 && indexB === -1) return a.category.localeCompare(b.category);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  return [...items].sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0));
}

function buildCategoryViews(
  grouped: Map<string, Map<string, MATimeDrillDownItem>>
): MATimeDrillDownCategoryView[] {
  const sortedCategoryLabels = Array.from(grouped.keys()).sort((a, b) => {
    const indexA = CATEGORY_LABEL_ORDER.findIndex((label) => label.toLowerCase() === a.toLowerCase());
    const indexB = CATEGORY_LABEL_ORDER.findIndex((label) => label.toLowerCase() === b.toLowerCase());
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return sortedCategoryLabels
    .map((categoryLabel) => {
      const items = Array.from(grouped.get(categoryLabel)?.values() ?? []);
      return {
        id: toViewId(categoryLabel),
        label: categoryLabel,
        description: `${categoryLabel} decision time breakdown`,
        items: sortCategoryItems(categoryLabel, items),
      };
    })
    .filter(
      (view) =>
        view.items.length > 0 && !EXCLUDED_CATEGORY_LABELS.has(view.label.toLowerCase())
    );
}

function buildEmptyTimeDrilldown(
  kpiId: "MA-KPI-6" | "MA-KPI-7",
  kpiName: string,
  metricType: "median" | "average",
  fallback?: MATimeDrillDownData
): MATimeDrillDownData {
  return {
    ...(fallback ?? {}),
    kpiId,
    kpiName: fallback?.kpiName ?? kpiName,
    metricType,
    currentValue: fallback?.currentValue ?? { value: 0 },
    categoryViews: [],
  };
}

export function buildMAKpi6DrilldownData(
  rows: MAApiMedianDrilldownRow[],
  fallback?: MATimeDrillDownData
): MATimeDrillDownData {
  if (!rows.length) {
    return buildEmptyTimeDrilldown(KPI6_ID, KPI6_NAME, "median", fallback);
  }

  const grouped = new Map<string, Map<string, MATimeDrillDownItem>>();

  rows.forEach((row) => {
    const moduleCode = resolveMAModuleCode(String(row.module_code ?? ""));
    if (moduleCode !== "NMR") return;

    const categoryName = normalizeCategoryName(String(row.category_name ?? ""));
    if (EXCLUDED_CATEGORY_LABELS.has(categoryName.toLowerCase())) return;

    const categoryValue = normalizeCategoryValue(categoryName, String(row.category_value ?? ""));
    if (!grouped.has(categoryName)) grouped.set(categoryName, new Map());

    const valueMap = grouped.get(categoryName)!;
    const existing = valueMap.get(categoryValue) ?? {
      category: categoryValue,
      targetDays: 270,
      onTimeCount: 0,
      totalCount: 0,
      percentage: 0,
      decisionDays: null,
      p25Days: null,
      p75Days: null,
      p90Days: null,
      iqrDays: null,
      meanMedianSkewDays: null,
    };

    existing.onTimeCount += toFiniteNumber(row.on_time_count) ?? 0;
    existing.totalCount += toFiniteNumber(row.total_count) ?? 0;
    existing.percentage = existing.totalCount > 0
      ? (existing.onTimeCount / existing.totalCount) * 100
      : 0;

    const targetDays = toFiniteNumber(row.target_days);
    if (targetDays != null) existing.targetDays = targetDays;

    const medianDays = toFiniteNumber(row.median_decision_days);
    if (medianDays != null) existing.decisionDays = medianDays;

    const p25 = toFiniteNumber(row.p25_days);
    if (p25 != null) existing.p25Days = p25;
    const p75 = toFiniteNumber(row.p75_days);
    if (p75 != null) existing.p75Days = p75;
    const p90 = toFiniteNumber(row.p90_days);
    if (p90 != null) existing.p90Days = p90;
    const iqr = toFiniteNumber(row.iqr_days);
    if (iqr != null) existing.iqrDays = iqr;
    const skew = toFiniteNumber(row.mean_median_skew_days);
    if (skew != null) existing.meanMedianSkewDays = skew;

    valueMap.set(categoryValue, existing);
  });

  const categoryViews = buildCategoryViews(grouped);
  const anchorView =
    categoryViews.find((view) => view.label.toLowerCase() === "application type") ??
    categoryViews[0];

  const medianValue =
    anchorView?.items.find((item) => item.decisionDays != null)?.decisionDays ??
    fallback?.currentValue.median ??
    fallback?.currentValue.value ??
    0;

  const targetDays =
    anchorView?.items.find((item) => item.targetDays > 0)?.targetDays ??
    fallback?.currentValue.targetDays ??
    270;

  return {
    ...(fallback ?? {}),
    kpiId: KPI6_ID,
    kpiName: fallback?.kpiName ?? KPI6_NAME,
    metricType: "median",
    currentValue: {
      value: medianValue,
      median: medianValue,
      targetDays,
    },
    categoryViews,
  };
}

export function buildMAKpi7DrilldownData(
  rows: MAApiAverageDrilldownRow[],
  fallback?: MATimeDrillDownData
): MATimeDrillDownData {
  if (!rows.length) {
    return buildEmptyTimeDrilldown(KPI7_ID, KPI7_NAME, "average", fallback);
  }

  const grouped = new Map<string, Map<string, MATimeDrillDownItem>>();

  rows.forEach((row) => {
    const moduleCode = resolveMAModuleCode(String(row.module_code ?? ""));
    if (moduleCode !== "NMR") return;

    const categoryName = normalizeCategoryName(String(row.category_name ?? ""));
    if (EXCLUDED_CATEGORY_LABELS.has(categoryName.toLowerCase())) return;

    const categoryValue = normalizeCategoryValue(categoryName, String(row.category_value ?? ""));
    if (!grouped.has(categoryName)) grouped.set(categoryName, new Map());

    const valueMap = grouped.get(categoryName)!;
    const existing = valueMap.get(categoryValue) ?? {
      category: categoryValue,
      targetDays: 270,
      onTimeCount: 0,
      totalCount: 0,
      percentage: 0,
      decisionDays: null,
      maxDecisionDays: null,
      extremeOutlierCount: null,
      extremeOutlierPct: null,
    };

    existing.onTimeCount += toFiniteNumber(row.on_time_count) ?? 0;
    existing.totalCount += toFiniteNumber(row.total_count) ?? 0;
    existing.percentage = existing.totalCount > 0
      ? (existing.onTimeCount / existing.totalCount) * 100
      : toFiniteNumber(row.percentage) ?? 0;

    const targetDays = toFiniteNumber(row.target_days);
    if (targetDays != null) existing.targetDays = targetDays;

    const avgDays = toFiniteNumber(row.avg_decision_days);
    if (avgDays != null) existing.decisionDays = avgDays;

    const maxDays = toFiniteNumber(row.max_decision_days);
    if (maxDays != null) existing.maxDecisionDays = maxDays;

    const outlierCount = toFiniteNumber(row.extreme_outlier_count);
    if (outlierCount != null) existing.extremeOutlierCount = outlierCount;

    const outlierPct = toFiniteNumber(row.extreme_outlier_pct);
    if (outlierPct != null) existing.extremeOutlierPct = outlierPct;

    valueMap.set(categoryValue, existing);
  });

  const categoryViews = buildCategoryViews(grouped);
  const anchorView =
    categoryViews.find((view) => view.label.toLowerCase() === "application type") ??
    categoryViews[0];

  const averageValue =
    anchorView?.items.find((item) => item.decisionDays != null)?.decisionDays ??
    fallback?.currentValue.average ??
    fallback?.currentValue.value ??
    0;

  const targetDays =
    anchorView?.items.find((item) => item.targetDays > 0)?.targetDays ??
    fallback?.currentValue.targetDays ??
    270;

  return {
    ...(fallback ?? {}),
    kpiId: KPI7_ID,
    kpiName: fallback?.kpiName ?? KPI7_NAME,
    metricType: "average",
    currentValue: {
      value: averageValue,
      average: averageValue,
      targetDays,
    },
    categoryViews,
  };
}
