export type ChartType = "column" | "bar" | "line" | "area" | "dot" | "lollipop" | "radar" | "pie" | "doughnut";

export interface ChartDatum {
  name: string;
  value: number | null | undefined;
  color?: string;
}

export const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "column", label: "Column" },
  { id: "bar", label: "Bar" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "dot", label: "Dot plot" },
  { id: "lollipop", label: "Lollipop" },
  { id: "radar", label: "Radar" },
  { id: "pie", label: "Pie" },
  { id: "doughnut", label: "Doughnut" },
];

export function chartUnavailableReason(type: ChartType, data: ChartDatum[], options: { ordered?: boolean; additive?: boolean } = {}): string | undefined {
  const values = data.flatMap(row => typeof row.value === "number" && Number.isFinite(row.value) ? [row.value] : []);
  if (!values.length) return "No numeric data is available for the current selection.";
  if (type === "line" || type === "area") {
    if (!options.ordered) return "Requires ordered categories or dates.";
    if (values.length < 2) return "Requires at least two reported values.";
  }
  if (type === "radar" && values.length < 3) return "Requires at least three reported categories.";
  if (type === "pie" || type === "doughnut") {
    if (!options.additive) return "Requires parts of a whole. Rates and processing times cannot be added.";
    if (values.length !== data.length) return "Requires a reported value for every category.";
    if (values.some(value => value < 0) || values.every(value => value === 0)) return "Requires non-negative values with a total greater than zero.";
  }
  if ((type === "radar" || type === "area") && values.some(value => value < 0)) return "Requires non-negative values.";
  return undefined;
}
