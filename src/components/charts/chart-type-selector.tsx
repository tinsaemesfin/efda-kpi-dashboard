"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CHART_TYPES, type ChartType } from "./chart-types";

function ChartPreview({ type }: { type: ChartType }) {
  return <svg viewBox="0 0 40 28" className="h-6 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {type === "column" && <><path d="M4 25h32" opacity=".3" /><path d="M8 24V14h5v10M18 24V5h5v19M28 24V10h5v14" fill="currentColor" fillOpacity=".2" /></>}
    {type === "bar" && <><path d="M4 3v23" opacity=".3" /><path d="M5 5h21v4H5M5 13h30v4H5M5 21h15v4H5" fill="currentColor" fillOpacity=".2" /></>}
    {(type === "line" || type === "area") && <><path d="M4 24h32" opacity=".3" />{type === "area" && <path d="M5 21l10-10 9 4L35 4v20H5Z" fill="currentColor" fillOpacity=".2" stroke="none" />}<path d="M5 21l10-10 9 4L35 4" /></>}
    {(type === "dot" || type === "lollipop") && <><path d="M4 25h32" opacity=".3" />{type === "lollipop" && <path d="M9 24V15M20 24V6M31 24V11" />}<circle cx="9" cy="14" r="2.5" fill="currentColor" /><circle cx="20" cy="5" r="2.5" fill="currentColor" /><circle cx="31" cy="10" r="2.5" fill="currentColor" /></>}
    {type === "radar" && <><path d="m20 2 15 9-6 15H11L5 11Z" opacity=".3" /><path d="m20 5 10 8-4 10H13L9 12Z" fill="currentColor" fillOpacity=".2" /><path d="M20 2v14M5 11l15 5 9 10M35 11l-15 5-9 10" opacity=".3" /></>}
    {type === "pie" && <><path d="M19 3a11 11 0 1 0 11 11H19Z" fill="currentColor" fillOpacity=".2" /><path d="M23 2v9h9a10 10 0 0 0-9-9Z" fill="currentColor" /></>}
    {type === "doughnut" && <><circle cx="20" cy="14" r="10" strokeWidth="5" opacity=".25" /><path d="M20 4a10 10 0 0 1 10 10" strokeWidth="5" /></>}
  </svg>;
}

export function ChartTypeSelector({ value, onChange, unavailable, label = "Chart type" }: {
  value: ChartType;
  onChange: (value: ChartType) => void;
  unavailable: Partial<Record<ChartType, string>>;
  label?: string;
}) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
    {CHART_TYPES.map(option => {
      const reason = unavailable[option.id];
      return <Tooltip key={option.id}>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`${option.label}${reason ? ` — unavailable: ${reason}` : ""}`} aria-disabled={!!reason} aria-pressed={value === option.id && !reason}
            onClick={() => { if (!reason) onChange(option.id); }}
            className={cn("flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              reason ? "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground/45" : value === option.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary")}>
            <ChartPreview type={option.id} /><span>{option.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{reason ? `${option.label} unavailable: ${reason}` : option.label}</TooltipContent>
      </Tooltip>;
    })}
  </div>;
}
