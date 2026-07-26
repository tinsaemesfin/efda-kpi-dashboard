"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ProgramExceptionChart({
  rows,
}: {
  rows: Array<{ name: string; exceptions: number; atRiskCells: number }>;
}) {
  const data = rows.map((r) => ({
    name: r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name,
    fullName: r.name,
    exceptions: r.exceptions,
    atRisk: r.atRiskCells,
  }));

  return (
    <Card className="border-efda-border-custom bg-efda-surface shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-efda-text-primary">Attention load by program</CardTitle>
        <CardDescription className="text-xs">Exception signals counted + pairs at Warning/Critical</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 8, top: 12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-efda-border-custom/80" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={52} angle={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--color-efda-primary) 6%, transparent)" }}
              formatter={(value: number, key: string) => [value, key === "exceptions" ? "Exception signals" : "At-risk pairs"]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                return row?.fullName ?? "";
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar
              dataKey="exceptions"
              name="Exception signals"
              fill="var(--color-efda-status-warning)"
              radius={[6, 6, 0, 0]}
            >
              <LabelList dataKey="exceptions" position="top" fill="var(--color-foreground)" fontSize={10} />
            </Bar>
            <Bar dataKey="atRisk" name="At-risk pairs" fill="var(--color-efda-primary)" radius={[6, 6, 0, 0]} opacity={0.85}>
              <LabelList dataKey="atRisk" position="top" fill="var(--color-foreground)" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
