import { clinicalTrialKPIData } from "@/data/clinical-trial-dummy-data";
import type { CTKPIId } from "@/types/ct-api";

export interface CTKpiSeedItem {
  id: string;
  title: string;
  description: string;
  value: number;
  numerator: number;
  denominator: number;
  suffix: "%" | " days";
  decimals: number;
  drilldownId: CTKPIId;
  /** Strict face APIs: KPI had no usable row (show empty state). */
  faceDataMissing?: boolean;
  /** Policy: KPI not tracked (show N/A empty state instead of dummy metrics). */
  notApplicableReason?: string;
}

export interface CTKpiSeed {
  summaryTitle: string;
  summaryDescription: string;
  cards: CTKpiSeedItem[];
}

const d = clinicalTrialKPIData;

export const ctKpiSeed: CTKpiSeed = {
  summaryTitle: "Clinical Trial performance",
  summaryDescription: "On-time evaluation rate",
  cards: [
    {
      id: "CT-1",
      title: "New CT Applications on Time",
      description: "New CT apps evaluated within 90 days",
      value: d.kpi1.percentage,
      numerator: d.kpi1.numerator,
      denominator: d.kpi1.denominator,
      suffix: "%",
      decimals: 1,
      drilldownId: "CT-KPI-1",
    },
    {
      id: "CT-2",
      title: "CT Amendments on Time",
      description: "Amendments evaluated within 60 days",
      value: d.kpi2.percentage,
      numerator: d.kpi2.numerator,
      denominator: d.kpi2.denominator,
      suffix: "%",
      decimals: 1,
      drilldownId: "CT-KPI-2",
    },
    {
      id: "CT-3",
      title: "GCP Inspections Completed",
      description: "Approved & ongoing CTs inspected per GCP plan",
      value: d.kpi3.percentage,
      numerator: d.kpi3.numerator,
      denominator: d.kpi3.denominator,
      suffix: "%",
      decimals: 1,
      drilldownId: "CT-KPI-3",
    },
    {
      id: "CT-4",
      title: "Safety Reports on Time",
      description: "Field & safety reports assessed within timeline",
      value: d.kpi4.percentage,
      numerator: d.kpi4.numerator,
      denominator: d.kpi4.denominator,
      suffix: "%",
      decimals: 1,
      drilldownId: "CT-KPI-4",
    },
    {
      id: "CT-5",
      title: "GCP Compliance Rate",
      description: "Clinical trials compliant with GCP requirements",
      value: d.kpi5.percentage,
      numerator: d.kpi5.numerator,
      denominator: d.kpi5.denominator,
      suffix: "%",
      decimals: 1,
      drilldownId: "CT-KPI-5",
    },
    {
      id: "CT-6",
      title: "National Registry Listing",
      description: "Approved CTs listed in national registry",
      value: d.kpi6.percentage,
      numerator: d.kpi6.numerator,
      denominator: d.kpi6.denominator,
      suffix: "%",
      decimals: 1,
      drilldownId: "CT-KPI-6",
    },
    {
      id: "CT-7",
      title: "CAPA Evaluated on Time",
      description: "CAPA evaluated within specified timeline",
      value: d.kpi7.percentage,
      numerator: d.kpi7.numerator,
      denominator: d.kpi7.denominator,
      suffix: "%",
      decimals: 1,
      drilldownId: "CT-KPI-7",
    },
    {
      id: "CT-8",
      title: "Average Turnaround Time",
      description: "Average days to complete CT evaluation",
      value: d.kpi8.averageDays,
      numerator: d.kpi8.numerator,
      denominator: d.kpi8.denominator,
      suffix: " days",
      decimals: 1,
      drilldownId: "CT-KPI-8",
    },
  ],
};
