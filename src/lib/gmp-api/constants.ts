import type { GMPKPIId } from "@/types/gmp-api";

export const GMP_FACE_REPORTS: Record<GMPKPIId, readonly number[]> = {
  "GMP-KPI-1": [121, 122, 151, 123],
  "GMP-KPI-2": [],
  "GMP-KPI-3": [124, 125],
  "GMP-KPI-4": [126],
  "GMP-KPI-5": [129],
  "GMP-KPI-6": [131, 133, 136],
  "GMP-KPI-7": [139, 141],
  "GMP-KPI-8": [143, 145],
  "GMP-KPI-9": [147, 148],
};

export const GMP_DRILLDOWN_REPORTS: Record<GMPKPIId, readonly number[]> = {
  "GMP-KPI-1": [152, 153],
  "GMP-KPI-2": [],
  "GMP-KPI-3": [154],
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
  126: "Facilities compliant with GMP",
  127: "Compliant details · Local",
  128: "Compliant details · Abroad",
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
};

export const GMP_KPI_IDS = Object.keys(GMP_FACE_REPORTS) as GMPKPIId[];
