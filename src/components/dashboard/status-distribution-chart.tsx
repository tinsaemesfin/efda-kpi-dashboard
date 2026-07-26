"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatusDistribution } from "@/data/dashboard-analytics";

const FILL: Record<string, string> = {
  Excellent: "var(--color-efda-status-excellent)",
  Good: "var(--color-efda-status-good)",
  Warning: "var(--color-efda-status-warning)",
  Critical: "var(--color-efda-status-critical)",
};

export function StatusDistributionChart({ distribution }: { distribution: StatusDistribution }) {
  const data = [
    { name: "Excellent", count: distribution.excellent },
    { name: "Good", count: distribution.good },
    { name: "Warning", count: distribution.warning },
    { name: "Critical", count: distribution.critical },
  ];

  return (
    <Card className="border-efda-border-custom bg-efda-surface shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-efda-text-primary">Status distribution</CardTitle>
        <CardDescription className="text-xs">Pairs by health band (12 total)</CardDescription>
      </CardHeader>
      <CardContent className="h-[240px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 28, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-efda-border-custom/80" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--color-efda-primary) 6%, transparent)" }}
              formatter={(value: number) => [`${value} pair(s)`, "Count"]}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Pairs">
              {data.map((entry) => (
                <Cell key={entry.name} fill={FILL[entry.name] ?? "var(--color-primary)"} />
              ))}
              <LabelList dataKey="count" position="right" fill="var(--color-foreground)" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
