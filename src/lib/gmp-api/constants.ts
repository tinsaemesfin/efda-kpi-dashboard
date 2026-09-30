import type { GMPKPIId } from "@/types/gmp-api";

export const GMP_FACE_REPORTS: Record<GMPKPIId, readonly number[]> = {
  "GMP-KPI-1": [121, 122],
  "GMP-KPI-2": [],
  "GMP-KPI-3": [124],
  "GMP-KPI-4": [126, 211],
  "GMP-KPI-5": [129],
  "GMP-KPI-6": [131, 133, 136],
  "GMP-KPI-7": [139, 141],
  "GMP-KPI-8": [143, 145],
  "GMP-KPI-9": [147, 148],
};

export const GMP_DRILLDOWN_REPORTS: Record<GMPKPIId, readonly number[]> = {
  "GMP-KPI-1": [135, 152, 151, 205, 153, 123],
  "GMP-KPI-2": [],
  "GMP-KPI-3": [208, 154, 125],
  "GMP-KPI-4": [127, 128],
  "GMP-KPI-5": [130],
  "GMP-KPI-6": [132, 134, 137],
  "GMP-KPI-7": [140, 142],
  "GMP-KPI-8": [144, 146],
  "GMP-KPI-9": [149, 150],
};

export const GMP_REPORT_LABELS: Record<number, string> = {
  121: "Inspected · Local",
  122: "Inspected · Abroad",
  123: "Stage timeline · Abroad",
  124: "Waived · Abroad",
  125: "Stage timeline · Abroad waiver",
  126: "Compliant · Local",
  127: "Compliant details · Local",
  128: "Compliant details · Abroad",
  135: "Inspected breakdown · Local",
  205: "Inspected breakdown · Abroad",
  208: "Waived breakdown · Abroad",
  211: "Compliant · Abroad",
  138: "Inspection records · Local",
  204: "Inspection records · Abroad",
  206: "Stage timeline records · Local",
  207: "Stage timeline records · Abroad",
  209: "Waiver records · Abroad",
  210: "Stage timeline records · Abroad waiver",
  212: "Compliance records · Local",
  213: "Compliance records · Abroad",
  214: "Average TAT records · Local",
  215: "Average TAT records · Abroad",
  129: "CAPA timeline",
  130: "CAPA evaluation details",
  131: "Completed · Local",
  132: "Completion details · Local",
  133: "Completed · Abroad",
  134: "Completion details · Abroad",
  136: "Completed · Abroad waiver",
  137: "Completion details · Abroad waiver",
  139: "Average TAT · Local",
  140: "Average TAT details · Local",
  141: "Average TAT · Abroad",
  142: "Average TAT details · Abroad",
  143: "Median TAT · Local",
  144: "Median TAT details · Local",
  145: "Median TAT · Abroad",
  146: "Median TAT details · Abroad",
  147: "Published · Local",
  148: "Published · Abroad",
  149: "Published details · Local",
  150: "Published details · Abroad",
  151: "Stage timeline · Local",
  152: "Stage timeline details · Local",
  153: "Stage timeline details · Abroad",
  154: "Stage timeline details · Abroad waiver",
  218: "Approved · Local",
  219: "Approved · Abroad",
  220: "Approved · Abroad waiver",
  224: "Assigned for inspection · Local",
  225: "Assigned for inspection · Abroad",
  237: "CAPA requested · Local",
  238: "CAPA requested · Abroad",
};

export const GMP_KPI_IDS = Object.keys(GMP_FACE_REPORTS) as GMPKPIId[];

// Explicit report chains supplied by the GMP backend team.
export const GMP_REPORT_CHAINS = [
  { face: 121, drilldown: 135, detail: 138, location: "Local" },
  { face: 121, drilldown: 152, detail: 206, location: "Local" },
  { face: 122, drilldown: 205, detail: 204, location: "Abroad" },
  { face: 122, drilldown: 153, detail: 207, location: "Abroad" },
  { face: 124, drilldown: 208, detail: 209, location: "Abroad" },
  { face: 124, drilldown: 154, detail: 210, location: "Abroad" },
  { face: 126, drilldown: 127, detail: 212, location: "Local" },
  { face: 211, drilldown: 128, detail: 213, location: "Abroad" },
  { face: 139, drilldown: 140, detail: 214, location: "Local" },
  { face: 141, drilldown: 142, detail: 215, location: "Abroad" },
] as const;

export type GMPOverviewScope = "Local" | "Abroad" | "Waiver";

// All-time overview counts shown in the page hero; not tied to the date filters.
export const GMP_OVERVIEW_GROUPS: readonly {
  id: string;
  title: string;
  caption: string;
  reports: readonly { id: number; scope: GMPOverviewScope }[];
}[] = [
  {
    id: "approved",
    title: "Approved GMP",
    caption: "Full or partial compliance certificate issued",
    reports: [{ id: 218, scope: "Local" }, { id: 219, scope: "Abroad" }, { id: 220, scope: "Waiver" }],
  },
  {
    id: "assigned",
    title: "Assigned for inspection",
    caption: "Currently in the inspection pipeline",
    reports: [{ id: 224, scope: "Local" }, { id: 225, scope: "Abroad" }],
  },
  {
    id: "capa",
    title: "CAPA requested",
    caption: "Applications that received a CAPA plan request",
    reports: [{ id: 237, scope: "Local" }, { id: 238, scope: "Abroad" }],
  },
];

export const GMP_OVERVIEW_REPORT_IDS = GMP_OVERVIEW_GROUPS.flatMap((group) => group.reports.map((report) => report.id));
