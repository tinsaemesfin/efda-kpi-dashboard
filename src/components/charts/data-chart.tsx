"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTypeSelector } from "./chart-type-selector";
import { CHART_TYPES, chartUnavailableReason, type ChartDatum, type ChartType } from "./chart-types";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7", "#f43f5e", "#14b8a6"];

export function DataChart({ data, label, unit = "", ordered = false, additive = false, defaultType = "column", height = 300, target }: {
  data: ChartDatum[];
  label: string;
  unit?: string;
  ordered?: boolean;
  additive?: boolean;
  defaultType?: ChartType;
  height?: number;
  target?: number;
}) {
  const [selected, setSelected] = useState<ChartType>(defaultType);
  const unavailable = Object.fromEntries(CHART_TYPES.flatMap(({ id }) => {
    const reason = chartUnavailableReason(id, data, { ordered, additive });
    return reason ? [[id, reason]] : [];
  }));
  const type = unavailable[selected] ? CHART_TYPES.find(option => !unavailable[option.id])?.id ?? "column" : selected;
  // Retain missing values and category order; changing the style never changes the measure.
  const rows = data.map(row => ({ ...row, value: typeof row.value === "number" && Number.isFinite(row.value) ? row.value : null }));
  const missing = rows.filter(row => row.value === null).length;
  const format = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;
  const tooltip = <Tooltip formatter={value => [format(Number(value)), label]} contentStyle={{ background: "var(--color-card)", color: "var(--color-card-foreground)", borderColor: "var(--color-border)", borderRadius: 12 }} />;
  const horizontal = type === "bar";
  const axes = <><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
    <XAxis dataKey={horizontal ? undefined : "name"} type={horizontal ? "number" : "category"} tick={{ fontSize: 10 }} interval={0} height={horizontal ? 30 : 65} angle={horizontal ? 0 : -25} textAnchor={horizontal ? "middle" : "end"} tickFormatter={horizontal ? format : value => String(value).length > 22 ? `${String(value).slice(0, 20)}…` : String(value)} />
    <YAxis dataKey={horizontal ? "name" : undefined} type={horizontal ? "category" : "number"} width={horizontal ? 125 : 60} tick={{ fontSize: 10 }} interval={0} tickFormatter={horizontal ? value => String(value).slice(0, 22) : format} />
    {tooltip}{target != null && <ReferenceLine {...(horizontal ? { x: target } : { y: target })} ifOverflow="extendDomain" stroke="#f59e0b" strokeDasharray="4 4" />}</>;
  const margin = { top: 12, right: 16, bottom: 8, left: 0 };
  const chart = type === "pie" || type === "doughnut" ? <PieChart><Pie data={rows} dataKey="value" nameKey="name" innerRadius={type === "doughnut" ? "45%" : 0} outerRadius="70%" paddingAngle={2}>{rows.map((row, i) => <Cell key={i} fill={row.color ?? COLORS[i % COLORS.length]} />)}</Pie>{tooltip}<Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
    : type === "radar" ? <RadarChart data={rows} outerRadius="65%"><PolarGrid /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} tickFormatter={value => String(value).slice(0, 18)} /><PolarRadiusAxis tick={{ fontSize: 10 }} /><Radar dataKey="value" name={label} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={.2} connectNulls={false} />{tooltip}</RadarChart>
    : type === "line" || type === "dot" ? <LineChart data={rows} margin={margin}>{axes}<Line dataKey="value" name={label} type="linear" stroke={type === "dot" ? "transparent" : COLORS[0]} strokeWidth={2} dot={{ r: 4, fill: COLORS[0], stroke: COLORS[0] }} connectNulls={false} isAnimationActive={false} /></LineChart>
    : type === "area" ? <AreaChart data={rows} margin={margin}>{axes}<Area dataKey="value" name={label} type="linear" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={.15} connectNulls={false} /></AreaChart>
    : type === "lollipop" ? <ComposedChart data={rows} margin={margin}>{axes}<Bar dataKey="value" name={label} barSize={2} fill={COLORS[0]} tooltipType="none" /><Line dataKey="value" name={label} stroke="transparent" dot={{ r: 5, fill: COLORS[0], stroke: COLORS[0] }} activeDot={false} isAnimationActive={false} /></ComposedChart>
    : <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={margin}>{axes}<Bar dataKey="value" name={label} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={48}>{rows.map((row, i) => <Cell key={i} fill={row.color ?? COLORS[i % COLORS.length]} />)}</Bar></BarChart>;

  const chartHeight = horizontal ? Math.max(height, rows.length * 36) : height;
  const viewportHeight = Math.min(chartHeight, 420);

  return <div className="min-w-0 space-y-4">
    <ChartTypeSelector value={type} onChange={setSelected} unavailable={unavailable} label={`Chart type for ${label}`} />
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-medium">{label}{unit ? ` (${unit.trim()})` : ""}</span>{target != null && <span>Target: {format(target)}</span>}</div>
    {unavailable[type] ? <div role="status" className="grid min-h-48 place-items-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No numeric data available for this selection.</div>
      : <div
          role="img"
          aria-label={`${CHART_TYPES.find(option => option.id === type)?.label} chart: ${label}`}
          className={chartHeight > viewportHeight ? "w-full overflow-auto" : "w-full overflow-x-auto"}
          style={{ height: viewportHeight }}
        >
          <div style={{ height: chartHeight, minHeight: chartHeight }} className="min-w-0">
            <ResponsiveContainer width="100%" minWidth={0} height="100%">{chart}</ResponsiveContainer>
          </div>
        </div>}
    {missing > 0 && <p className="text-xs text-muted-foreground">{missing} {missing === 1 ? "category has" : "categories have"} no reported value (N/A).</p>}
  </div>;
}
