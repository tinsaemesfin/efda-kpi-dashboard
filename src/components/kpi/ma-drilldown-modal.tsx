"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  HomeIcon,
  DownloadIcon,
  TrendingUpIcon,
  BarChart3Icon,
  TargetIcon,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
} from "recharts";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { KPIDrillDownData, IndividualApplication, ProcessingStageDrillDown } from "@/types/ma-drilldown";

interface MADrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: KPIDrillDownData;
}

export function MADrillDownModal({ open, onOpenChange, data }: MADrillDownModalProps) {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [selectedCategories, setSelectedCategories] = useState<Array<string>>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ level: number; label: string; category?: string }>>([
    { level: 1, label: data.kpiName },
  ]);
  const dimensionViews = data.dimensionViews ?? [];
  const [activeDimensionId, setActiveDimensionId] = useState<string>(
    dimensionViews[0]?.id ?? "submodule_type"
  );
  const isKpi1 = data.kpiId === "MA-KPI-1";
  const [viewMode, setViewMode] = useState<"drill" | "analytics">("drill");

  const kpi1ChartOptions = [
    { id: "bar", label: "Bar chart" },
    { id: "column", label: "Column chart" },
    { id: "line", label: "Line chart" },
    { id: "area", label: "Area chart" },
    { id: "pie", label: "Pie chart" },
    { id: "doughnut", label: "Doughnut" },
    { id: "scatter", label: "Scatter plot" },
    { id: "histogram", label: "Histogram" },
    { id: "groupedBar", label: "Group bar" },
    { id: "stackedBar", label: "Stacked bar" },
    { id: "dualAxis", label: "Dual-axis chart" },
    { id: "box", label: "Box plot" },
  ];

  const kpi1ApplicationTypeOptions = [
    "All",
    "New Chemical Entity",
    "Generics",
    "Biologics",
    "Vaccines",
    "Biosimilar",
    "Radiopharmaceuticals",
    "Traditional / Herbal",
    "Plasma Derived Medical Products",
  ];

  const kpi1InternalPathwayOptions = [
    "All",
    "Standard/regular",
    "Fast Track",
    "Emergency Use",
    "Conditional",
  ];

  const kpi1ReliancePathwayOptions = [
    "All",
    "WHO PQ",
    "SRA",
    "Regional (IGAD MRH)",
    "Continental (AMA)",
    "Article 58",
  ];

  const kpi1OutcomeOptions = [
    "All",
    "Approved",
    "Rejected",
    "Cancelled",
    "Suspended",
    "Further information requested",
    "Withdrawn",
  ];

  const [kpi1ChartType, setKpi1ChartType] = useState<string>("bar");
  const [kpi1DimensionId, setKpi1DimensionId] = useState<string>(
    dimensionViews[0]?.id ?? ""
  );
  const [kpi1Filters, setKpi1Filters] = useState({
    period: "Quarterly",
    applicationType: "All",
    internalPathway: "All",
    reliancePathway: "All",
    outcome: "All",
  });

  const resetNavigation = () => {
    setCurrentLevel(1);
    setSelectedCategories([]);
    setBreadcrumbs([{ level: 1, label: data.kpiName }]);
    setViewMode("drill");
  };

  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetNavigation();
      setActiveDimensionId(dimensionViews[0]?.id ?? "submodule_type");
    }
    onOpenChange(open);
  };

  const handleDimensionChange = (dimensionId: string) => {
    setActiveDimensionId(dimensionId);
    resetNavigation();
  };

  const handleLevelClick = (level: number, category?: string) => {
    setCurrentLevel(level);
    if (category) {
      // Update selected categories array
      const newCategories = selectedCategories.slice(0, level - 2);
      newCategories.push(category);
      setSelectedCategories(newCategories);
      
      // Update breadcrumbs
      const newBreadcrumbs: Array<{ level: number; label: string; category?: string }> = [{ level: 1, label: data.kpiName }];
      for (let i = 0; i < newCategories.length; i++) {
        newBreadcrumbs.push({
          level: i + 2,
          label: getLevelLabel(i + 2),
          category: newCategories[i],
        });
      }
      setBreadcrumbs(newBreadcrumbs);
    } else {
      // Reset to level 1
      setSelectedCategories([]);
      setBreadcrumbs([{ level: 1, label: data.kpiName }]);
    }
  };

  const handleBack = () => {
    if (currentLevel > 1) {
      const newLevel = currentLevel - 1;
      setCurrentLevel(newLevel);
      const newCategories = selectedCategories.slice(0, newLevel - 1);
      setSelectedCategories(newCategories);
      
      const newBreadcrumbs: Array<{ level: number; label: string; category?: string }> = [{ level: 1, label: data.kpiName }];
      for (let i = 0; i < newCategories.length; i++) {
        newBreadcrumbs.push({
          level: i + 2,
          label: getLevelLabel(i + 2),
          category: newCategories[i],
        });
      }
      setBreadcrumbs(newBreadcrumbs);
    }
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === 1) {
      handleLevelClick(1);
    } else {
      const category = breadcrumbs.find((b) => b.level === level)?.category;
      if (category) {
        handleLevelClick(level, category);
      }
    }
  };

  const getLevelLabel = (level: number): string => {
    const labels: Record<number, string> = {
      1: "Overview",
      2: "Level 2 Breakdown",
      3: "Level 3 Breakdown",
      4: "Individual Items",
    };
    return labels[level] || `Level ${level}`;
  };

  const formattedCurrentValue =
    data.currentValue.percentage !== undefined
      ? `${data.currentValue.percentage.toFixed(1)}%`
      : data.currentValue.median !== undefined
      ? `${data.currentValue.median} days`
      : data.currentValue.average !== undefined
      ? `${data.currentValue.average.toFixed(1)} days`
      : data.currentValue.value;

  const completionRatio =
    data.currentValue.denominator > 0
      ? (data.currentValue.numerator / data.currentValue.denominator) * 100
      : undefined;

  const activeDimension = useMemo(
    () => dimensionViews.find((view) => view.id === activeDimensionId),
    [dimensionViews, activeDimensionId]
  );

  const level1DisplayData =
    activeDimension?.data ?? data.level1?.data ?? [];

  const level1Label = activeDimension?.label ?? data.level1?.dimension ?? "Category";
  const level1Description =
    activeDimension?.description ?? data.level1?.dimension ?? "category";

  const level1ChartData = useMemo(
    () =>
      level1DisplayData.map((item) => ({
        name: item.category,
        value: item.percentage ?? item.value ?? 0,
        count: item.count,
        total: item.total,
      })),
    [level1DisplayData]
  );

  const level1IsPercent = useMemo(
    () => level1DisplayData.some((item) => item.percentage !== undefined),
    [level1DisplayData]
  );

  // KPI 1 analytics view (only when KPI 1)
  const kpi1DimensionViews = dimensionViews;
  const kpi1Applications = (data.level4?.data ?? []) as IndividualApplication[];

  const filteredKpi1Applications = useMemo(() => {
    return kpi1Applications.filter((app) => {
      if (kpi1Filters.applicationType !== "All" && app.applicationType !== kpi1Filters.applicationType)
        return false;
      if (
        kpi1Filters.internalPathway !== "All" &&
        app.internalPathway !== kpi1Filters.internalPathway
      )
        return false;
      if (
        kpi1Filters.reliancePathway !== "All" &&
        app.reliancePathway !== kpi1Filters.reliancePathway
      )
        return false;
      if (
        kpi1Filters.outcome !== "All" &&
        (app.regulatoryOutcome ?? app.status) !== kpi1Filters.outcome
      )
        return false;
      return true;
    });
  }, [kpi1Applications, kpi1Filters]);

  const kpi1WorkingSet =
    filteredKpi1Applications.length > 0 ? filteredKpi1Applications : kpi1Applications;

  const getBucketKey = (date: Date) => {
    if (kpi1Filters.period === "Monthly") {
      return `${date.getFullYear()}-${date.toLocaleString("default", { month: "short" })}`;
    }
    if (kpi1Filters.period === "Annually") {
      return `${date.getFullYear()}`;
    }
    return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
  };

  const kpi1TimeSeries = useMemo(() => {
    if (!kpi1WorkingSet.length) return [];

    const bucketMap = new Map<
      string,
      { name: string; onTime: number; volume: number; totalDays: number; order: number }
    >();

    kpi1WorkingSet.forEach((app) => {
      const date = new Date(app.decisionDate ?? app.submissionDate ?? "");
      if (Number.isNaN(date.getTime())) return;
      const key = getBucketKey(date);
      const startMonth =
        kpi1Filters.period === "Monthly"
          ? date.getMonth()
          : kpi1Filters.period === "Annually"
          ? 0
          : Math.floor(date.getMonth() / 3) * 3;
      const order = new Date(date.getFullYear(), startMonth, 1).getTime();

      if (!bucketMap.has(key)) {
        bucketMap.set(key, { name: key, onTime: 0, volume: 0, totalDays: 0, order });
      }

      const bucket = bucketMap.get(key)!;
      bucket.volume += 1;
      bucket.totalDays += app.processingDays;
      if (app.onTime) bucket.onTime += 1;
    });

    return Array.from(bucketMap.values())
      .sort((a, b) => a.order - b.order)
      .map((bucket) => ({
        name: bucket.name,
        onTime: bucket.volume ? (bucket.onTime / bucket.volume) * 100 : 0,
        gap: bucket.volume ? Math.max(0, 100 - (bucket.onTime / bucket.volume) * 100) : 0,
        volume: bucket.volume,
        averageDays: bucket.volume ? bucket.totalDays / bucket.volume : 0,
        target: 90,
      }));
  }, [kpi1WorkingSet, kpi1Filters.period]);

  const kpi1ActiveDimension =
    kpi1DimensionViews.find((view) => view.id === kpi1DimensionId) ??
    kpi1DimensionViews[0];

  const kpi1DimensionChartData = useMemo(() => {
    const baseData = kpi1ActiveDimension?.data ?? [];
    if (!baseData.length) return [];

    if (!kpi1ActiveDimension?.sourceField) {
      return baseData.map((item) => ({
        name: item.category,
        value: item.percentage ?? item.value ?? 0,
        total: item.total,
        onTime: item.count,
      }));
    }

    return baseData.map((item) => {
      const matches = kpi1WorkingSet.filter(
        (app) =>
          (app as unknown as Record<string, string | number | undefined>)[
            kpi1ActiveDimension.sourceField as string
          ] === item.category
      );
      const total = matches.length || item.total || 0;
      const onTime = matches.filter((app) => app.onTime).length || item.count || 0;
      const value = total > 0 ? (onTime / total) * 100 : item.percentage ?? item.value ?? 0;

      return {
        name: item.category,
        value,
        total,
        onTime,
      };
    });
  }, [kpi1ActiveDimension, kpi1WorkingSet]);

  const kpi1HistogramData = useMemo(() => {
    const bins = [0, 90, 120, 150, 180, 210, 240, 270];
    const counts = bins.slice(0, -1).map((start, index) => {
      const end = bins[index + 1];
      const count = kpi1WorkingSet.filter(
        (app) => app.processingDays >= start && app.processingDays < end
      ).length;
      return { range: `${start}-${end - 1} days`, count };
    });
    const tail = kpi1WorkingSet.filter((app) => app.processingDays >= bins[bins.length - 1]).length;
    counts.push({ range: `${bins[bins.length - 1]}+ days`, count: tail });
    return counts;
  }, [kpi1WorkingSet]);

  const kpi1ScatterData = useMemo(
    () =>
      kpi1WorkingSet.slice(0, 24).map((app) => ({
        name: app.brandName,
        processingDays: app.processingDays,
        targetDays: app.targetDays,
        onTime: app.onTime,
        status: app.status,
      })),
    [kpi1WorkingSet]
  );

  const kpi1BoxStats = useMemo(() => {
    if (!kpi1WorkingSet.length) return null;
    const days = [...kpi1WorkingSet.map((app) => app.processingDays)].sort((a, b) => a - b);
    const percentile = (p: number) => {
      const index = (days.length - 1) * p;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return days[lower];
      return days[lower] + (days[upper] - days[lower]) * (index - lower);
    };

    return {
      min: days[0],
      max: days[days.length - 1],
      q1: percentile(0.25),
      median: percentile(0.5),
      q3: percentile(0.75),
    };
  }, [kpi1WorkingSet]);

  const kpi1BoxData = kpi1BoxStats
    ? [
        {
          name: "Processing days",
          ...kpi1BoxStats,
        },
      ]
    : [];

  const kpi1OnTimeCount = kpi1WorkingSet.filter((app) => app.onTime).length;
  const kpi1Volume = kpi1WorkingSet.length || data.currentValue.denominator;
  const kpi1OnTimeRate =
    kpi1Volume > 0
      ? (kpi1OnTimeCount / kpi1Volume) * 100
      : data.currentValue.percentage ?? 0;
  const kpi1AverageProcessing =
    kpi1WorkingSet.reduce((sum, app) => sum + app.processingDays, 0) /
      (kpi1WorkingSet.length || 1) || 0;
  const kpi1MedianProcessing = kpi1BoxStats?.median ?? 0;

  const renderKpi1Chart = () => {
    const palette = ["#6366f1", "#22c55e", "#f97316", "#0ea5e9", "#ef4444", "#14b8a6"];
    const series = kpi1TimeSeries;

    // Handle empty data for charts that require series data
    if (
      !series.length &&
      ["bar", "column", "line", "area", "groupedBar", "stackedBar", "dualAxis"].includes(kpi1ChartType)
    ) {
      return (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No data available for the selected filters.
        </div>
      );
    }

    if (kpi1ChartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={series} layout="vertical">
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
              width={160}
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

    if (kpi1ChartType === "column") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={70} tickMargin={10} />
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

    if (kpi1ChartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={70} tickMargin={10} />
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

    if (kpi1ChartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={70} tickMargin={10} />
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

    if (kpi1ChartType === "pie" || kpi1ChartType === "doughnut") {
      const dimensionData =
        kpi1DimensionChartData.length > 0
          ? kpi1DimensionChartData
          : [
              { name: "On time", value: kpi1OnTimeRate },
              { name: "Gap", value: Math.max(0, 100 - kpi1OnTimeRate) },
            ];
      
      if (!dimensionData.length || dimensionData.every((d) => !d.value || d.value === 0)) {
        return (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data available for pie chart.
          </div>
        );
      }
      
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={dimensionData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={kpi1ChartType === "doughnut" ? 70 : 0}
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

    if (kpi1ChartType === "scatter") {
      if (!kpi1ScatterData.length) {
        return (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data available for scatter plot.
          </div>
        );
      }
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
            <Scatter data={kpi1ScatterData} name="Applications" fill="#6366f1" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (kpi1ChartType === "histogram") {
      if (!kpi1HistogramData.length) {
        return (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data available for histogram.
          </div>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={kpi1HistogramData}>
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

    if (kpi1ChartType === "groupedBar") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={70} tickMargin={10} />
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

    if (kpi1ChartType === "stackedBar") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={70} tickMargin={10} />
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

    if (kpi1ChartType === "dualAxis") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={70} tickMargin={10} />
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

    if (kpi1ChartType === "box") {
      if (!kpi1BoxData.length) {
        return (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Not enough data to draw a box plot.
          </div>
        );
      }

      return (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={kpi1BoxData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} height={70} tickMargin={10} />
            <YAxis label={{ value: "Processing days", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="q3" fill="#a855f7" name="Q3" radius={[6, 6, 0, 0]} />
            <ReferenceLine y={kpi1BoxStats?.q1 ?? 0} stroke="#22c55e" label="Q1" />
            <ReferenceLine y={kpi1BoxStats?.median ?? 0} stroke="#2563eb" label="Median" />
            <ReferenceLine
              y={kpi1BoxStats?.max ?? 0}
              stroke="#f97316"
              strokeDasharray="4 4"
              label="Max"
            />
            <ReferenceLine
              y={kpi1BoxStats?.min ?? 0}
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
  };

  const stageTimeline =
    data.level3?.data?.map((item) => ({
      name: item.stage,
      days: item.days,
      target: item.target,
    })) ?? [];

  const rootCauseItems = data.rootCauseAnalysis?.[0]?.items ?? [];

  const renderLevel1 = () => {
    if (level1DisplayData.length === 0) return null;

    const canDrill =
      data.level1?.drillable && (!activeDimension || activeDimension.id === "submodule_type");

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {level1DisplayData.map((item, index) => (
            <Card
              key={index}
              className={cn(
                "transition-colors",
                canDrill && "cursor-pointer hover:bg-accent"
              )}
              onClick={() => {
                if (canDrill) {
                  handleLevelClick(2, item.category);
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {item.percentage !== undefined
                    ? `${item.percentage.toFixed(1)}%`
                    : item.value}
                </div>
                {item.count !== undefined && item.total !== undefined && (
                  <CardDescription className="text-xs mt-1">
                    {item.count} / {item.total}
                  </CardDescription>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderLevel2 = () => {
    if (!data.level2) return null;

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.level2.data.map((item, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                if (data.level2?.drillable) {
                  handleLevelClick(3, item.category);
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {item.percentage !== undefined
                    ? `${item.percentage.toFixed(1)}%`
                    : item.value}
                </div>
                <CardDescription className="text-xs mt-1">
                  {item.count} / {item.total}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderLevel3 = () => {
    if (!data.level3) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {data.level3.data.map((item, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{item.stage}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Target: {item.target} days
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{item.days} days</div>
                    <Badge
                      variant={item.onTime ? "default" : "destructive"}
                      className="mt-1"
                    >
                      {item.onTime ? "On Time" : "Delayed"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {data.level3.drillable && (
          <Button
            onClick={() => handleLevelClick(4)}
            className="w-full"
            variant="outline"
          >
            View Individual Applications
            <ChevronRightIcon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const renderLevel4 = () => {
    if (!data.level4) return null;

    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MA Number</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processing Days</TableHead>
                <TableHead>On Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.level4.data.map((app: IndividualApplication, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{app.maNumber}</TableCell>
                  <TableCell>{app.brandName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "Approved"
                          ? "default"
                          : app.status === "Rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{app.processingDays}</TableCell>
                  <TableCell>
                    <Badge variant={app.onTime ? "default" : "destructive"}>
                      {app.onTime ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderCurrentLevel = () => {
    switch (currentLevel) {
      case 1:
        return renderLevel1();
      case 2:
        return renderLevel2();
      case 3:
        return renderLevel3();
      case 4:
        return renderLevel4();
      default:
        return renderLevel1();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data.kpiName}</DialogTitle>
          <DialogDescription>
            Current Value:{" "}
            {data.currentValue.percentage !== undefined
              ? `${data.currentValue.percentage.toFixed(1)}%`
              : data.currentValue.median !== undefined
              ? `${data.currentValue.median} days`
              : data.currentValue.average !== undefined
              ? `${data.currentValue.average.toFixed(1)} days`
              : data.currentValue.value}
            {" "}({data.currentValue.numerator} / {data.currentValue.denominator})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase">
                <TrendingUpIcon className="h-4 w-4 text-emerald-500" />
                Current performance
              </CardDescription>
              <CardTitle className="text-2xl">{formattedCurrentValue}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {data.currentValue.numerator} of {data.currentValue.denominator} within SLA
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase">
                <BarChart3Icon className="h-4 w-4 text-indigo-500" />
                Throughput
              </CardDescription>
              <CardTitle className="text-2xl">
                {completionRatio ? `${completionRatio.toFixed(1)}%` : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Conversion of workload into completed outcomes
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase">
                <TargetIcon className="h-4 w-4 text-amber-500" />
                Drill depth
              </CardDescription>
              <CardTitle className="text-2xl">
                {[data.level1, data.level2, data.level3, data.level4].filter(Boolean).length} levels
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Navigate levels to localize issues faster
            </CardContent>
          </Card>
        </div>

        {dimensionViews.length > 0 && !isKpi1 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-xs uppercase text-muted-foreground">Perspective</span>
            <div className="flex flex-wrap gap-2">
              {dimensionViews.map((view) => (
                <Button
                  key={view.id}
                  variant={activeDimensionId === view.id ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => handleDimensionChange(view.id)}
                >
                  {view.label}
                </Button>
              ))}
            </div>
            {activeDimension?.description && (
              <span className="text-xs text-muted-foreground">
                {activeDimension.description}
              </span>
            )}
          </div>
        )}

        {isKpi1 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={viewMode === "drill" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("drill")}
            >
              Drill-down view
            </Button>
            <Button
              variant={viewMode === "analytics" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("analytics")}
            >
              Analytics view
            </Button>
          </div>
        )}

        {viewMode === "analytics" && isKpi1 ? (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="text-xs uppercase text-muted-foreground">On-time rate</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="text-3xl font-bold">{kpi1OnTimeRate.toFixed(1)}%</div>
                  <Badge variant="outline">
                    Gap {Math.max(0, 90 - kpi1OnTimeRate).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Target ≥ 90% | {kpi1OnTimeCount}/{kpi1Volume} on time
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="text-xs uppercase text-muted-foreground">Workload</div>
                <div className="mt-1 text-3xl font-bold">{kpi1Volume.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Filtered application count</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="text-xs uppercase text-muted-foreground">Median days</div>
                <div className="mt-1 text-3xl font-bold">
                  {kpi1MedianProcessing ? kpi1MedianProcessing.toFixed(0) : "—"}
                </div>
                <p className="text-sm text-muted-foreground">Processing time (stop-clock adjusted)</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="text-xs uppercase text-muted-foreground">Average days</div>
                <div className="mt-1 text-3xl font-bold">
                  {kpi1AverageProcessing ? kpi1AverageProcessing.toFixed(1) : "—"}
                </div>
                <p className="text-sm text-muted-foreground">Mean cycle duration</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Date</div>
                <Select
                  value={kpi1Filters.period}
                  onValueChange={(value) =>
                    setKpi1Filters((prev) => ({ ...prev, period: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                    <SelectItem value="Date Filter">Date filter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Application type</div>
                <Select
                  value={kpi1Filters.applicationType}
                  onValueChange={(value) =>
                    setKpi1Filters((prev) => ({ ...prev, applicationType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {kpi1ApplicationTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Internal pathway</div>
                <Select
                  value={kpi1Filters.internalPathway}
                  onValueChange={(value) =>
                    setKpi1Filters((prev) => ({ ...prev, internalPathway: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pathway" />
                  </SelectTrigger>
                  <SelectContent>
                    {kpi1InternalPathwayOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Reliance pathway</div>
                <Select
                  value={kpi1Filters.reliancePathway}
                  onValueChange={(value) =>
                    setKpi1Filters((prev) => ({ ...prev, reliancePathway: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reliance" />
                  </SelectTrigger>
                  <SelectContent>
                    {kpi1ReliancePathwayOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Regulatory outcome</div>
                <Select
                  value={kpi1Filters.outcome}
                  onValueChange={(value) =>
                    setKpi1Filters((prev) => ({ ...prev, outcome: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {kpi1OutcomeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {kpi1ChartOptions.map((chart) => (
                <Button
                  key={chart.id}
                  variant={kpi1ChartType === chart.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setKpi1ChartType(chart.id)}
                >
                  {chart.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Chart view</CardTitle>
                  <CardDescription>Switch among all supported graph types.</CardDescription>
                </CardHeader>
                <CardContent>{renderKpi1Chart()}</CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dimension spotlight</CardTitle>
                  <CardDescription>
                    Choose a dimension to anchor the pie / doughnut view.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={(kpi1DimensionId || kpi1DimensionViews[0]?.id) ?? ""}
                    onValueChange={(value) => setKpi1DimensionId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dimension" />
                    </SelectTrigger>
                    <SelectContent>
                      {kpi1DimensionViews.map((view) => (
                        <SelectItem key={view.id} value={view.id}>
                          {view.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="space-y-3">
                    {[...kpi1DimensionChartData]
                      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                      .slice(0, 5)
                      .map((item) => (
                        <div key={item.name}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.value?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                              style={{ width: `${Math.min(item.value ?? 0, 100)}%` }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.onTime ?? 0} / {item.total ?? 0} on time
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {isKpi1 && dimensionViews.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Perspective</CardTitle>
                  <CardDescription>
                    Switch between different dimensions to analyze the data from various angles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2">
                    {dimensionViews.map((view) => (
                      <Button
                        key={view.id}
                        variant={activeDimensionId === view.id ? "default" : "outline"}
                        size="sm"
                        className="h-9"
                        onClick={() => handleDimensionChange(view.id)}
                      >
                        {view.label}
                      </Button>
                    ))}
                  </div>
                  {activeDimension?.description && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {activeDimension.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {level1ChartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>{level1Label} distribution</CardTitle>
                  <CardDescription>
                    Performance by {level1Description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={level1ChartData}
                      margin={{ top: 8, right: 12, left: 8, bottom: 32 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={{ fontSize: 12 }}
                        height={90}
                        tickMargin={12}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis
                        tickFormatter={(value: number) =>
                          level1IsPercent ? `${value.toFixed(1)}%` : String(value)
                        }
                        label={{
                          value: level1IsPercent ? "Value (%)" : "Value",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string, entry) => [
                          level1IsPercent ? `${value.toFixed(1)}%` : value,
                          name === "value"
                            ? `${entry.payload.count} / ${entry.payload.total}`
                            : name,
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {stageTimeline.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Stage timeline vs target</CardTitle>
                  <CardDescription>
                    Identify where the clock is consumed across the workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={stageTimeline}
                      margin={{ top: 8, right: 12, left: 8, bottom: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                      <YAxis
                        tickFormatter={(value: number) => `${value} days`}
                        label={{ value: "Days", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="days"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Actual days"
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        name="Target"
                        dot={false}
                      />
                      <ReferenceLine y={stageTimeline[stageTimeline.length - 1]?.target ?? 0} stroke="transparent" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {viewMode === "drill" && (
          <>
            {rootCauseItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Root-cause spotlight</CardTitle>
                  <CardDescription>
                    Top signals driving performance variance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rootCauseItems.slice(0, 4).map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">
                          {(item.percentage ?? item.value).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                          style={{ width: `${item.percentage ?? item.value}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.count} / {item.total} on time
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Separator className="my-4" />

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLevelClick(1)}
                className="h-6 px-2"
              >
                <HomeIcon className="h-3 w-3" />
              </Button>
              {breadcrumbs.slice(1).map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRightIcon className="h-3 w-3" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBreadcrumbClick(crumb.level)}
                    className="h-6 px-2 text-xs"
                  >
                    {crumb.category}
                  </Button>
                </div>
              ))}
            </div>

            {/* Back Button */}
            {currentLevel > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="w-fit"
              >
                <ChevronLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}

            {/* Content */}
            <div className="mt-4">{renderCurrentLevel()}</div>

            {/* Export Button */}
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

