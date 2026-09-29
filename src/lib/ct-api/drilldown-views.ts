import { ctKpiSeed } from "@/data/ct-kpi-seed";
import type { CTDrilldownRow, CTKPIId } from "@/types/ct-api";
import type { DrillDownItem, KPIDimensionView, KPIDrillDownData } from "@/types/ma-drilldown";

export type CTExplorerKind = "rate" | "days" | "count";
export type CTChartMode = "volume" | "days";

export interface CTExplorerModel {
  data: KPIDrillDownData;
  chartByViewId: Partial<Record<string, CTChartMode>>;
  kind: CTExplorerKind;
  summary: string;
  volumeLabel: string;
  dateBasis: string;
  targetText: string;
}

const POSITIVE: Partial<Record<CTKPIId, string>> = {
  "CT-KPI-1": "On time",
  "CT-KPI-2": "On time",
  "CT-KPI-4": "On time",
  "CT-KPI-5": "Compliant",
  "CT-KPI-7": "On time",
  "CT-KPI-9": "Evaluated",
  "CT-KPI-10": "Measure",
  "CT-KPI-11": "Assessed",
};

const DATE_FIELD: Partial<Record<CTKPIId, string>> = {
  "CT-KPI-1": "received_date",
  "CT-KPI-2": "received_date",
  "CT-KPI-3": "inspection_date",
  "CT-KPI-4": "received_date",
  "CT-KPI-7": "capa_received",
  "CT-KPI-8": "decision_date",
  "CT-KPI-9": "received_date",
  "CT-KPI-10": "outcome_date",
  "CT-KPI-11": "received_date",
};

const DAYS_FIELD: Partial<Record<CTKPIId, string>> = {
  "CT-KPI-1": "regulatory_days",
  "CT-KPI-2": "regulatory_days",
  "CT-KPI-4": "assessment_days",
  "CT-KPI-7": "evaluation_days",
  "CT-KPI-8": "regulatory_days",
};

const SUMMARIES: Partial<Record<CTKPIId, string>> = {
  "CT-KPI-1": "Percentage means approved new applications decided within the day target, divided by approved new applications in the period. The selected received dates define which applications enter.",
  "CT-KPI-2": "Percentage means approved amendments decided within the day target, divided by approved amendments in the period. The selected received dates define which amendments enter.",
  "CT-KPI-3": "These charts count inspections completed in the period. The card divides that count by the planned inspection count, which is not a row in this list.",
  "CT-KPI-4": "Percentage means safety reports assessed within their report-type day target, divided by safety reports received in the period. Pending reports count as not on time.",
  "CT-KPI-5": "Percentage means inspections with a compliant final outcome, divided by inspections with a final GCP outcome in the period.",
  "CT-KPI-7": "Percentage means CAPA plans with a final decision within the day target, divided by CAPA plans received in the period. Pending plans count as not on time.",
  "CT-KPI-8": "Average means total regulatory days divided by decided new applications in the period. Lower than the baseline is better.",
  "CT-KPI-9": "Percentage means amendments with a final decision, divided by amendments received in the period. Pending amendments count as not evaluated.",
  "CT-KPI-10": "The headline counts distinct trials with a site-termination recommendation, divided by distinct trials with an outcome in the period. Charts split the outcome rows behind those trials.",
  "CT-KPI-11": "Percentage means safety reports with an assessment outcome, divided by safety reports received in the period. Pending reports count as not assessed.",
};

const DATE_BASIS: Partial<Record<CTKPIId, string>> = {
  "CT-KPI-1": "Filtered by received date",
  "CT-KPI-2": "Filtered by received date",
  "CT-KPI-3": "Filtered by inspection date",
  "CT-KPI-4": "Filtered by received date",
  "CT-KPI-5": "Filtered by the selected period",
  "CT-KPI-7": "Filtered by CAPA received date",
  "CT-KPI-8": "Filtered by decision date",
  "CT-KPI-9": "Filtered by received date",
  "CT-KPI-10": "Filtered by outcome date",
  "CT-KPI-11": "Filtered by received date",
};

const VOLUME_LABEL: Partial<Record<CTKPIId, string>> = {
  "CT-KPI-3": "Inspections",
  "CT-KPI-5": "Compliant volume",
  "CT-KPI-8": "Applications",
  "CT-KPI-9": "Evaluated volume",
  "CT-KPI-10": "Trials",
  "CT-KPI-11": "Assessed volume",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RESULT_ORDER = ["On time", "Late", "Pending", "Compliant", "Not compliant", "Evaluated", "Assessed", "Measure", "Other outcome"];
const BANDS = ["0–30 days", "31–60 days", "61–90 days", "91–180 days", "Over 180 days", "Missing time"];

interface Bucket {
  label: string;
  sort: string;
  on: number;
  total: number;
  daySum: number;
  dayCount: number;
  targets: Set<number>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(row: CTDrilldownRow, key: string): string {
  const value = row[key];
  if (value == null || value === "") return "";
  return String(value).trim();
}

function period(value: unknown, grain: "month" | "quarter"): { key: string; label: string } | null {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  if (grain === "month") {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    return { key, label: `${MONTHS[month - 1]} ${year}` };
  }
  const quarter = Math.floor((month - 1) / 3) + 1;
  return { key: `${year}-Q${quarter}`, label: `Q${quarter} ${year}` };
}

function band(days: number | null): string {
  if (days == null || days < 0) return "Missing time";
  if (days <= 30) return "0–30 days";
  if (days <= 60) return "31–60 days";
  if (days <= 90) return "61–90 days";
  if (days <= 180) return "91–180 days";
  return "Over 180 days";
}

function viewId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function emptyBucket(label: string, sort: string): Bucket {
  return { label, sort, on: 0, total: 0, daySum: 0, dayCount: 0, targets: new Set() };
}

function add(map: Map<string, Bucket>, key: string, label: string, sort: string, positive: boolean, days: number | null, target: number | null) {
  const bucket = map.get(key) ?? emptyBucket(label, sort);
  bucket.total += 1;
  if (positive) bucket.on += 1;
  if (days != null) {
    bucket.daySum += days;
    bucket.dayCount += 1;
  }
  if (target != null) bucket.targets.add(target);
  map.set(key, bucket);
}

function targetOf(bucket: Bucket): number | undefined {
  return bucket.targets.size === 1 ? [...bucket.targets][0] : undefined;
}

function sorted(map: Map<string, Bucket>, order?: string[]): Bucket[] {
  return [...map.values()].sort((a, b) => {
    if (order) {
      const ai = order.indexOf(a.label);
      const bi = order.indexOf(b.label);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
    }
    return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : a.label.localeCompare(b.label);
  });
}

function rateItems(buckets: Bucket[]): DrillDownItem[] {
  return buckets.map((bucket) => {
    const percentage = bucket.total > 0 ? (bucket.on / bucket.total) * 100 : 0;
    return {
      category: bucket.label,
      value: percentage,
      count: bucket.on,
      total: bucket.total,
      percentage,
      targetDays: targetOf(bucket),
    };
  });
}

function volumeItems(buckets: Bucket[]): DrillDownItem[] {
  return buckets.map((bucket) => ({
    category: bucket.label,
    value: bucket.total,
    count: bucket.total,
    total: bucket.total,
  }));
}

function dayItems(buckets: Bucket[], baseline?: number): DrillDownItem[] {
  return buckets.map((bucket) => {
    const average = bucket.dayCount > 0 ? bucket.daySum / bucket.dayCount : 0;
    return {
      category: bucket.label,
      value: average,
      count: bucket.total,
      total: bucket.total,
      percentage: average,
      targetDays: targetOf(bucket) ?? baseline,
    };
  });
}

function uniqueTargets(rows: CTDrilldownRow[]): number[] {
  return [...new Set(rows.map((row) => asNumber(row.target_days)).filter((value): value is number => value != null))];
}

export function buildCTExplorer(kpiId: string, rows: CTDrilldownRow[]): CTExplorerModel {
  const id = kpiId as CTKPIId;
  const card = ctKpiSeed.cards.find((item) => item.drilldownId === id);
  const kind: CTExplorerKind = id === "CT-KPI-8" ? "days" : id === "CT-KPI-3" ? "count" : "rate";
  const positiveResult = POSITIVE[id];
  const dateField = DATE_FIELD[id];
  const daysField = DAYS_FIELD[id];
  const isPositive = (row: CTDrilldownRow) => positiveResult != null && text(row, "result") === positiveResult;

  const views: KPIDimensionView[] = [];
  const chartByViewId: Partial<Record<string, CTChartMode>> = {};

  const push = (label: string, data: DrillDownItem[], chart?: CTChartMode) => {
    if (!data.length) return;
    const view = { id: viewId(label), label, description: `${label} performance split`, data };
    views.push(view);
    if (chart) chartByViewId[view.id] = chart;
  };

  const collect = (keyOf: (row: CTDrilldownRow) => { key: string; label: string; sort: string } | null) => {
    const map = new Map<string, Bucket>();
    for (const row of rows) {
      const group = keyOf(row);
      if (!group) continue;
      add(map, group.key, group.label, group.sort, isPositive(row), daysField ? asNumber(row[daysField]) : null, asNumber(row.target_days));
    }
    return map;
  };

  if (dateField) {
    const months = collect((row) => {
      const value = period(row[dateField], "month");
      return value ? { key: value.key, label: value.label, sort: value.key } : null;
    });
    const quarters = collect((row) => {
      const value = period(row[dateField], "quarter");
      return value ? { key: value.key, label: value.label, sort: value.key } : null;
    });
    if (kind === "days") {
      push("By month", dayItems(sorted(months), card?.targetDays), "days");
      push("By quarter", dayItems(sorted(quarters), card?.targetDays), "days");
    } else if (kind === "count") {
      push("By month", volumeItems(sorted(months)), "volume");
      push("By quarter", volumeItems(sorted(quarters)), "volume");
    } else {
      push("By month", rateItems(sorted(months)));
      push("By quarter", rateItems(sorted(quarters)));
    }
  }

  if (daysField) {
    const bands = collect((row) => {
      const label = band(asNumber(row[daysField]));
      return { key: label, label, sort: String(BANDS.indexOf(label)).padStart(2, "0") };
    });
    const ordered = sorted(bands, BANDS).filter((bucket) => bucket.total > 0);
    if (kind === "days") push("Processing time band", volumeItems(ordered), "volume");
    else push("Processing time band", rateItems(ordered));
  }

  const group = (field: string, label: string, chart?: CTChartMode) => {
    const map = collect((row) => {
      const value = text(row, field);
      if (!value) return null;
      return { key: value, label: value, sort: value.toLowerCase() };
    });
    const buckets = [...map.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
    if (chart === "days") push(label, dayItems(buckets, card?.targetDays), "days");
    else if (chart === "volume" || kind === "count") push(label, volumeItems(buckets), "volume");
    else push(label, rateItems(buckets));
  };

  if (id === "CT-KPI-4" || id === "CT-KPI-11") group("report_type", "Report type");
  if (id === "CT-KPI-3") group("gcp_mode", "GCP mode", "volume");
  if (id === "CT-KPI-5") group("outcome_code", "Outcome");
  if (id === "CT-KPI-8") group("status", "Status", "days");
  if (id === "CT-KPI-9") group("status", "Status");
  if (id === "CT-KPI-10") {
    group("outcome_family", "Outcome type");
    group("outcome_code", "Outcome", "volume");
  }
  if (id === "CT-KPI-11") group("outcome", "Outcome", "volume");

  const results = collect((row) => {
    const value = text(row, "result");
    if (!value) return null;
    return { key: value, label: value, sort: value.toLowerCase() };
  });
  if (kind !== "days" && kind !== "count") {
    push("Result mix", volumeItems(sorted(results, RESULT_ORDER)), "volume");
  }

  let numerator = 0;
  let denominator = rows.length;
  let percentage: number | undefined;
  let average: number | undefined;
  if (id === "CT-KPI-10") {
    const trials = new Map<string, boolean>();
    rows.forEach((row, index) => {
      const key = text(row, "application_number") || `row-${index}`;
      trials.set(key, (trials.get(key) ?? false) || isPositive(row));
    });
    numerator = [...trials.values()].filter(Boolean).length;
    denominator = trials.size;
    percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
  } else if (kind === "days") {
    const days = rows.map((row) => asNumber(row.regulatory_days)).filter((value): value is number => value != null);
    const totalDays = days.reduce((sum, value) => sum + value, 0);
    numerator = days.length;
    denominator = days.length;
    average = days.length > 0 ? totalDays / days.length : 0;
  } else if (kind === "count") {
    numerator = rows.length;
    denominator = rows.length;
  } else {
    numerator = rows.filter(isPositive).length;
    percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
  }

  const targets = uniqueTargets(rows);
  const targetDays = kind === "days" ? card?.targetDays : targets.length === 1 ? targets[0] : undefined;
  const targetText = kind === "days"
    ? `${targetDays ?? "—"} days`
    : kind === "count"
      ? "On the card"
      : targets.length > 1
        ? "90% · mixed SLAs"
        : `90%${targetDays != null ? ` · ${targetDays} days` : ""}`;

  const data: KPIDrillDownData = {
    kpiId,
    kpiName: card?.title ?? "Clinical trial indicator",
    currentValue: {
      value: average ?? percentage ?? numerator,
      numerator,
      denominator,
      percentage,
      average,
      targetDays,
    },
    dimensionViews: views,
  };

  return {
    data,
    chartByViewId,
    kind,
    summary: SUMMARIES[id] ?? "Breakdown of the cases behind this indicator for the selected period.",
    volumeLabel: VOLUME_LABEL[id] ?? "On-time volume",
    dateBasis: DATE_BASIS[id] ?? "Filtered by the selected period",
    targetText,
  };
}
