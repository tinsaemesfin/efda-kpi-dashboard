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
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { RequirementToggle, KPIFilter, type KPIFilterState } from "@/components/kpi";
import { GMPKPICard } from "@/components/kpi/gmp-kpi-card";
import { GMPDrillDownModal } from "@/components/kpi/gmp-drilldown-modal";
import { gmpKPIData } from "@/data/gmp-dummy-data";
import { gmpDrillDownData } from "@/data/gmp-drilldown-data";
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
  ShieldCheckIcon,
  Wand2Icon,
  TrendingUpIcon,
  ActivityIcon,
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

export default function GMPInspectionsPage() {
  const data = gmpKPIData;
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
      if (value <= 60) return "excellent";
      if (value <= 75) return "good";
      if (value <= 90) return "warning";
      return "critical";
    }
    return "good";
  };

  const getKpiIcon = (kpiId: string) => {
    const icons: Record<string, React.ReactNode> = {
      "GMP-KPI-1": <ShieldCheckIcon className="h-4 w-4" />,
      "GMP-KPI-2": <AlertCircleIcon className="h-4 w-4" />,
      "GMP-KPI-3": <FileTextIcon className="h-4 w-4" />,
      "GMP-KPI-4": <CheckCircle2Icon className="h-4 w-4" />,
      "GMP-KPI-5": <ClockIcon className="h-4 w-4" />,
      "GMP-KPI-6": <ClockIcon className="h-4 w-4" />,
      "GMP-KPI-7": <BarChart3Icon className="h-4 w-4" />,
      "GMP-KPI-8": <BarChart3Icon className="h-4 w-4" />,
      "GMP-KPI-9": <FileTextIcon className="h-4 w-4" />,
    };
    return icons[kpiId] || <ShieldCheckIcon className="h-4 w-4" />;
  };

  // Helper function to get filtered quarterly value
  const getFilteredQuarterlyValue = <T extends { quarterlyData?: Array<{ quarter: string; value: any }>; currentQuarter: any }>(kpiData: T): T['currentQuarter'] => {
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
    return filtered.length > 0 ? filtered[filtered.length - 1] : kpiData.currentQuarter;
  };

  // Helper function to get filtered annual value
  const getFilteredAnnualValue = <T extends { annualData?: Array<{ year: string | number; value: any }>; currentYear: any }>(kpiData: T): T['currentYear'] => {
    if (!kpiData.annualData) return kpiData.currentYear;
    const filtered = filterAnnualData(
      kpiData.annualData.map((a) => ({
        year: a.year,
        ...a.value,
      })),
      dashboardFilter
    );
    return filtered.length > 0 ? filtered[filtered.length - 1] : kpiData.currentYear;
  };

  const kpiCards = [
    {
      id: "GMP-KPI-1",
      title: "Facilities Inspected as per Plan",
      data: getFilteredQuarterlyValue(data.kpi1),
      description: "Facilities inspected as per plan",
      suffix: "%",
    },
    {
      id: "GMP-KPI-2",
      title: "Complaint-Triggered Inspections",
      data: getFilteredQuarterlyValue(data.kpi2),
      description: "Complaint-triggered inspections conducted",
      suffix: "%",
    },
    {
      id: "GMP-KPI-3",
      title: "On-Site Inspections Waived",
      data: getFilteredQuarterlyValue(data.kpi3),
      description: "Inspections waived (remote/desk reviews)",
      suffix: "%",
    },
    {
      id: "GMP-KPI-4",
      title: "Facilities Compliant with GMP",
      data: getFilteredAnnualValue(data.kpi4),
      description: "Facilities compliant with GMP requirements",
      suffix: "%",
    },
    {
      id: "GMP-KPI-5",
      title: "CAPA Decisions Within Timeline",
      data: getFilteredQuarterlyValue(data.kpi5),
      description: "CAPA decisions issued within timeline",
      suffix: "%",
    },
    {
      id: "GMP-KPI-6",
      title: "Applications Completed Within Timeline",
      data: getFilteredQuarterlyValue(data.kpi6),
      description: "Applications completed within timeline",
      suffix: "%",
    },
    {
      id: "GMP-KPI-7",
      title: "Average Turnaround Time",
      data: getFilteredQuarterlyValue(data.kpi7),
      description: "Average processing time in days",
      suffix: " days",
    },
    {
      id: "GMP-KPI-8",
      title: "Median Turnaround Time",
      data: getFilteredAnnualValue(data.kpi8),
      description: "Median processing time in days",
      suffix: " days",
    },
    {
      id: "GMP-KPI-9",
      title: "Inspection Reports Published on Time",
      data: getFilteredAnnualValue(data.kpi9),
      description: "Reports published within timeline",
      suffix: "%",
    },
  ];

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
    const filteredKpi6 = filterQuarterlyData(
      data.kpi6.quarterlyData.map((q) => {
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
      filteredKpi5.length,
      filteredKpi6.length
    );

    return Array.from({ length: maxLength }, (_, index) => {
      const values = {
        facilitiesInspected: filteredKpi1[index]?.percentage ?? 0,
        complaintInspections: filteredKpi2[index]?.percentage ?? 0,
        inspectionsWaived: filteredKpi3[index]?.percentage ?? 0,
        capaDecisions: filteredKpi5[index]?.percentage ?? 0,
        applicationsCompleted: filteredKpi6[index]?.percentage ?? 0,
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
    const filteredKpi7 = filterQuarterlyData(
      data.kpi7.quarterlyData.map((q) => {
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
    const filteredKpi8 = filterAnnualData(
      data.kpi8.annualData.map((a) => ({
        year: a.year,
        ...a.value,
      })),
      dashboardFilter
    );

    const maxLength = Math.max(filteredKpi7.length, filteredKpi8.length);
    return Array.from({ length: maxLength }, (_, index) => ({
      quarter: filteredKpi7[index]?.quarter || filteredKpi8[index]?.year || `Period ${index + 1}`,
      average: filteredKpi7[index]?.average ?? 0,
      median: filteredKpi8[index]?.median ?? 0,
      target: 60,
    }));
  }, [data, dashboardFilter]);

  const onTimeBreakdown = useMemo(
    () => {
      const kpi1Value = getFilteredQuarterlyValue(data.kpi1);
      const kpi2Value = getFilteredQuarterlyValue(data.kpi2);
      const kpi3Value = getFilteredQuarterlyValue(data.kpi3);
      const kpi4Value = getFilteredAnnualValue(data.kpi4);
      const kpi5Value = getFilteredQuarterlyValue(data.kpi5);
      const kpi6Value = getFilteredQuarterlyValue(data.kpi6);
      const kpi9Value = getFilteredAnnualValue(data.kpi9);
      
      return [
        {
          name: "Facilities Inspected",
          onTime: kpi1Value.percentage ?? 0,
          gap: Math.max(0, 100 - (kpi1Value.percentage ?? 0)),
          volume: kpi1Value.denominator,
        },
        {
          name: "Complaint Inspections",
          onTime: kpi2Value.percentage ?? 0,
          gap: Math.max(0, 100 - (kpi2Value.percentage ?? 0)),
          volume: kpi2Value.denominator,
        },
        {
          name: "Inspections Waived",
          onTime: kpi3Value.percentage ?? 0,
          gap: Math.max(0, 100 - (kpi3Value.percentage ?? 0)),
          volume: kpi3Value.denominator,
        },
        {
          name: "Facilities Compliant",
          onTime: kpi4Value.percentage ?? 0,
          gap: Math.max(0, 100 - (kpi4Value.percentage ?? 0)),
          volume: kpi4Value.denominator,
        },
        {
          name: "CAPA Decisions",
          onTime: kpi5Value.percentage ?? 0,
          gap: Math.max(0, 100 - (kpi5Value.percentage ?? 0)),
          volume: kpi5Value.denominator,
        },
        {
          name: "Applications Completed",
          onTime: kpi6Value.percentage ?? 0,
          gap: Math.max(0, 100 - (kpi6Value.percentage ?? 0)),
          volume: kpi6Value.denominator,
        },
        {
          name: "Reports Published",
          onTime: kpi9Value.percentage ?? 0,
          gap: Math.max(0, 100 - (kpi9Value.percentage ?? 0)),
          volume: kpi9Value.denominator,
        },
      ];
    },
    [data, dashboardFilter]
  );

  const submoduleSplit =
    gmpDrillDownData["GMP-KPI-1"].level1?.data?.map((item) => ({
      name: item.category,
      value: item.percentage ?? item.value ?? 0,
      count: item.count,
      total: item.total,
    })) ?? [];

  const radarData = useMemo(
    () => [
      {
        category: "Facilities Inspected",
        performance: data.kpi1.currentQuarter.percentage ?? 0,
        maturity: data.kpi1.maturityLevel * 25,
      },
      {
        category: "Complaint Inspections",
        performance: data.kpi2.currentQuarter.percentage ?? 0,
        maturity: data.kpi2.maturityLevel * 25,
      },
      {
        category: "Inspections Waived",
        performance: data.kpi3.currentQuarter.percentage ?? 0,
        maturity: data.kpi3.maturityLevel * 25,
      },
      {
        category: "Facilities Compliant",
        performance: data.kpi4.currentYear.percentage ?? 0,
        maturity: data.kpi4.maturityLevel * 25,
      },
      {
        category: "CAPA Decisions",
        performance: data.kpi5.currentQuarter.percentage ?? 0,
        maturity: data.kpi5.maturityLevel * 25,
      },
      {
        category: "Applications Completed",
        performance: data.kpi6.currentQuarter.percentage ?? 0,
        maturity: data.kpi6.maturityLevel * 25,
      },
    ],
    [data]
  );

  const overallCompliance = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(data.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(data.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(data.kpi3);
    const kpi4Value = getFilteredAnnualValue(data.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(data.kpi5);
    const kpi6Value = getFilteredQuarterlyValue(data.kpi6);
    const kpi9Value = getFilteredAnnualValue(data.kpi9);
    
    const metrics = [
      kpi1Value.percentage ?? 0,
      kpi2Value.percentage ?? 0,
      kpi3Value.percentage ?? 0,
      kpi4Value.percentage ?? 0,
      kpi5Value.percentage ?? 0,
      kpi6Value.percentage ?? 0,
      kpi9Value.percentage ?? 0,
    ];
    return (
      metrics.reduce((sum, value) => sum + value, 0) / (metrics.length || 1)
    );
  }, [data, dashboardFilter]);

  const totalWorkload = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(data.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(data.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(data.kpi3);
    const kpi4Value = getFilteredAnnualValue(data.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(data.kpi5);
    const kpi6Value = getFilteredQuarterlyValue(data.kpi6);
    const kpi9Value = getFilteredAnnualValue(data.kpi9);
    
    return (
      kpi1Value.denominator +
      kpi2Value.denominator +
      kpi3Value.denominator +
      kpi4Value.denominator +
      kpi5Value.denominator +
      kpi6Value.denominator +
      kpi9Value.denominator
    );
  }, [data, dashboardFilter]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-green-900 text-white shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-emerald-500 blur-3xl" />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-teal-500 blur-3xl" />
              <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-green-400 blur-3xl" />
            </div>
            <div className="relative z-10 p-6 md:p-10 space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-10 w-10 text-emerald-300" />
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                        GMP Inspections Command Center
                      </h1>
                      <p className="text-sm text-white/70">
                        Comprehensive visibility into GMP inspection performance, compliance, and
                        efficiency with multi-level drill-downs.
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
                      Overall compliance rate
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {overallCompliance.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    Weighted across seven GMP KPIs
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/70">
                      Active workload
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {totalWorkload.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    Inspections across all categories
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/70">
                      Median turnaround time
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {data.kpi8.currentYear.median?.toFixed(0)} days
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    Current year median for GMP applications
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/70">
                      Transparency
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold text-white">
                      {data.kpi9.currentYear.percentage?.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/80">
                    Reports published within specified timelines
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
                category="GMP Inspection"
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                <GMPKPICard
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
                    <CardTitle>Multi-KPI performance trend</CardTitle>
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
                          dataKey="facilitiesInspected"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                          name="Facilities Inspected"
                        />
                        <Line
                          type="monotone"
                          dataKey="complaintInspections"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          dot={false}
                          name="Complaint Inspections"
                        />
                        <Line
                          type="monotone"
                          dataKey="capaDecisions"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                          name="CAPA Decisions"
                        />
                        <Line
                          type="monotone"
                          dataKey="applicationsCompleted"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          name="Applications Completed"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance vs gap by KPI</CardTitle>
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
                          label={{ value: "Performance (%)", angle: -90, position: "insideLeft" }}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="onTime"
                          stackId="a"
                          fill="#22c55e"
                          radius={[6, 6, 0, 0]}
                          name="Performance"
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
                    <CardTitle>Portfolio split by inspection mode</CardTitle>
                    <CardDescription>
                      Quick sense of where volume and performance live.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="absolute right-6 top-6 text-sm text-muted-foreground">
                      Volume{" "}
                      {gmpDrillDownData["GMP-KPI-1"].level1?.data?.reduce(
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
                      Trend view with SLA target line at 60 days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={cycleTimeTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" />
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
                      Overall SLA attainment for GMP operations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadialBarChart
                        data={[{ name: "Compliance", value: overallCompliance }]}
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
                      Target: 90%+ compliance across all SLA-bound KPIs
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle>Processing time scatter (sample inspections)</CardTitle>
                    <CardDescription>
                      Outliers surface immediately; hover for facility context.
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
                          name="Inspections"
                          data={gmpDrillDownData["GMP-KPI-6"].level4?.data?.slice(0, 24).map((insp) => ({
                            name: insp.facilityName,
                            processingDays: insp.processingDays ?? 0,
                            targetDays: insp.targetDays ?? 90,
                            onTime: insp.onTime,
                            status: insp.status,
                          })) ?? []}
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
                      Top drivers from Level-1 drill-down (GMP-KPI-1).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {gmpDrillDownData["GMP-KPI-1"].rootCauseAnalysis?.flatMap(
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

          {selectedKpiId && gmpDrillDownData[selectedKpiId] && (
            <GMPDrillDownModal
              open={isModalOpen}
              onOpenChange={handleModalClose}
              data={gmpDrillDownData[selectedKpiId]}
            />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
