"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useKPI1Charts } from "../hooks/useKPI1Charts";
import type { IndividualApplication } from "@/types/ma-drilldown";

interface KPI1ChartRendererProps {
  chartType: string;
  workingSet: IndividualApplication[];
  period: string;
}

const palette = ["#6366f1", "#22c55e", "#f97316", "#0ea5e9", "#ef4444", "#14b8a6"];

export function KPI1ChartRenderer({ chartType, workingSet, period }: KPI1ChartRendererProps) {
  const { timeSeries, histogramData, scatterData, boxStats, boxData, metrics } = useKPI1Charts(
    workingSet,
    period
  );

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={timeSeries} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "On-time (%)", position: "insideBottomRight", offset: -6 }}
          />
          <YAxis
            dataKey="name"
            type="category"
            interval={0}
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="onTime" fill="#22c55e" name="On-time %" radius={[6, 6, 6, 6]} />
          <ReferenceLine x={90} stroke="#ef4444" strokeDasharray="5 5" label="Target 90%" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "column") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={timeSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            height={70}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "On-time (%)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="onTime" fill="#2563eb" name="On-time %" radius={[6, 6, 0, 0]} />
          <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label="Target 90%" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={timeSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            height={70}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "On-time (%)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="onTime"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="On-time %"
          />
          <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label="Target 90%" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={timeSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            height={70}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "On-time (%)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="onTime"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.18}
            name="On-time %"
          />
          <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label="Target 90%" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "pie" || chartType === "doughnut") {
    const dimensionData = [
      { name: "On time", value: metrics.onTimeRate },
      { name: "Gap", value: Math.max(0, 100 - metrics.onTimeRate) },
    ];
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={dimensionData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={chartType === "doughnut" ? 70 : 0}
            outerRadius={110}
            paddingAngle={3}
            label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
          >
            {dimensionData.map((entry, index) => (
              <Cell key={entry.name} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val: number, name: string) => [`${val.toFixed(1)}%`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="processingDays"
            name="Processing Days"
            unit="d"
            label={{ value: "Processing days (d)", position: "insideBottomRight", offset: -6 }}
          />
          <YAxis
            type="number"
            dataKey="targetDays"
            name="Target"
            unit="d"
            label={{ value: "Target days (d)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: number, name: string) => [`${value} days`, name]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name}
          />
          <Legend />
          <Scatter data={scatterData} name="Applications" fill="#6366f1" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "histogram") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={histogramData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" interval={0} tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} label={{ value: "Count (#)", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "groupedBar") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={timeSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            height={70}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "On-time (%)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="onTime" fill="#6366f1" name="On-time %" radius={[6, 6, 0, 0]} />
          <Bar dataKey="target" fill="#f97316" name="Target %" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "stackedBar") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={timeSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            height={70}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "On-time (%)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="onTime" stackId="a" fill="#22c55e" name="On-time %" radius={[6, 6, 0, 0]} />
          <Bar dataKey="gap" stackId="a" fill="#f97316" name="Gap %" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "dualAxis") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={timeSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            height={70}
            tickMargin={10}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "On-time (%)", angle: -90, position: "insideLeft" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: "Volume (#)", angle: 90, position: "insideRight" }}
          />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="onTime"
            stroke="#22c55e"
            strokeWidth={2}
            name="On-time %"
          />
          <Bar
            yAxisId="right"
            dataKey="volume"
            fill="#6366f1"
            name="Volume"
            radius={[6, 6, 0, 0]}
          />
          <ReferenceLine y={90} yAxisId="left" stroke="#ef4444" strokeDasharray="5 5" />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "box") {
    if (!boxData.length) {
      return (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Not enough data to draw a box plot.
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={boxData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            height={70}
            tickMargin={10}
          />
          <YAxis label={{ value: "Processing days", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="q3" fill="#a855f7" name="Q3" radius={[6, 6, 0, 0]} />
          <ReferenceLine y={boxStats?.q1 ?? 0} stroke="#22c55e" label="Q1" />
          <ReferenceLine y={boxStats?.median ?? 0} stroke="#2563eb" label="Median" />
          <ReferenceLine
            y={boxStats?.max ?? 0}
            stroke="#f97316"
            strokeDasharray="4 4"
            label="Max"
          />
          <ReferenceLine
            y={boxStats?.min ?? 0}
            stroke="#0ea5e9"
            strokeDasharray="4 4"
            label="Min"
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      No data available for the selected filters.
    </div>
  );
}
