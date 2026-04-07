import type { KPIDimensionView, KPIDrillDownData } from "@/types/ma-drilldown";
import type { MAApiDrilldownRow } from "@/types/ma-api";

const KPI1_ID = "MA-KPI-1";
const KPI1_NAME = "Percentage of New MA Applications Completed Within Timeline";
const KPI2_ID = "MA-KPI-2";
const KPI2_NAME = "Percentage of Renewal MA Applications Completed Within Timeline";
const NEW_APPLICATION_PREFIX = /^new application\s*-\s*/i;

const CATEGORY_LABEL_ORDER = [
  "Application type",
  "Internal regulatory pathway",
  "Reliance pathway",
  "Processing time band",
  "Regulatory outcome",
];

/** Dropped from the modal: duplicates Application type in the source data. */
const EXCLUDED_CATEGORY_LABELS = new Set(["ma type"]);

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

  // Business rule: remove "New Application -" prefix where it causes duplicates.
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

export function buildMAKpi1DrilldownData(
  rows: MAApiDrilldownRow[],
  fallback?: KPIDrillDownData
): KPIDrillDownData {
  return buildMAKpiDrilldownData(rows, "NMR", KPI1_ID, KPI1_NAME, fallback);
}

export function buildMAKpi2DrilldownData(
  rows: MAApiDrilldownRow[],
  fallback?: KPIDrillDownData
): KPIDrillDownData {
  return buildMAKpiDrilldownData(rows, "REN", KPI2_ID, KPI2_NAME, fallback);
}

function buildMAKpiDrilldownData(
  rows: MAApiDrilldownRow[],
  moduleFilter: string,
  kpiId: string,
  defaultKpiName: string,
  fallback?: KPIDrillDownData
): KPIDrillDownData {
  if (!rows.length) {
    return fallback ?? {
      kpiId,
      kpiName: defaultKpiName,
      currentValue: { value: 0, numerator: 0, denominator: 0, percentage: 0 },
      level1: { dimension: "Category", data: [], drillable: false },
      dimensionViews: [],
    };
  }

  const groupedByCategory = new Map<
    string,
    Map<
      string,
      { category: string; count: number; total: number; targetDays?: number; totalAvgDaysWeight: number }
    >
  >();

  rows.forEach((row) => {
    const moduleCode = String(row.module_code ?? "").toUpperCase();
    if (moduleCode !== moduleFilter) return;

    const categoryName = normalizeCategoryName(String(row.category_name ?? ""));
    if (EXCLUDED_CATEGORY_LABELS.has(categoryName.toLowerCase())) return;

    const categoryValue = normalizeCategoryValue(categoryName, String(row.category_value ?? ""));

    if (!groupedByCategory.has(categoryName)) {
      groupedByCategory.set(categoryName, new Map());
    }

    const valueMap = groupedByCategory.get(categoryName)!;
    const existing = valueMap.get(categoryValue) ?? {
      category: categoryValue,
      count: 0,
      total: 0,
      targetDays: undefined,
      totalAvgDaysWeight: 0,
    };

    const rowCount = Number(row.on_time_count ?? 0);
    const rowTotal = Number(row.total_count ?? 0);
    const avgDays = typeof row.avg_processing_days === "number" ? row.avg_processing_days : null;

    existing.count += Number.isFinite(rowCount) ? rowCount : 0;
    existing.total += Number.isFinite(rowTotal) ? rowTotal : 0;
    if (typeof row.target_days === "number" && Number.isFinite(row.target_days)) {
      existing.targetDays = row.target_days;
    }
    if (avgDays != null && Number.isFinite(avgDays) && Number.isFinite(rowTotal)) {
      existing.totalAvgDaysWeight += avgDays * rowTotal;
    }

    valueMap.set(categoryValue, existing);
  });

  const sortedCategoryLabels = Array.from(groupedByCategory.keys()).sort((a, b) => {
    const indexA = CATEGORY_LABEL_ORDER.findIndex((label) => label.toLowerCase() === a.toLowerCase());
    const indexB = CATEGORY_LABEL_ORDER.findIndex((label) => label.toLowerCase() === b.toLowerCase());
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const dimensionViews: KPIDimensionView[] = sortedCategoryLabels
    .map((categoryLabel) => {
      const items = Array.from(groupedByCategory.get(categoryLabel)?.values() ?? []);
      const normalizedItems = items
        .map((item) => {
          const percentage = item.total > 0 ? (item.count / item.total) * 100 : 0;
          return {
            category: item.category,
            value: percentage,
            count: item.count,
            total: item.total,
            percentage,
          };
        })
        .sort((a, b) => (b.total || 0) - (a.total || 0));

      return {
        id: toViewId(categoryLabel),
        label: categoryLabel,
        description: `${categoryLabel} performance split`,
        data: normalizedItems,
      };
    })
    .filter(
      (view) =>
        view.data.length > 0 && !EXCLUDED_CATEGORY_LABELS.has(view.label.toLowerCase())
    );

  const anchorView =
    dimensionViews.find((view) => view.label.toLowerCase() === "application type") ??
    dimensionViews[0];

  const numerator = anchorView?.data.reduce((sum, item) => sum + (item.count ?? 0), 0) ?? 0;
  const denominator = anchorView?.data.reduce((sum, item) => sum + (item.total ?? 0), 0) ?? 0;
  const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;

  return {
    ...(fallback ?? {}),
    kpiId,
    kpiName: fallback?.kpiName ?? defaultKpiName,
    currentValue: {
      value: percentage,
      numerator,
      denominator,
      percentage,
    },
    level1: anchorView
      ? {
          dimension: anchorView.label,
          data: anchorView.data,
          drillable: false,
        }
      : {
          dimension: "Category",
          data: [],
          drillable: false,
        },
    dimensionViews,
    // Drill content for KPI 1 is represented through dimension views.
    level2: undefined,
    level3: undefined,
    level4: undefined,
  };
}
