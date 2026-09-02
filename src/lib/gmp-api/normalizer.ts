import type { GMPApiRow, GMPFaceMetric, GMPFaceSegment, GMPKPIId, GMPReportResult } from "@/types/gmp-api";

const numberValue = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const unitFor = (kpiId: GMPKPIId): "%" | "days" =>
  kpiId === "GMP-KPI-7" || kpiId === "GMP-KPI-8" ? "days" : "%";

const displayRows = (report: GMPReportResult): GMPApiRow[] => {
  const overall = report.rows.filter((row) => String(row.category_name ?? "").toLowerCase() === "overall");
  if (overall.length) return overall;
  const stages = report.rows.filter((row) => String(row.category_name ?? "").toLowerCase() === "stage");
  return stages.length ? stages : report.rows.slice(0, 1);
};

const segmentValue = (kpiId: GMPKPIId, row: GMPApiRow): number | undefined => {
  if (kpiId === "GMP-KPI-7") return numberValue(row.average_days);
  if (kpiId === "GMP-KPI-8") return numberValue(row.median_days);
  return numberValue(row.percentage);
};

const shortLabel = (report: GMPReportResult, row: GMPApiRow, multipleRows: boolean): string => {
  const base = report.label
    .replace(" planned inspections", "")
    .replace(" facility compliance", "")
    .replace(" applications completed", " completed")
    .replace(" turnaround", "")
    .replace(" publication report", "");
  return multipleRows ? `${base} · ${String(row.category_value ?? "Result")}` : base;
};

function reportSegments(kpiId: GMPKPIId, report: GMPReportResult): GMPFaceSegment[] {
  const unit = unitFor(kpiId);
  if (report.error) return [{ id: String(report.reportId), label: report.label, unit, state: "work-in-progress" }];
  const rows = displayRows(report);
  if (!rows.length) return [{ id: String(report.reportId), label: report.label, unit, state: "work-in-progress" }];
  return rows.map((row, index) => {
    const value = segmentValue(kpiId, row);
    return {
      id: `${report.reportId}-${index}`,
      label: shortLabel(report, row, rows.length > 1 || String(row.category_name ?? "").toLowerCase() === "stage"),
      value,
      unit,
      numerator: numberValue(row.numerator) ?? numberValue(row.on_time_count) ?? numberValue(row.sum_efda_days),
      denominator: numberValue(row.denominator) ?? numberValue(row.total_count) ?? numberValue(row.completed_count),
      state: value === undefined ? "work-in-progress" : "live",
    };
  });
}

export function normalizeGMPFaceMetric(kpiId: GMPKPIId, reports: GMPReportResult[]): GMPFaceMetric {
  const unit = unitFor(kpiId);
  const segments = reports.flatMap((report) => reportSegments(kpiId, report));
  if (!reports.length) {
    return { kpiId, state: "work-in-progress", unit, reports, segments, note: "Work in progress" };
  }
  const liveSegments = segments.filter((segment) => segment.state === "live");
  if (!liveSegments.length) {
    return { kpiId, state: "work-in-progress", unit, reports, segments, note: "No data found for the selected period" };
  }
  const single = liveSegments.length === 1 ? liveSegments[0] : undefined;
  return {
    kpiId,
    state: "live",
    unit,
    value: single?.value,
    valueLabel: single ? undefined : `${liveSegments.length} results`,
    numerator: single?.numerator,
    denominator: single?.denominator,
    reports,
    segments,
  };
}
