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
  /** Days target shown on the card. Ratio cards use it as the SLA; CT-8 uses it as the baseline. */
  targetDays?: number;
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

const blank = { value: 0, numerator: 0, denominator: 0, decimals: 1 as const };

export const ctKpiSeed: CTKpiSeed = {
  summaryTitle: "Clinical Trial performance",
  summaryDescription: "On-time evaluation rate",
  cards: [
    {
      id: "CT-1",
      title: "New CT Applications on Time",
      description: "Approved new applications evaluated within the target",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-1",
    },
    {
      id: "CT-2",
      title: "CT Amendments on Time",
      description: "Approved amendments evaluated within the target",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-2",
    },
    {
      id: "CT-3",
      title: "GCP Inspections Completed",
      description: "Approved trials inspected, divided by the planned inspection count",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-3",
    },
    {
      id: "CT-4",
      title: "Safety Reports on Time",
      description: "SAE and NSAE reports assessed within their timelines",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-4",
    },
    {
      id: "CT-5",
      title: "GCP Compliance Rate",
      description: "Inspected trials whose final GCP outcome is compliant",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-5",
    },
    {
      id: "CT-6",
      title: "National Registry Listing",
      description: "Approved CTs listed in the national registry",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-6",
      notApplicableReason: "National registry listing is not recorded in eRIS, so this indicator is not tracked.",
    },
    {
      id: "CT-7",
      title: "CAPA Evaluated on Time",
      description: "CAPA plans with a final decision within the target",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-7",
    },
    {
      id: "CT-8",
      title: "Average Turnaround Time",
      description: "Average regulatory days to decide a new application",
      ...blank,
      suffix: " days",
      drilldownId: "CT-KPI-8",
      targetDays: 58,
    },
    {
      id: "CT-9",
      title: "Amendments Evaluated",
      description: "Received amendments that have a final decision",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-9",
    },
    {
      id: "CT-10",
      title: "Regulatory Measures",
      description: "Trials with a site-termination recommendation among those with an outcome",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-10",
    },
    {
      id: "CT-11",
      title: "Safety Reports Assessed",
      description: "Received safety reports that have been assessed",
      ...blank,
      suffix: "%",
      drilldownId: "CT-KPI-11",
    },
  ],
};
