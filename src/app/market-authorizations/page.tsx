"use client";

import { useCallback, useMemo, useState } from "react";
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ReferenceLine,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { RequirementToggle, KPIFilter, type KPIFilterState } from "@/components/kpi";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maKPIData } from "@/data/ma-dummy-data";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import type { IndividualApplication } from "@/types/ma-drilldown";
import { filterQuarterlyData, filterAnnualData, parseQuarter } from "@/lib/utils/kpi-filter";
import {
  AlertCircleIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ChevronRightIcon,
  ClockIcon,
  FileEditIcon,
  FileSearchIcon,
  FileTextIcon,
  GaugeIcon,
  RefreshCwIcon,
  Wand2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Static options used for KPI 1 filters (modal retains full analytics)
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

export default function MarketAuthorizationsPage() {
  const data = maKPIData;
  const [showRequirements, setShowRequirements] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"quarter" | "annual">("quarter");
  const [view, setView] = useState<"performance" | "cycle" | "transparency">(
    "performance"
  );
  const [dashboardFilter, setDashboardFilter] = useState<KPIFilterState>({
    mode: "quarterly",
    quarter: "Q4",
    year: 2024,
  });
  const [kpi1ChartType, setKpi1ChartType] = useState<string>("bar");
  const [kpi1DimensionId, setKpi1DimensionId] = useState<string>(
    maDrillDownData["MA-KPI-1"].dimensionViews?.[0]?.id ?? ""
  );
  const [kpi1FiltersState, setKpi1FiltersState] = useState({
    period: "Quarterly",
    applicationType: "All",
    internalPathway: "All",
    reliancePathway: "All",
    outcome: "All",
  });

  const handleCardClick = (kpiId: string) => {
    setSelectedKpiId(kpiId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedKpiId(null);
  };

  const getStatus = (
    percentage?: number,
    median?: number,
    average?: number
  ): "excellent" | "good" | "warning" | "critical" => {
    const value = percentage ?? median ?? average ?? 0;
    if (percentage !== undefined) {
      if (value >= 90) return "excellent";
      if (value >= 80) return "good";
      if (value >= 70) return "warning";
      return "critical";
    }
    if (median !== undefined || average !== undefined) {
      if (value <= 150) return "excellent";
      if (value <= 180) return "good";
      if (value <= 220) return "warning";
      return "critical";
    }
    return "good";
  };

  const getKpiIcon = (kpiId: string) => {
    const icons: Record<string, React.ReactNode> = {
      "MA-KPI-1": <ClipboardCheckIcon className="h-4 w-4" />,
      "MA-KPI-2": <RefreshCwIcon className="h-4 w-4" />,
      "MA-KPI-3": <FileEditIcon className="h-4 w-4" />,
      "MA-KPI-4": <FileSearchIcon className="h-4 w-4" />,
      "MA-KPI-5": <AlertCircleIcon className="h-4 w-4" />,
      "MA-KPI-6": <ClockIcon className="h-4 w-4" />,
      "MA-KPI-7": <BarChart3Icon className="h-4 w-4" />,
      "MA-KPI-8": <FileTextIcon className="h-4 w-4" />,
    };
    return icons[kpiId] || <ClipboardCheckIcon className="h-4 w-4" />;
  };

  // Helper function to get filtered quarterly value
  const getFilteredQuarterlyValue = useCallback(<T extends { quarterlyData?: Array<{ quarter: string; value: any }>; currentQuarter: any }>(kpiData: T): T['currentQuarter'] => {
    if (!kpiData.quarterlyData) return kpiData.currentQuarter;
    const filtered = filterQuarterlyData(
      kpiData.quarterlyData.map((q) => {
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
    // Return the most recent matching value, or fallback to currentQuarter
    return filtered.length > 0 ? filtered[filtered.length - 1] : kpiData.currentQuarter;
  }, [dashboardFilter]);

  // Helper function to get filtered annual value
  const getFilteredAnnualValue = useCallback(<T extends { annualData?: Array<{ year: string | number; value: any }>; currentYear: any }>(kpiData: T): T['currentYear'] => {
    if (!kpiData.annualData) return kpiData.currentYear;
    const filtered = filterAnnualData(
      kpiData.annualData.map((a) => ({
        year: a.year,
        ...a.value,
      })),
      dashboardFilter
    );
    return filtered.length > 0 ? filtered[filtered.length - 1] : kpiData.currentYear;
  }, [dashboardFilter]);

  const kpiCards = [
    {
      id: "MA-KPI-1",
      title: "New MA Applications Completed on Time",
      data: getFilteredQuarterlyValue(data.kpi1),
      description: "Applications completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-2",
      title: "Renewal MA Applications Completed on Time",
      data: getFilteredQuarterlyValue(data.kpi2),
      description: "Renewals completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-3",
      title: "Minor Variation Applications Completed on Time",
      data: getFilteredQuarterlyValue(data.kpi3),
      description: "Minor variations completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-4",
      title: "Major Variation Applications Completed on Time",
      data: getFilteredQuarterlyValue(data.kpi4),
      description: "Major variations completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-5",
      title: "Queries/FIRs Completed on Time",
      data: getFilteredQuarterlyValue(data.kpi5),
      description: "Queries/FIRs completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-6",
      title: "Median Time for New MA Applications",
      data: getFilteredAnnualValue(data.kpi6),
      description: "Median processing time in days",
      suffix: " days",
    },
    {
      id: "MA-KPI-7",
      title: "Average Time for New MA Applications",
      data: getFilteredAnnualValue(data.kpi7),
      description: "Average processing time in days",
      suffix: " days",
    },
    {
      id: "MA-KPI-8",
      title: "PARs Published on Time",
      data: getFilteredQuarterlyValue(data.kpi8),
      description: "Public Assessment Reports published within timeline",
      suffix: "%",
    },
  ];

  const kpi1DimensionViews = maDrillDownData["MA-KPI-1"].dimensionViews ?? [];
  const kpi1Applications = useMemo(
    () =>
      (maDrillDownData["MA-KPI-1"].level4?.data ?? []) as IndividualApplication[],
    []
  );

  const filteredKpi1Applications = useMemo(() => {
    return kpi1Applications.filter((app) => {
      if (
        kpi1FiltersState.applicationType !== "All" &&
        app.applicationType !== kpi1FiltersState.applicationType
      )
        return false;
      if (
        kpi1FiltersState.internalPathway !== "All" &&
        app.internalPathway !== kpi1FiltersState.internalPathway
      )
        return false;
      if (
        kpi1FiltersState.reliancePathway !== "All" &&
        app.reliancePathway !== kpi1FiltersState.reliancePathway
      )
        return false;
      if (
        kpi1FiltersState.outcome !== "All" &&
        (app.regulatoryOutcome ?? app.status) !== kpi1FiltersState.outcome
      )
        return false;
      return true;
    });
  }, [kpi1Applications, kpi1FiltersState]);

  const kpi1WorkingSet =
    filteredKpi1Applications.length > 0 ? filteredKpi1Applications : kpi1Applications;

  const kpi1FallbackSeries = data.kpi1.quarterlyData.map((entry) => ({
    name: entry.quarter,
    onTime: entry.value.percentage ?? 0,
    volume: entry.value.denominator ?? 0,
    averageDays: entry.value.average ?? entry.value.median ?? 0,
    gap: Math.max(0, 100 - (entry.value.percentage ?? 0)),
    target: 90,
  }));

  const getBucketKey = useCallback(
    (date: Date) => {
      if (kpi1FiltersState.period === "Monthly") {
        return `${date.getFullYear()}-${date.toLocaleString("default", { month: "short" })}`;
      }
      if (kpi1FiltersState.period === "Annually") {
        return `${date.getFullYear()}`;
      }
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    },
    [kpi1FiltersState.period]
  );

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
        kpi1FiltersState.period === "Monthly"
          ? date.getMonth()
          : kpi1FiltersState.period === "Annually"
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
  }, [kpi1WorkingSet, kpi1FiltersState.period, getBucketKey]);

  const kpi1Series = kpi1TimeSeries.length ? kpi1TimeSeries : kpi1FallbackSeries;

  const kpi1DimensionChartData: Array<{
    name: string;
    value: number;
    total?: number;
    onTime?: number;
  }> = [];

  const kpi1TopDimensionData: typeof kpi1DimensionChartData = [];

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
  const kpi1Volume = kpi1WorkingSet.length || data.kpi1.currentQuarter.denominator;
  const kpi1OnTimeRate =
    kpi1Volume > 0
      ? (kpi1OnTimeCount / kpi1Volume) * 100
      : data.kpi1.currentQuarter.percentage ?? 0;
  const kpi1AverageProcessing =
    kpi1WorkingSet.reduce((sum, app) => sum + app.processingDays, 0) /
      (kpi1WorkingSet.length || 1) || 0;
  const kpi1MedianProcessing = kpi1BoxStats?.median ?? 0;

  const renderKpi1Chart = () => {
    const palette = ["#6366f1", "#22c55e", "#f97316", "#0ea5e9", "#ef4444", "#14b8a6"];

    if (kpi1ChartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={kpi1Series} layout="vertical">
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

    if (kpi1ChartType === "column") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={kpi1Series}>
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

    if (kpi1ChartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={kpi1Series}>
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

    if (kpi1ChartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={kpi1Series}>
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

    if (kpi1ChartType === "pie" || kpi1ChartType === "doughnut") {
      const dimensionData =
        kpi1DimensionChartData.length > 0
          ? kpi1DimensionChartData
          : [
              { name: "On time", value: kpi1OnTimeRate },
              { name: "Gap", value: Math.max(0, 100 - kpi1OnTimeRate) },
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
          <BarChart data={kpi1Series}>
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

    if (kpi1ChartType === "stackedBar") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={kpi1Series}>
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

    if (kpi1ChartType === "dualAxis") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={kpi1Series}>
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

  const quarterlyTrend = useMemo(() => {
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

    // Map filtered data to chart format
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
      const average =
        valuesArray.reduce((sum, val) => sum + val, 0) / valuesArray.length;
      return {
        name: filteredKpi1[index]?.quarter || `Period ${index + 1}`,
        ...values,
        average,
      };
    });
  }, [data, dashboardFilter]);

  const cycleTimeTrend = useMemo(() => {
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
  }, [data, dashboardFilter]);

  const onTimeBreakdown = useMemo(
    () => {
      const kpi1Value = getFilteredQuarterlyValue(data.kpi1);
      const kpi2Value = getFilteredQuarterlyValue(data.kpi2);
      const kpi3Value = getFilteredQuarterlyValue(data.kpi3);
      const kpi4Value = getFilteredQuarterlyValue(data.kpi4);
      const kpi5Value = getFilteredQuarterlyValue(data.kpi5);
      const kpi8Value = getFilteredQuarterlyValue(data.kpi8);
      
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
    },
    [data, getFilteredQuarterlyValue]
  );

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
        performance: data.kpi1.currentQuarter.percentage ?? 0,
        maturity: data.kpi1.maturityLevel * 25,
      },
      {
        category: "Renewals",
        performance: data.kpi2.currentQuarter.percentage ?? 0,
        maturity: data.kpi2.maturityLevel * 25,
      },
      {
        category: "Minor Var",
        performance: data.kpi3.currentQuarter.percentage ?? 0,
        maturity: data.kpi3.maturityLevel * 25,
      },
      {
        category: "Major Var",
        performance: data.kpi4.currentQuarter.percentage ?? 0,
        maturity: data.kpi4.maturityLevel * 25,
      },
      {
        category: "Queries",
        performance: data.kpi5.currentQuarter.percentage ?? 0,
        maturity: data.kpi5.maturityLevel * 25,
      },
      {
        category: "PARs",
        performance: data.kpi8.currentQuarter.percentage ?? 0,
        maturity: data.kpi8.maturityLevel * 25,
      },
    ],
    [data]
  );

  const scatterData = kpi1ScatterData;

  const overallOnTime = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(data.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(data.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(data.kpi3);
    const kpi4Value = getFilteredQuarterlyValue(data.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(data.kpi5);
    const kpi8Value = getFilteredQuarterlyValue(data.kpi8);
    
    const metrics = [
      kpi1Value.percentage ?? 0,
      kpi2Value.percentage ?? 0,
      kpi3Value.percentage ?? 0,
      kpi4Value.percentage ?? 0,
      kpi5Value.percentage ?? 0,
      kpi8Value.percentage ?? 0,
    ];
    return (
      metrics.reduce((sum, value) => sum + value, 0) / (metrics.length || 1)
    );
  }, [data, getFilteredQuarterlyValue]);

  const totalVolume = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(data.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(data.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(data.kpi3);
    const kpi4Value = getFilteredQuarterlyValue(data.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(data.kpi5);
    const kpi8Value = getFilteredQuarterlyValue(data.kpi8);
    
    return (
      kpi1Value.denominator +
      kpi2Value.denominator +
      kpi3Value.denominator +
      kpi4Value.denominator +
      kpi5Value.denominator +
      kpi8Value.denominator
    );
  }, [data, getFilteredQuarterlyValue]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-white shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-violet-500 blur-3xl" />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-sky-500 blur-3xl" />
              <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
            </div>
            <div className="relative z-10 p-6 md:p-10 space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  
                  <div className="flex items-center gap-3">
                    <ClipboardCheckIcon className="h-10 w-10 text-emerald-300" />
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                        Market Authorization Command Center
                      </h1>
                      <p className="text-sm text-white/70">
                        Holistic visibility into MA timelines, transparency, and
                        reliability with multi-angle drill-downs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="border-white/20 text-white">
                    <GaugeIcon className="mr-2 h-4 w-4" />
                    Live governance view
                  </Button>
                  <Button className="bg-white text-slate-900 hover:bg-white/90">
                    <Wand2Icon className="mr-2 h-4 w-4" />
                    Generate executive PDF
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/70">
                      Overall on-time rate
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {overallOnTime.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    Weighted across six SLA-driven KPIs
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/70">
                      Active workload
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {totalVolume.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    Applications across new, renewal, variation & PARs
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/70">
                      Median cycle time
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {data.kpi6.currentYear.median?.toFixed(0)} days
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    Current year median for new MA applications
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/70">
                      Transparency
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {data.kpi8.currentQuarter.percentage?.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    PARs published within specified timelines
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <RequirementToggle
                enabled={showRequirements}
                onChange={setShowRequirements}
                category="Market Authorization"
              />
              <Badge variant="outline" className="border-dashed">
                Deep dive & drill-down ready
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                SLA-driven targets overlayed on charts
              </div>
            </div>
          </div>

          {/* KPI Filter */}
          <KPIFilter
            onFilterChange={setDashboardFilter}
            defaultYear={2024}
            defaultQuarter="Q4"
            showAllModes={true}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((kpi) => {
              const value =
                kpi.data.percentage ??
                kpi.data.median ??
                kpi.data.average ??
                0;
              const status = getStatus(
                kpi.data.percentage,
                kpi.data.median,
                kpi.data.average
              );

              return (
                <MAKPICard
                  key={kpi.id}
                  kpiId={kpi.id}
                  title={kpi.title}
                  value={
                    kpi.data.percentage !== undefined
                      ? value.toFixed(1)
                      : kpi.data.median !== undefined
                      ? value.toFixed(0)
                      : kpi.data.average !== undefined
                      ? value.toFixed(1)
                      : value
                  }
                  description={kpi.description}
                  status={status}
                  icon={getKpiIcon(kpi.id)}
                  suffix={kpi.suffix}
                  numerator={kpi.data.numerator}
                  denominator={kpi.data.denominator}
                  onClick={() => handleCardClick(kpi.id)}
                />
              );
            })}
          </div>

          {false && (
          <Card className="border-dashed">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheckIcon className="h-5 w-5 text-emerald-600" />
                  MA KPI 1 – drill-ready analytics
                </CardTitle>
                <CardDescription>
                  Filter by portfolio, pathway, reliance route, or outcome, then toggle through all
                  supported chart types.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setKpi1FiltersState({
                      period: "Quarterly",
                      applicationType: "All",
                      internalPathway: "All",
                      reliancePathway: "All",
                      outcome: "All",
                    })
                  }
                >
                  Reset filters
                </Button>
                <Button onClick={() => handleCardClick("MA-KPI-1")}>
                  Open drill-down
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    value={kpi1FiltersState.period}
                    onValueChange={(value) =>
                      setKpi1FiltersState((prev) => ({ ...prev, period: value }))
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
                    value={kpi1FiltersState.applicationType}
                    onValueChange={(value) =>
                      setKpi1FiltersState((prev) => ({ ...prev, applicationType: value }))
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
                    value={kpi1FiltersState.internalPathway}
                    onValueChange={(value) =>
                      setKpi1FiltersState((prev) => ({ ...prev, internalPathway: value }))
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
                    value={kpi1FiltersState.reliancePathway}
                    onValueChange={(value) =>
                      setKpi1FiltersState((prev) => ({ ...prev, reliancePathway: value }))
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
                    value={kpi1FiltersState.outcome}
                    onValueChange={(value) =>
                      setKpi1FiltersState((prev) => ({ ...prev, outcome: value }))
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
                      {kpi1TopDimensionData.map((item) => (
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
            </CardContent>
          </Card>
          )}

          <Card className="border-dashed">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="h-5 w-5 text-indigo-600" />
                  Interactive KPI visual gallery
                </CardTitle>
                <CardDescription>
                  Switch perspectives to highlight performance, cycle time, and
                  transparency signals.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Focus</span>
                  <Select
                    value={view}
                    onValueChange={(val) =>
                      setView(val as "performance" | "cycle" | "transparency")
                    }
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
                    onValueChange={(val) =>
                      setTimeframe(val as "quarter" | "annual")
                    }
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
                    <CardDescription>
                      Quarter-over-quarter movement with aggregated SLA overlay.
                    </CardDescription>
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
                    <CardDescription>
                      Stack shows achieved vs remaining headroom to 100%.
                    </CardDescription>
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
                    <CardDescription>
                      Quick sense of where volume and performance live.
                    </CardDescription>
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
                              fill={
                                ["#6366f1", "#22c55e", "#f97316", "#0ea5e9"][
                                  index % 4
                                ]
                              }
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
                    <CardDescription>
                      Annual view with SLA target line at 150 days.
                    </CardDescription>
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
                    <CardDescription>
                      Balanced view of outcomes vs capability.
                    </CardDescription>
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
                    <CardDescription>
                      Overall SLA attainment for MA operations.
                    </CardDescription>
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

              <div className="grid gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle>Processing time scatter (sample apps)</CardTitle>
                    <CardDescription>
                      Outliers surface immediately; hover for brand context.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="processingDays"
                          name="Processing Days"
                          unit="d"
                        />
                        <YAxis
                          type="number"
                          dataKey="targetDays"
                          name="Target"
                          unit="d"
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          formatter={(value: number, name: string) =>
                            [`${value} days`, name]
                          }
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.name
                          }
                        />
                        <Legend />
                        <Scatter
                          name="Applications"
                          data={scatterData}
                          fill="#6366f1"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Root-cause quick read</CardTitle>
                    <CardDescription>
                      Top drivers from Level-1 drill-down (MA-KPI-1).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {maDrillDownData["MA-KPI-1"].rootCauseAnalysis?.flatMap(
                      (dimension) =>
                        dimension.items.slice(0, 3).map((item) => (
                          <div key={`${dimension.dimension}-${item.category}`}>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {item.category}
                                </span>
                                <Badge variant="outline">{dimension.dimension}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {item.percentage?.toFixed(1) ?? item.value}%
                              </span>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                                style={{ width: `${item.percentage ?? item.value}%` }}
                              />
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {item.count} / {item.total} on time
                            </div>
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {selectedKpiId && maDrillDownData[selectedKpiId] && (
            <MADrillDownModal
              open={isModalOpen}
              onOpenChange={handleModalClose}
              data={maDrillDownData[selectedKpiId]}
            />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
