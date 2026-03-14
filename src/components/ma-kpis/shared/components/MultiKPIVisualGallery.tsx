"use client";

import { useState, useMemo } from "react";
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
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3Icon } from "lucide-react";
import { useMADashboard } from "../context/MADashboardContext";
import { useFilteredKPIValue } from "../hooks/useFilteredKPIValue";
import { filterQuarterlyData, filterAnnualData, parseQuarter } from "@/lib/utils/kpi-filter";
import { maKPIData } from "@/data/ma-dummy-data";
import { maDrillDownData } from "@/data/ma-drilldown-data";

export function MultiKPIVisualGallery() {
  const { dashboardFilter } = useMADashboard();
  const { getFilteredQuarterlyValue } = useFilteredKPIValue();
  const [view, setView] = useState<"performance" | "cycle" | "transparency">("performance");
  const [timeframe, setTimeframe] = useState<"quarter" | "annual">("quarter");

  const quarterlyTrend = useMemo(() => {
    const data = maKPIData;
    const filteredKpi1 = filterQuarterlyData(
      data.kpi1.quarterlyData.map((q) => {
        const parsed = parseQuarter(q.quarter);
        return {
          quarter: q.quarter,
          year: parsed?.year,
          quarterNumber: parsed ? parseInt(parsed.quarter.slice(1)) : undefined,
          ...q.value,
        };
      }),
      dashboardFilter
    );
    const filteredKpi2 = filterQuarterlyData(
      data.kpi2.quarterlyData.map((q) => {
        const parsed = parseQuarter(q.quarter);
        return {
          quarter: q.quarter,
          year: parsed?.year,
          quarterNumber: parsed ? parseInt(parsed.quarter.slice(1)) : undefined,
          ...q.value,
        };
      }),
      dashboardFilter
    );
    const filteredKpi3 = filterQuarterlyData(
      data.kpi3.quarterlyData.map((q) => {
        const parsed = parseQuarter(q.quarter);
        return {
          quarter: q.quarter,
          year: parsed?.year,
          quarterNumber: parsed ? parseInt(parsed.quarter.slice(1)) : undefined,
          ...q.value,
        };
      }),
      dashboardFilter
    );
    const filteredKpi4 = filterQuarterlyData(
      data.kpi4.quarterlyData.map((q) => {
        const parsed = parseQuarter(q.quarter);
        return {
          quarter: q.quarter,
          year: parsed?.year,
          quarterNumber: parsed ? parseInt(parsed.quarter.slice(1)) : undefined,
          ...q.value,
        };
      }),
      dashboardFilter
    );
    const filteredKpi5 = filterQuarterlyData(
      data.kpi5.quarterlyData.map((q) => {
        const parsed = parseQuarter(q.quarter);
        return {
          quarter: q.quarter,
          year: parsed?.year,
          quarterNumber: parsed ? parseInt(parsed.quarter.slice(1)) : undefined,
          ...q.value,
        };
      }),
      dashboardFilter
    );
    const filteredKpi8 = filterQuarterlyData(
      data.kpi8.quarterlyData.map((q) => {
        const parsed = parseQuarter(q.quarter);
        return {
          quarter: q.quarter,
          year: parsed?.year,
          quarterNumber: parsed ? parseInt(parsed.quarter.slice(1)) : undefined,
          ...q.value,
        };
      }),
      dashboardFilter
    );

    const maxLength = Math.max(
      filteredKpi1.length,
      filteredKpi2.length,
      filteredKpi3.length,
      filteredKpi4.length,
      filteredKpi5.length,
      filteredKpi8.length
    );

    return Array.from({ length: maxLength }, (_, index) => {
      const values = {
        newMA: filteredKpi1[index]?.percentage ?? 0,
        renewals: filteredKpi2[index]?.percentage ?? 0,
        minor: filteredKpi3[index]?.percentage ?? 0,
        major: filteredKpi4[index]?.percentage ?? 0,
        firs: filteredKpi5[index]?.percentage ?? 0,
        pars: filteredKpi8[index]?.percentage ?? 0,
      };
      const valuesArray = Object.values(values);
      const average = valuesArray.reduce((sum, val) => sum + val, 0) / valuesArray.length;
      return {
        name: filteredKpi1[index]?.quarter || `Period ${index + 1}`,
        ...values,
        average,
      };
    });
  }, [dashboardFilter]);

  const cycleTimeTrend = useMemo(() => {
    const data = maKPIData;
    const filteredKpi6 = filterAnnualData(
      data.kpi6.annualData.map((a) => ({
        year: a.year,
        ...a.value,
      })),
      dashboardFilter
    );
    const filteredKpi7 = filterAnnualData(
      data.kpi7.annualData.map((a) => ({
        year: a.year,
        ...a.value,
      })),
      dashboardFilter
    );

    const maxLength = Math.max(filteredKpi6.length, filteredKpi7.length);
    return Array.from({ length: maxLength }, (_, index) => ({
      year: filteredKpi6[index]?.year || filteredKpi7[index]?.year || `Year ${index + 1}`,
      median: filteredKpi6[index]?.median ?? 0,
      average: filteredKpi7[index]?.average ?? 0,
      target: 150,
    }));
  }, [dashboardFilter]);

  const onTimeBreakdown = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(maKPIData.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(maKPIData.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(maKPIData.kpi3);
    const kpi4Value = getFilteredQuarterlyValue(maKPIData.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(maKPIData.kpi5);
    const kpi8Value = getFilteredQuarterlyValue(maKPIData.kpi8);

    return [
      {
        name: "New MA",
        onTime: kpi1Value.percentage ?? 0,
        gap: Math.max(0, 100 - (kpi1Value.percentage ?? 0)),
        volume: kpi1Value.denominator,
      },
      {
        name: "Renewals",
        onTime: kpi2Value.percentage ?? 0,
        gap: Math.max(0, 100 - (kpi2Value.percentage ?? 0)),
        volume: kpi2Value.denominator,
      },
      {
        name: "Minor Var",
        onTime: kpi3Value.percentage ?? 0,
        gap: Math.max(0, 100 - (kpi3Value.percentage ?? 0)),
        volume: kpi3Value.denominator,
      },
      {
        name: "Major Var",
        onTime: kpi4Value.percentage ?? 0,
        gap: Math.max(0, 100 - (kpi4Value.percentage ?? 0)),
        volume: kpi4Value.denominator,
      },
      {
        name: "Queries/FIRs",
        onTime: kpi5Value.percentage ?? 0,
        gap: Math.max(0, 100 - (kpi5Value.percentage ?? 0)),
        volume: kpi5Value.denominator,
      },
      {
        name: "PARs",
        onTime: kpi8Value.percentage ?? 0,
        gap: Math.max(0, 100 - (kpi8Value.percentage ?? 0)),
        volume: kpi8Value.denominator,
      },
    ];
  }, [getFilteredQuarterlyValue]);

  const submoduleSplit =
    maDrillDownData["MA-KPI-1"].level1?.data?.map((item) => ({
      name: item.category,
      value: item.percentage ?? item.value ?? 0,
      count: item.count,
      total: item.total,
    })) ?? [];

  const radarData = useMemo(
    () => [
      {
        category: "New MA",
        performance: maKPIData.kpi1.currentQuarter.percentage ?? 0,
        maturity: maKPIData.kpi1.maturityLevel * 25,
      },
      {
        category: "Renewals",
        performance: maKPIData.kpi2.currentQuarter.percentage ?? 0,
        maturity: maKPIData.kpi2.maturityLevel * 25,
      },
      {
        category: "Minor Var",
        performance: maKPIData.kpi3.currentQuarter.percentage ?? 0,
        maturity: maKPIData.kpi3.maturityLevel * 25,
      },
      {
        category: "Major Var",
        performance: maKPIData.kpi4.currentQuarter.percentage ?? 0,
        maturity: maKPIData.kpi4.maturityLevel * 25,
      },
      {
        category: "Queries",
        performance: maKPIData.kpi5.currentQuarter.percentage ?? 0,
        maturity: maKPIData.kpi5.maturityLevel * 25,
      },
      {
        category: "PARs",
        performance: maKPIData.kpi8.currentQuarter.percentage ?? 0,
        maturity: maKPIData.kpi8.maturityLevel * 25,
      },
    ],
    []
  );

  const overallOnTime = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(maKPIData.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(maKPIData.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(maKPIData.kpi3);
    const kpi4Value = getFilteredQuarterlyValue(maKPIData.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(maKPIData.kpi5);
    const kpi8Value = getFilteredQuarterlyValue(maKPIData.kpi8);

    const metrics = [
      kpi1Value.percentage ?? 0,
      kpi2Value.percentage ?? 0,
      kpi3Value.percentage ?? 0,
      kpi4Value.percentage ?? 0,
      kpi5Value.percentage ?? 0,
      kpi8Value.percentage ?? 0,
    ];
    return metrics.reduce((sum, value) => sum + value, 0) / (metrics.length || 1);
  }, [getFilteredQuarterlyValue]);

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5 text-indigo-600" />
            Interactive KPI visual gallery
          </CardTitle>
          <CardDescription>
            Switch perspectives to highlight performance, cycle time, and transparency signals.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Focus</span>
            <Select
              value={view}
              onValueChange={(val) => setView(val as "performance" | "cycle" | "transparency")}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="cycle">Cycle time</SelectItem>
                <SelectItem value="transparency">Transparency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period</span>
            <Select
              value={timeframe}
              onValueChange={(val) => setTimeframe(val as "quarter" | "annual")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Multi-KPI on-time trend</CardTitle>
              <CardDescription>Quarter-over-quarter movement with aggregated SLA overlay.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={quarterlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[60, 100]} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="average"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.12}
                    name="Average"
                  />
                  <Line
                    type="monotone"
                    dataKey="newMA"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="New MA"
                  />
                  <Line
                    type="monotone"
                    dataKey="renewals"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                    name="Renewals"
                  />
                  <Line
                    type="monotone"
                    dataKey="minor"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Minor Var"
                  />
                  <Line
                    type="monotone"
                    dataKey="major"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Major Var"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>On-time vs gap by KPI</CardTitle>
              <CardDescription>Stack shows achieved vs remaining headroom to 100%.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={onTimeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={60} tickMargin={8} />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    label={{ value: "On-time (%)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="onTime"
                    stackId="a"
                    fill="#22c55e"
                    radius={[6, 6, 0, 0]}
                    name="On time"
                  />
                  <Bar
                    dataKey="gap"
                    stackId="a"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                    name="Gap to 100%"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio split by submodule</CardTitle>
              <CardDescription>Quick sense of where volume and performance live.</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="absolute right-6 top-6 text-sm text-muted-foreground">
                Volume{" "}
                {maDrillDownData["MA-KPI-1"].level1?.data?.reduce(
                  (sum, item) => sum + (item.total || 0),
                  0
                ) ?? 0}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={submoduleSplit}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                  >
                    {submoduleSplit.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={["#6366f1", "#22c55e", "#f97316", "#0ea5e9"][index % 4]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Cycle time (median vs average)</CardTitle>
              <CardDescription>Annual view with SLA target line at 150 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cycleTimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="median"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.15}
                    name="Median"
                  />
                  <Area
                    type="monotone"
                    dataKey="average"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.12}
                    name="Average"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    name="Target"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Performance & maturity radar</CardTitle>
              <CardDescription>Balanced view of outcomes vs capability.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Performance"
                    dataKey="performance"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Maturity"
                    dataKey="maturity"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.15}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Health gauge</CardTitle>
              <CardDescription>Overall SLA attainment for MA operations.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart
                  data={[{ name: "On Time", value: overallOnTime }]}
                  innerRadius="60%"
                  outerRadius="100%"
                  startAngle={180}
                  endAngle={-180}
                >
                  <RadialBar dataKey="value" cornerRadius={12} fill="#22c55e" background />
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <Legend />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Target: 90%+ on-time across all SLA-bound KPIs
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
