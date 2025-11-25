"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { KPICardWithRequirement, MetricGrid, RequirementToggle, KPIFilter, type KPIFilterState } from "@/components/kpi";
import { KPILineChart, KPIBarChart } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { maKPIData } from "@/data/ma-dummy-data";
import { getMARequirementByKpiId } from "@/data/ma-requirements-mapping";
import { filterQuarterlyData, filterAnnualData, getFilteredQuarterlyValue, getFilteredAnnualValue, parseQuarter } from "@/lib/utils/kpi-filter";
import {
  ClipboardCheckIcon,
  ClockIcon,
  CheckCircle2Icon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  AlertCircleIcon,
  FileSearchIcon,
  BarChart3Icon,
  RefreshCwIcon,
  FileEditIcon
} from "lucide-react";

export default function MarketAuthorizationsPage() {
  const data = maKPIData;
  const [showRequirements, setShowRequirements] = useState(false);
  const [filter, setFilter] = useState<KPIFilterState>({
    mode: "quarterly",
    quarter: "Q4",
    year: 2024,
  });

  // Helper function to get filtered quarterly value for MA KPIs
  const getFilteredMAQuarterly = (kpiData: typeof data.kpi1) => {
    if (!kpiData.quarterlyData) return kpiData.currentQuarter;
    const filtered = getFilteredQuarterlyValue(kpiData.quarterlyData.map(q => ({
      quarter: q.quarter,
      year: parseQuarter(q.quarter)?.year,
      quarterNumber: parseQuarter(q.quarter)?.quarter,
      ...q.value
    })), filter);
    return filtered || kpiData.currentQuarter;
  };

  // Helper function to get filtered annual value for MA KPIs
  const getFilteredMAAnnual = (kpiData: typeof data.kpi6) => {
    if (!kpiData.annualData) return kpiData.currentYear;
    const filtered = getFilteredAnnualValue(kpiData.annualData.map(a => ({
      year: a.year,
      ...a.value
    })), filter);
    return filtered || kpiData.currentYear;
  };

  // Helper function to get status based on percentage
  const getStatus = (percentage: number): "excellent" | "good" | "warning" | "critical" => {
    if (percentage >= 90) return "excellent";
    if (percentage >= 80) return "good";
    if (percentage >= 70) return "warning";
    return "critical";
  };

  return (
    <AuthGuard>
      <DashboardLayout>
      {/* Requirement Toggle */}
      <RequirementToggle 
        enabled={showRequirements}
        onChange={setShowRequirements}
        category="Market Authorizations"
      />
      
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheckIcon className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold tracking-tight">Market Authorization KPIs</h1>
          </div>
          <p className="text-muted-foreground">
            Regulatory performance metrics for marketing authorization applications (Medicine, Medical devices, Food)
          </p>
        </div>

        {/* KPI Filter */}
        <KPIFilter
          reportingFrequency="Quarterly"
          onFilterChange={setFilter}
          defaultYear={2024}
          defaultQuarter="Q4"
        />

        {/* KPI 1: Percentage of New MA Applications Completed Within a Specified Time Period */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 1: New MA Applications Completed on Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi1.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi1.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi1.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi1.maturityLevel}
              </Badge>
            </div>
          </div>

          {(() => {
            const filteredValue = getFilteredMAQuarterly(data.kpi1);
            return (
              <MetricGrid columns={3}>
                <KPICardWithRequirement
                  title="Completion Rate"
                  value={filteredValue.percentage?.toFixed(1) || "0"}
                  suffix="%"
                  description="Applications completed on time"
                  icon={<ClipboardCheckIcon className="h-4 w-4" />}
                  status={getStatus(filteredValue.percentage || 0)}
                  requirement={getMARequirementByKpiId('ma-new-applications')}
                  showRequirement={showRequirements}
                />
                <KPICardWithRequirement
                  title="Completed on Time"
                  value={filteredValue.numerator}
                  description={data.kpi1.numeratorDescription}
                  icon={<CheckCircle2Icon className="h-4 w-4" />}
                  status="good"
                  requirement={getMARequirementByKpiId('ma-new-applications-num')}
                  showRequirement={showRequirements}
                />
                <KPICardWithRequirement
                  title="Total New Applications"
                  value={filteredValue.denominator}
                  description={data.kpi1.denominatorDescription}
                  icon={<ActivityIcon className="h-4 w-4" />}
                  status="good"
                  requirement={getMARequirementByKpiId('ma-new-applications-den')}
                  showRequirement={showRequirements}
                />
              </MetricGrid>
            );
          })()}

          {/* AMRH Extensions for KPI 1 */}
          {data.kpi1.amrhExtensions && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">AMRH Additional Requirements</CardTitle>
                <CardDescription>Reliance pathway performance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">KPI 1.1: Regional Reliance</h4>
                    <p className="text-xs text-muted-foreground mb-3">{data.kpi1.amrhExtensions.kpi1_1.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{data.kpi1.amrhExtensions.kpi1_1.value.percentage?.toFixed(1)}%</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {data.kpi1.amrhExtensions.kpi1_1.value.numerator}/{data.kpi1.amrhExtensions.kpi1_1.value.denominator}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">KPI 1.2: Continental Reliance</h4>
                    <p className="text-xs text-muted-foreground mb-3">{data.kpi1.amrhExtensions.kpi1_2.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{data.kpi1.amrhExtensions.kpi1_2.value.percentage?.toFixed(1)}%</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {data.kpi1.amrhExtensions.kpi1_2.value.numerator}/{data.kpi1.amrhExtensions.kpi1_2.value.denominator}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Timing Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {data.kpi1.timingRules.map((rule, idx) => (
                    <li key={idx}>• {rule}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <KPIBarChart
              data={filterQuarterlyData(data.kpi1.quarterlyData.map(q => ({
                quarter: q.quarter,
                year: parseQuarter(q.quarter)?.year,
                quarterNumber: parseQuarter(q.quarter)?.quarter,
                ...q.value
              })), filter).map(item => ({
                name: item.quarter,
                value: item.percentage || 0
              }))}
              title="Quarterly Completion Rate"
              description="New MA applications completed on time"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 2: Percentage of Renewal MA Applications Completed Within a Specified Time Period */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 2: Renewal MA Applications Completed on Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi2.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi2.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi2.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi2.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Renewal Completion Rate"
              value={data.kpi2.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Renewals completed on time"
              icon={<RefreshCwIcon className="h-4 w-4" />}
              status={getStatus(data.kpi2.currentQuarter.percentage || 0)}
              requirement={getMARequirementByKpiId('ma-renewal-applications')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Renewals Completed"
              value={data.kpi2.currentQuarter.numerator}
              description={data.kpi2.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-renewal-applications-num')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total Renewals Received"
              value={data.kpi2.currentQuarter.denominator}
              description={data.kpi2.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-renewal-applications-den')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <KPILineChart
            data={data.kpi2.quarterlyData.map(item => ({
              date: item.quarter,
              value: item.value.percentage || 0,
              target: 85
            }))}
            title="Quarterly Renewal Performance"
            description="Efficiency in completing renewal applications"
          />
        </div>

        <Separator />

        {/* KPI 3: Percentage of Minor Variation MA Applications Completed Within a Specified Time Period */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 3: Minor Variation Applications Completed on Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi3.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi3.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi3.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi3.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Minor Variation Rate"
              value={data.kpi3.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Minor variations completed on time"
              icon={<FileEditIcon className="h-4 w-4" />}
              status={getStatus(data.kpi3.currentQuarter.percentage || 0)}
              requirement={getMARequirementByKpiId('ma-minor-variations')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Minor Variations Completed"
              value={data.kpi3.currentQuarter.numerator}
              description={data.kpi3.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="excellent"
              requirement={getMARequirementByKpiId('ma-minor-variations-num')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Minor Variations Received"
              value={data.kpi3.currentQuarter.denominator}
              description={data.kpi3.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-minor-variations-den')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <KPIBarChart
            data={data.kpi3.quarterlyData.map(item => ({
              name: item.quarter,
              value: item.value.percentage || 0
            }))}
            title="Quarterly Minor Variation Performance"
            description="Timeliness in evaluating minor variations"
          />
        </div>

        <Separator />

        {/* KPI 4: Percentage of Major Variation MA Applications Completed Within a Specified Time Period */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 4: Major Variation Applications Completed on Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi4.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi4.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi4.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi4.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Major Variation Rate"
              value={data.kpi4.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Major variations completed on time"
              icon={<FileSearchIcon className="h-4 w-4" />}
              status={getStatus(data.kpi4.currentQuarter.percentage || 0)}
              requirement={getMARequirementByKpiId('ma-major-variations')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Major Variations Completed"
              value={data.kpi4.currentQuarter.numerator}
              description={data.kpi4.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-major-variations-num')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Major Variations Received"
              value={data.kpi4.currentQuarter.denominator}
              description={data.kpi4.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-major-variations-den')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <KPILineChart
            data={data.kpi4.quarterlyData.map(item => ({
              date: item.quarter,
              value: item.value.percentage || 0,
              target: 85
            }))}
            title="Quarterly Major Variation Performance"
            description="Major variations completed within required timelines"
          />
        </div>

        <Separator />

        {/* KPI 5: Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 5: Queries / FIRs Completed on Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi5.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi5.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi5.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi5.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Query Response Rate"
              value={data.kpi5.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Queries/FIRs completed on time"
              icon={<AlertCircleIcon className="h-4 w-4" />}
              status={getStatus(data.kpi5.currentQuarter.percentage || 0)}
              requirement={getMARequirementByKpiId('ma-queries-firs')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Queries/FIRs Completed"
              value={data.kpi5.currentQuarter.numerator}
              description={data.kpi5.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-queries-firs-num')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Queries/FIRs Received"
              value={data.kpi5.currentQuarter.denominator}
              description={data.kpi5.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-queries-firs-den')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Timing Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {data.kpi5.timingRules.map((rule, idx) => (
                    <li key={idx}>• {rule}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <KPIBarChart
              data={data.kpi5.quarterlyData.map(item => ({
                name: item.quarter,
                value: item.value.percentage || 0
              }))}
              title="Quarterly Query Response Performance"
              description="Efficiency in responding to queries and FIRs"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 6: Median Time Taken to Complete a New MA Application */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 6: Median Time for New MA Applications</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi6.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi6.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi6.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi6.maturityLevel}
              </Badge>
            </div>
          </div>

          {(() => {
            const filteredValue = getFilteredMAAnnual(data.kpi6);
            return (
              <MetricGrid columns={2}>
                <KPICardWithRequirement
                  title="Median Processing Time"
                  value={filteredValue.median?.toFixed(0) || "0"}
                  suffix=" days"
                  description="Median time to complete new MA"
                  icon={<ClockIcon className="h-4 w-4" />}
                  status="excellent"
                  requirement={getMARequirementByKpiId('ma-median-time')}
                  showRequirement={showRequirements}
                />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Formula</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{data.kpi6.formula}</p>
              </CardContent>
            </Card>
          </MetricGrid>
            );
          })()}

          {/* AMRH Extensions for KPI 6 */}
          {data.kpi6.amrhExtensions && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">AMRH Extensions - Reliance Pathways</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">KPI 6.1: Regional Reliance</h4>
                    <p className="text-xs text-muted-foreground mb-3">{data.kpi6.amrhExtensions.kpi6_1.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold">{data.kpi6.amrhExtensions.kpi6_1.value.median}</span>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">KPI 6.2: Continental Reliance</h4>
                    <p className="text-xs text-muted-foreground mb-3">{data.kpi6.amrhExtensions.kpi6_2.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold">{data.kpi6.amrhExtensions.kpi6_2.value.median}</span>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <KPIBarChart
            data={filterAnnualData(data.kpi6.annualData.map(a => ({
              year: a.year,
              ...a.value
            })), filter).map(item => ({
              name: item.year.toString(),
              value: item.median || 0
            }))}
            title="Annual Median Processing Time"
            description="Year-over-year median completion time"
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {data.kpi6.notes.map((note, idx) => (
                  <li key={idx}>• {note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* KPI 7: Average Time Taken to Complete a New MA Application */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 7: Average Time for New MA Applications</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi7.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi7.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi7.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi7.maturityLevel}
              </Badge>
            </div>
          </div>

          {(() => {
            const filteredValue = getFilteredMAAnnual(data.kpi7);
            return (
              <MetricGrid columns={3}>
                <KPICardWithRequirement
                  title="Average Processing Time"
                  value={filteredValue.average?.toFixed(1) || "0"}
                  suffix=" days"
                  description="Mean time to complete new MA"
                  icon={<ClockIcon className="h-4 w-4" />}
                  status="excellent"
                  requirement={getMARequirementByKpiId('ma-average-time')}
                  showRequirement={showRequirements}
                />
                <KPICardWithRequirement
                  title="Total Processing Days"
                  value={filteredValue.numerator?.toLocaleString() || "0"}
                  description={data.kpi7.numeratorDescription}
                  icon={<BarChart3Icon className="h-4 w-4" />}
                  status="good"
                  requirement={getMARequirementByKpiId('ma-average-time-num')}
                  showRequirement={showRequirements}
                />
                <KPICardWithRequirement
                  title="Applications Completed"
                  value={filteredValue.denominator || 0}
                  description={data.kpi7.denominatorDescription}
                  icon={<CheckCircle2Icon className="h-4 w-4" />}
                  status="good"
                  requirement={getMARequirementByKpiId('ma-average-time-den')}
                  showRequirement={showRequirements}
                />
              </MetricGrid>
            );
          })()}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {data.kpi7.notes.map((note, idx) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <KPILineChart
              data={filterAnnualData(data.kpi7.annualData.map(a => ({
                year: a.year,
                ...a.value
              })), filter).map(item => ({
                date: item.year.toString(),
                value: item.average || 0,
                target: 160
              }))}
              title="Annual Average Processing Time"
              description="Year-over-year improvement trend"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 8: Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-600">KPI 8: Public Assessment Reports (PARs) Published on Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi8.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi8.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi8.type}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700">
                Level {data.kpi8.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Publication Rate"
              value={data.kpi8.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="PARs published on time"
              icon={<FileTextIcon className="h-4 w-4" />}
              status={getStatus(data.kpi8.currentQuarter.percentage || 0)}
              requirement={getMARequirementByKpiId('ma-pars-published')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="PARs Published"
              value={data.kpi8.currentQuarter.numerator}
              description={data.kpi8.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-pars-published-num')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total MAs Granted"
              value={data.kpi8.currentQuarter.denominator}
              description={data.kpi8.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getMARequirementByKpiId('ma-pars-published-den')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Specified Timelines by NRA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm font-medium">EFDA</span>
                    <Badge variant="outline">{data.kpi8.specifiedTimelines.efda}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm font-medium">TMDA</span>
                    <Badge variant="outline">{data.kpi8.specifiedTimelines.tmda}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm font-medium">Rwanda FDA</span>
                    <Badge variant="outline">{data.kpi8.specifiedTimelines.rwandaFDA}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm font-medium">Uganda NDA</span>
                    <Badge variant="outline">{data.kpi8.specifiedTimelines.ugandaNDA}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <KPILineChart
              data={data.kpi8.quarterlyData.map(item => ({
                date: item.quarter,
                value: item.value.percentage || 0,
                target: 85
              }))}
              title="Quarterly Publication Performance"
              description="Transparency through timely PAR publication"
            />
          </div>
        </div>

        {/* Harmonization Summary */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-purple-600" />
              Harmonization Status
            </CardTitle>
            <CardDescription>
              Regional Alignment across NRAs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Fully Harmonized (All 4 NRAs)</p>
                <p className="text-xs">KPI 6, KPI 7</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Harmonized (3 NRAs)</p>
                <p className="text-xs">KPI 1, KPI 2, KPI 3, KPI 4, KPI 5, KPI 8</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-2">NRA-Specific Notes</p>
                <p className="text-xs">UNDA uses target-based denominators for KPI 1, 3, 4, 5</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * TMDA (Tanzania), EFDA (Ethiopia), Rwanda FDA, UNDA (Uganda)
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </AuthGuard>
  );
}
