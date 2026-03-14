"use client";

import { Button } from "@/components/ui/button";

const CHART_OPTIONS = [
  { id: "bar", label: "Bar chart" },
  { id: "column", label: "Column chart" },
  { id: "line", label: "Line chart" },
  { id: "area", label: "Area chart" },
  { id: "pie", label: "Pie chart" },
  { id: "doughnut", label: "Doughnut" },
  { id: "scatter", label: "Scatter plot" },
  { id: "histogram", label: "Histogram" },
  { id: "groupedBar", label: "Group bar" },
  { id: "stackedBar", label: "Stacked bar" },
  { id: "dualAxis", label: "Dual-axis chart" },
  { id: "box", label: "Box plot" },
];

interface KPI1ChartSelectorProps {
  selectedChartType: string;
  onChartTypeChange: (chartType: string) => void;
}

export function KPI1ChartSelector({ selectedChartType, onChartTypeChange }: KPI1ChartSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHART_OPTIONS.map((chart) => (
        <Button
          key={chart.id}
          variant={selectedChartType === chart.id ? "default" : "outline"}
          size="sm"
          onClick={() => onChartTypeChange(chart.id)}
        >
          {chart.label}
        </Button>
      ))}
    </div>
  );
}
