"use client";

import { useState } from "react";
import { timeComparison, timeDistribution } from "@/lib/ma-api/distribution";
import type { MATimeDrillDownItem } from "@/types/ma-drilldown";

const days = (n: number | null) => n == null ? "Unavailable" : `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} days`;

export function TimeDistributionChart({ items, metric, comparison = false }: {
  items: MATimeDrillDownItem[]; metric: "median" | "average"; comparison?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = items.map(item => ({ item, stats: comparison ? (() => { const pair = timeComparison(item, metric); return pair ? { ...pair, q1: null, q3: null, min: null, max: null } : null; })() : timeDistribution(item, metric) })).filter(row => row.stats !== null);
  if (!rows.length) return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{comparison ? "Mean and median are not both reported for this view." : "Distribution statistics are unavailable for this view. A box plot requires the reported median and quartiles."}</div>;
  const max = Math.max(1, ...rows.flatMap(({ stats: s }) => [s!.median, s!.q3 ?? 0, s!.max ?? 0, s!.mean ?? 0]));
  const scale = (n: number) => 14 + n / max * 450;
  const active = rows.find(row => row.item.category === selected) ?? rows[0];
  const stats = active.stats!;
  const fullRange = rows.every(row => row.stats!.min != null && row.stats!.max != null);
  return <div className="space-y-4">
    <p className="text-xs leading-5 text-muted-foreground">{comparison
      ? "Compare the mean (diamond) with the median (line). A larger gap can indicate a skewed distribution."
      : fullRange ? "Box: middle 50% (P25–P75). Line: median. Diamond: mean. Whiskers: observed minimum and maximum, including extreme values."
      : "Box: middle 50% (P25–P75). Line: median. Diamond: mean. Full-range whiskers are shown only when both minimum and maximum are reported."}</p>
    <div className="space-y-3">
      {rows.map(({ item, stats: s }) => {
        const summary = `${item.category}: P25 ${days(s!.q1)}, median ${days(s!.median)}, P75 ${days(s!.q3)}, mean ${days(s!.mean)}; ${item.totalCount} applications`;
        return <button type="button" key={item.category} aria-label={summary} aria-pressed={active.item.category === item.category} onClick={() => setSelected(item.category)} className="block w-full rounded-xl border border-transparent p-2 text-left transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 aria-pressed:border-violet-200 aria-pressed:bg-violet-50/60 dark:hover:bg-violet-950/30 dark:aria-pressed:border-violet-800 dark:aria-pressed:bg-violet-950/30">
          <span className="flex justify-between gap-2 text-xs"><span className="font-medium">{item.category}</span><span className="shrink-0 text-muted-foreground">n = {item.totalCount.toLocaleString()}</span></span>
          <svg viewBox="0 0 480 48" className="h-12 w-full" role="img" aria-label={summary}>
            <title>{summary}</title>
            <line x1={14} x2={464} y1={24} y2={24} stroke="currentColor" opacity={0.12} />
            {!comparison && s!.q1 != null && s!.q3 != null && <>
              {s!.min != null && s!.max != null && <g stroke="#7c3aed" strokeWidth={1.5}><line x1={scale(s!.min)} x2={scale(s!.max)} y1={24} y2={24} /><line x1={scale(s!.min)} x2={scale(s!.min)} y1={16} y2={32} /><line x1={scale(s!.max)} x2={scale(s!.max)} y1={16} y2={32} /></g>}
              <rect x={scale(s!.q1)} y={11} width={Math.max(1, scale(s!.q3) - scale(s!.q1))} height={26} rx={3} fill="#ddd6fe" stroke="#7c3aed" />
            </>}
            {comparison && s!.mean != null && <line x1={scale(s!.median)} x2={scale(s!.mean)} y1={24} y2={24} stroke="#a78bfa" strokeWidth={4} />}
            <line x1={scale(s!.median)} x2={scale(s!.median)} y1={8} y2={40} stroke="#6d28d9" strokeWidth={3} />
            {s!.mean != null && <path d={`M ${scale(s!.mean)} 17 l 7 7 l -7 7 l -7 -7 Z`} fill="#0284c7" stroke="white" />}
          </svg>
        </button>;
      })}
      <div className="flex justify-between px-3 text-[11px] text-muted-foreground"><span>0 days</span><span>{days(max / 2)}</span><span>{days(max)}</span></div>
    </div>
    <div aria-live="polite" className="rounded-xl border bg-muted/20 p-3 text-xs">
      <p className="mb-2 font-semibold">{active.item.category}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[["Mean (average)", stats.mean], ["Median", stats.median], ["Middle 50% width", stats.q3 != null && stats.q1 != null ? stats.q3 - stats.q1 : null], ["Minimum", stats.min], ["P25 / P75", `${days(stats.q1)} / ${days(stats.q3)}`], ["Maximum", stats.max]].map(([label, value]) => <div key={String(label)}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{typeof value === "string" ? value : days(value as number | null)}</dd></div>)}</dl>
    </div>
    {rows.length < items.length && <p className="text-xs text-muted-foreground">{items.length - rows.length} categories lack {comparison ? "a reported mean and median" : "valid quartiles"} and are omitted from this plot.</p>}
  </div>;
}
