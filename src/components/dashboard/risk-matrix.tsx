"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ProgramRiskMatrixRow } from "@/data/dashboard-analytics";
import { PRODUCT_LINE_ORDER } from "@/data/dashboard-product-performance";

import { formatSignalValue } from "./dashboard-format";
import { DashboardStatusBadge, statusHeatmapCellClass } from "./dashboard-status-badge";

export function DashboardRiskMatrix({ rows }: { rows: ProgramRiskMatrixRow[] }) {
  return (
    <section aria-labelledby="risk-matrix-title" className="space-y-3">
      <div>
        <h2 id="risk-matrix-title" className="text-lg font-semibold tracking-tight text-efda-text-primary">
          Status matrix
        </h2>
        <p className="text-sm text-muted-foreground">
          Heat intensity reflects status per program and product line. Values shown are primary signals only.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-efda-border-custom bg-efda-surface shadow-sm lg:block">
        <div
          className="grid gap-0 border-b border-efda-border-custom bg-efda-surface-muted/60 text-[11px] font-semibold uppercase tracking-wide text-efda-text-muted"
          style={{
            gridTemplateColumns: `minmax(132px,1.1fr) repeat(${PRODUCT_LINE_ORDER.length},minmax(0,1fr))`,
          }}
        >
          <div className="flex items-end px-3 py-3 font-mono">Program</div>
          {rows[0]?.cells.map((c) => (
            <div key={c.line} className="border-l border-efda-border-custom px-2 py-3 text-center">
              <span className="line-clamp-2">{c.lineLabel}</span>
            </div>
          ))}
        </div>

        {rows.map((row) => (
          <div
            key={row.program}
            className="grid gap-0 border-b border-efda-border-custom bg-efda-surface last:border-b-0"
            style={{
              gridTemplateColumns: `minmax(132px,1.1fr) repeat(${row.cells.length},minmax(0,1fr))`,
            }}
          >
            <div className="flex items-center px-3 py-2.5 text-sm font-medium leading-snug text-efda-text-primary">
              {row.programTitle}
            </div>
            {row.cells.map((c) => (
              <div
                key={c.line}
                className={`border-l border-efda-border-custom px-2 py-2.5 transition-colors hover:brightness-[1.02] ${statusHeatmapCellClass(c.status)}`}
                title={`${row.programTitle} · ${c.lineLabel}: ${c.status}`}
              >
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="sr-only">
                    {row.programTitle}, {c.lineLabel}, status {c.status}
                  </span>
                  <DashboardStatusBadge status={c.status} />
                  <span className="font-mono text-[10px] text-efda-text-muted">{c.cell.primaryMetric.code}</span>
                  <span className="text-xs font-semibold tabular-nums text-efda-text-primary">{formatSignalValue(c.cell.primaryMetric)}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid max-w-full gap-4 lg:hidden">
        {rows[0]?.cells.map((column) => {
          const line = column.line;
          const lineLabel = column.lineLabel;
          return (
            <Card key={line} className="border-efda-border-custom bg-efda-surface shadow-sm">
              <CardContent className="space-y-3 p-4">
                <h3 className="text-base font-semibold text-efda-text-primary">{lineLabel}</h3>
                <ul className="space-y-2">
                  {rows.map((row) => {
                    const entry = row.cells.find((x) => x.line === line);
                    if (!entry) return null;
                    return (
                      <li key={row.program}>
                        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${statusHeatmapCellClass(entry.status)}`}>
                          <span className="text-sm font-medium text-efda-text-primary">{row.programTitle}</span>
                          <DashboardStatusBadge status={entry.status} />
                        </div>
                        <p className="mt-1 pl-0.5 text-xs text-muted-foreground">
                          Primary{" "}
                          <span className="font-mono text-[11px] text-foreground">{entry.cell.primaryMetric.code}</span>{" "}
                          {formatSignalValue(entry.cell.primaryMetric)}
                          {entry.cell.exceptions > 0 ? (
                            <span className="ml-2 font-medium text-efda-status-warning">
                              · {entry.cell.exceptions} exception signal{entry.cell.exceptions === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
