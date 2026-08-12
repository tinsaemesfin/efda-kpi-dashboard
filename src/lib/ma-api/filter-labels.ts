import type { MAApiFilterParams } from "@/types/ma-api";

function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Read-only chip labels mirroring main-page date filters (no drilldown editing). */
export function getMAApiFilterChipLabels(filters?: MAApiFilterParams): string[] {
  if (!filters) return [];

  const labels: string[] = [];

  if (filters.startDate && filters.endDate) {
    labels.push(`${formatIsoDate(filters.startDate)} – ${formatIsoDate(filters.endDate)}`);
  } else if (filters.startDate) {
    labels.push(`From ${formatIsoDate(filters.startDate)}`);
  } else if (filters.endDate) {
    labels.push(`To ${formatIsoDate(filters.endDate)}`);
  }

  if (filters.quarter && filters.year != null) {
    labels.push(`${filters.quarter} ${filters.year}`);
  } else if (filters.year != null) {
    labels.push(String(filters.year));
  }

  return labels;
}
