"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { KPICardWithRequirement, MetricGrid, RequirementToggle } from "@/components/kpi";
import { KPILineChart, KPIBarChart } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { gmpKPIData } from "@/data/gmp-dummy-data";
import { getGMPRequirementByKpiId } from "@/data/gmp-requirements-mapping";
import {
  ShieldCheckIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  BarChart3Icon
} from "lucide-react";

export default function GMPInspectionsPage() {
  const data = gmpKPIData;
  const [showRequirements, setShowRequirements] = useState(false);

  // Helper function to get status based on percentage
  const getStatus = (percentage: number): "excellent" | "good" | "warning" | "critical" => {
    if (percentage >= 90) return "excellent";
    if (percentage >= 80) return "good";
    if (percentage >= 70) return "warning";
    return "critical";
  };

  // Helper function to get trend icon
  const getTrendIcon = (currentValue: number, previousValue: number) => {
    if (currentValue > previousValue) {
      return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
    } else if (currentValue < previousValue) {
      return <TrendingDownIcon className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <DashboardLayout>
      {/* Requirement Toggle */}
      <RequirementToggle 
        enabled={showRequirements}
        onChange={setShowRequirements}
        category="GMP Inspections"
      />
      
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheckIcon className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold tracking-tight">GMP Inspections KPIs</h1>
          </div>
          <p className="text-muted-foreground">
            Good Manufacturing Practice inspection metrics based on harmonized East African Community standards
          </p>
        </div>

        {/* KPI 1: Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 1: Facilities Inspected as per Plan</h2>
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

          <MetricGrid columns={4}>
            <KPICardWithRequirement
              title="Performance Rate"
              value={data.kpi1.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description={`${data.kpi1.numeratorDescription}`}
              icon={<ShieldCheckIcon className="h-4 w-4" />}
              status={getStatus(data.kpi1.currentQuarter.percentage || 0)}
              requirement={getGMPRequirementByKpiId('gmp-facilities-inspected')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Facilities Inspected"
              value={data.kpi1.currentQuarter.numerator}
              description="As per the plan"
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-facilities-inspected')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Planned Inspections"
              value={data.kpi1.currentQuarter.denominator}
              description="Total facilities planned"
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-facilities-inspected')}
              showRequirement={showRequirements}
            />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Formula</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-muted px-2 py-1 rounded">{data.kpi1.formula}</code>
                <p className="text-xs text-muted-foreground mt-2">Unit: {data.kpi1.unit}</p>
              </CardContent>
            </Card>
          </MetricGrid>

          {/* Disaggregations for KPI 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inspection Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{data.kpi1.disaggregations.onsiteDomestic.label}</span>
                  <span className="text-lg font-bold">{data.kpi1.disaggregations.onsiteDomestic.value}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{data.kpi1.disaggregations.onsiteForeign.label}</span>
                  <span className="text-lg font-bold">{data.kpi1.disaggregations.onsiteForeign.value}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{data.kpi1.disaggregations.jointOnsiteForeign.label}</span>
                  <span className="text-lg font-bold">{data.kpi1.disaggregations.jointOnsiteForeign.value}</span>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                {data.kpi1.notes.map((note, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">• {note}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quarterly Trends for KPI 1 */}
          <KPIBarChart
            data={data.kpi1.quarterlyData.map(item => ({
              name: item.quarter,
              value: item.value.percentage || 0
            }))}
            title="Quarterly Performance Trend"
            description="Percentage of facilities inspected as per plan"
          />
        </div>

        <Separator />

        {/* KPI 2: Percentage of complaint-triggered GMP inspections conducted */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 2: Complaint-Triggered Inspections</h2>
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
              title="Response Rate"
              value={data.kpi2.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Complaints addressed"
              icon={<AlertTriangleIcon className="h-4 w-4" />}
              status={getStatus(data.kpi2.currentQuarter.percentage || 0)}
              requirement={getGMPRequirementByKpiId('gmp-complaint-inspections')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Inspections Conducted"
              value={data.kpi2.currentQuarter.numerator}
              description={data.kpi2.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-complaint-inspections')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Complaints Requiring Inspection"
              value={data.kpi2.currentQuarter.denominator}
              description={data.kpi2.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-complaint-inspections')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inspection Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{data.kpi2.disaggregations.domestic.label}</span>
                    <span className="font-bold">{data.kpi2.disaggregations.domestic.value}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{data.kpi2.disaggregations.foreign.label}</span>
                    <span className="font-bold">{data.kpi2.disaggregations.foreign.value}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <KPILineChart
              data={data.kpi2.quarterlyData.map(item => ({
                date: item.quarter,
                value: item.value.percentage || 0,
                target: 85
              }))}
              title="Quarterly Response Rate"
              description="Percentage of complaints addressed"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 3: Percentage of GMP on-site inspections waived */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 3: On-Site Inspections Waived</h2>
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
              title="Waiver Rate"
              value={data.kpi3.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Remote/desk reviews"
              icon={<FileTextIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-inspections-waived')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Inspections Waived"
              value={data.kpi3.currentQuarter.numerator}
              description={data.kpi3.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-inspections-waived')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total Inspections Completed"
              value={data.kpi3.currentQuarter.denominator}
              description={data.kpi3.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-inspections-waived')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <KPILineChart
            data={data.kpi3.quarterlyData.map(item => ({
              date: item.quarter,
              value: item.value.percentage || 0,
              target: 25
            }))}
            title="Quarterly Waiver Trend"
            description="Use of risk-based and reliance mechanisms"
          />
        </div>

        <Separator />

        {/* KPI 4: Percentage of facilities compliant with GMP requirements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 4: Facilities Compliant with GMP</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi4.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi4.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {data.kpi4.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi4.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Compliance Rate"
              value={data.kpi4.currentYear.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="GMP compliance"
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status={getStatus(data.kpi4.currentYear.percentage || 0)}
              requirement={getGMPRequirementByKpiId('gmp-facilities-compliant')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Compliant Facilities"
              value={data.kpi4.currentYear.numerator}
              description={data.kpi4.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="excellent"
              requirement={getGMPRequirementByKpiId('gmp-facilities-compliant')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total Facilities Inspected"
              value={data.kpi4.currentYear.denominator}
              description={data.kpi4.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-facilities-compliant')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compliance Breakdown by Inspection Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.kpi4.disaggregations).map(([key, item]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">{item.label}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <KPILineChart
              data={data.kpi4.annualData.map(item => ({
                date: item.year,
                value: item.value.percentage || 0,
                target: 90
              }))}
              title="Annual Compliance Trend"
              description="Year-over-year compliance improvement"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 5: Percentage of final CAPA decisions issued within a specified timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 5: CAPA Decisions Within Timeline</h2>
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
              title="On-Time Rate"
              value={data.kpi5.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="CAPA decisions on time"
              icon={<ClockIcon className="h-4 w-4" />}
              status={getStatus(data.kpi5.currentQuarter.percentage || 0)}
              requirement={getGMPRequirementByKpiId('gmp-capa-decisions')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Decisions Issued on Time"
              value={data.kpi5.currentQuarter.numerator}
              description={data.kpi5.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-capa-decisions')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total CAPA Responses"
              value={data.kpi5.currentQuarter.denominator}
              description={data.kpi5.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-capa-decisions')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CAPA Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{data.kpi5.disaggregations.directInspections.label}</span>
                    <span className="font-bold">{data.kpi5.disaggregations.directInspections.value}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{data.kpi5.disaggregations.jointInspections.label}</span>
                    <span className="font-bold">{data.kpi5.disaggregations.jointInspections.value}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <KPIBarChart
              data={data.kpi5.quarterlyData.map(item => ({
                name: item.quarter,
                value: item.value.percentage || 0
              }))}
              title="Quarterly CAPA Performance"
              description="Efficiency in evaluating CAPA responses"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 6: Percentage of GMP inspection applications completed within the set timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 6: Applications Completed Within Timeline</h2>
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

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="On-Time Completion Rate"
              value={data.kpi6.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Within SLA timeline"
              icon={<ClockIcon className="h-4 w-4" />}
              status={getStatus(data.kpi6.currentQuarter.percentage || 0)}
              requirement={getGMPRequirementByKpiId('gmp-applications-timeline')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Applications Completed on Time"
              value={data.kpi6.currentQuarter.numerator}
              description={data.kpi6.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-applications-timeline')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total Applications Received"
              value={data.kpi6.currentQuarter.denominator}
              description={data.kpi6.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-applications-timeline')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.kpi6.disaggregations).map(([key, item]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">{item.label}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold mb-2">Stop-Clock Rules:</p>
                  {data.kpi6.stopClockRules.map((rule, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">• {rule}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <KPILineChart
              data={data.kpi6.quarterlyData.map(item => ({
                date: item.quarter,
                value: item.value.percentage || 0,
                target: 90
              }))}
              title="Quarterly Completion Rate"
              description="Applications completed within SLA"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 7: Average turnaround time to complete GMP applications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 7: Average Turnaround Time</h2>
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

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Average Processing Time"
              value={data.kpi7.currentQuarter.average?.toFixed(1) || "0"}
              suffix=" days"
              description="Average completion time"
              icon={<ClockIcon className="h-4 w-4" />}
              status="excellent"
              requirement={getGMPRequirementByKpiId('gmp-average-turnaround')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total Processing Days"
              value={data.kpi7.currentQuarter.numerator.toLocaleString()}
              description={data.kpi7.numeratorDescription}
              icon={<BarChart3Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-average-turnaround')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Applications Completed"
              value={data.kpi7.currentQuarter.denominator}
              description={data.kpi7.denominatorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-average-turnaround')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Time by Inspection Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.kpi7.disaggregations).map(([key, item]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">{item.label}</span>
                      <span className="font-bold">{item.value} days</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <KPILineChart
              data={data.kpi7.quarterlyData.map(item => ({
                date: item.quarter,
                value: item.value.average || 0,
                target: 60
              }))}
              title="Quarterly Turnaround Trend"
              description="Improving processing efficiency"
            />
          </div>
        </div>

        <Separator />

        {/* KPI 8: Median turnaround time to complete GMP inspection applications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 8: Median Turnaround Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi8.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi8.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi8.type}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Level {data.kpi8.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={2}>
            <KPICardWithRequirement
              title="Median Processing Time"
              value={data.kpi8.currentYear.median?.toFixed(1) || "0"}
              suffix=" days"
              description="Median completion time"
              icon={<ClockIcon className="h-4 w-4" />}
              status="excellent"
              requirement={getGMPRequirementByKpiId('gmp-median-turnaround')}
              showRequirement={showRequirements}
            />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Formula</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{data.kpi8.formula}</p>
                <p className="text-xs text-muted-foreground mt-2">Unit: {data.kpi8.unit}</p>
              </CardContent>
            </Card>
          </MetricGrid>

          <KPIBarChart
            data={data.kpi8.annualData.map(item => ({
              name: item.year,
              value: item.value.median || 0
            }))}
            title="Annual Median Turnaround Trend"
            description="Year-over-year median processing time"
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {data.kpi8.notes.map((note, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">• {note}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* KPI 9: Percentage of GMP inspection reports published within a specified timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-600">KPI 9: Inspection Reports Published on Time</h2>
              <p className="text-sm text-muted-foreground mt-1">{data.kpi9.definition}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {data.kpi9.reportingFrequency}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {data.kpi9.type}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700">
                Level {data.kpi9.maturityLevel}
              </Badge>
            </div>
          </div>

          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Publication Rate"
              value={data.kpi9.currentYear.percentage?.toFixed(1) || "0"}
              suffix="%"
              description="Reports published on time"
              icon={<FileTextIcon className="h-4 w-4" />}
              status={getStatus(data.kpi9.currentYear.percentage || 0)}
              requirement={getGMPRequirementByKpiId('gmp-reports-published')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Reports Published"
              value={data.kpi9.currentYear.numerator}
              description={data.kpi9.numeratorDescription}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-reports-published')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Total Inspections Completed"
              value={data.kpi9.currentYear.denominator}
              description={data.kpi9.denominatorDescription}
              icon={<ActivityIcon className="h-4 w-4" />}
              status="good"
              requirement={getGMPRequirementByKpiId('gmp-reports-published')}
              showRequirement={showRequirements}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Publication Breakdown by Inspection Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.kpi9.disaggregations).map(([key, item]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">{item.label}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t space-y-1">
                  {data.kpi9.notes.map((note, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">• {note}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <KPILineChart
              data={data.kpi9.annualData.map(item => ({
                date: item.year,
                value: item.value.percentage || 0,
                target: 85
              }))}
              title="Annual Publication Rate"
              description="Transparency and timely publication trends"
            />
          </div>
        </div>

        {/* Harmonization Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-blue-600" />
              Harmonization Status
            </CardTitle>
            <CardDescription>
              East African Community Regional Alignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Fully Harmonized (All 4 NRAs)</p>
                <p className="text-xs">KPI 3, KPI 4, KPI 5, KPI 7</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Harmonized (3 NRAs)</p>
                <p className="text-xs">KPI 1, KPI 2, KPI 6, KPI 9</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Partial Harmonization</p>
                <p className="text-xs">KPI 8 (TMDA, Rwanda FDA)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * TMDA (Tanzania), EFDA (Ethiopia), Rwanda FDA, UNDA (Uganda)
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
