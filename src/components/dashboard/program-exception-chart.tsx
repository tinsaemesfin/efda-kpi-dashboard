"use client";

import { DataChart } from "@/components/charts/data-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ProgramExceptionChart({ rows }: { rows: Array<{ name: string; exceptions: number; atRiskCells: number }> }) {
  return <Card className="border-efda-border-custom bg-efda-surface shadow-sm"><CardHeader><CardTitle className="text-base">Attention by program</CardTitle><CardDescription className="text-xs">Indicators requiring attention across regulatory programs</CardDescription></CardHeader><CardContent className="space-y-4"><DataChart data={rows.map(row => ({ name: row.name, value: row.exceptions }))} label="Exception signals" additive /><div className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">{rows.map(row => <span key={row.name}>{row.name}: <strong className="text-foreground">{row.atRiskCells}</strong> at-risk pairs</span>)}</div></CardContent></Card>;
}
