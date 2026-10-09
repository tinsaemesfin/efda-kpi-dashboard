"use client";

import { DataChart } from "@/components/charts/data-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatusDistribution } from "@/data/dashboard-analytics";

export function StatusDistributionChart({ distribution }: { distribution: StatusDistribution }) {
  const data = [
    { name: "Excellent", value: distribution.excellent, color: "var(--color-efda-status-excellent)" },
    { name: "Good", value: distribution.good, color: "var(--color-efda-status-good)" },
    { name: "Warning", value: distribution.warning, color: "var(--color-efda-status-warning)" },
    { name: "Critical", value: distribution.critical, color: "var(--color-efda-status-critical)" },
  ];
  return <Card className="border-efda-border-custom bg-efda-surface shadow-sm"><CardHeader><CardTitle className="text-base">Status distribution</CardTitle><CardDescription className="text-xs">Program and product pairs by health band</CardDescription></CardHeader><CardContent><DataChart data={data} label="Program and product pairs" additive ordered defaultType="bar" /></CardContent></Card>;
}
