"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { KPICardWithRequirement, MetricGrid, RequirementToggle } from "@/components/kpi";
import { KPILineChart, KPIBarChart } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { clinicalTrialKPIData, ctKPIMetadata } from "@/data/clinical-trial-dummy-data";
import { getCTRequirementByKpiId } from "@/data/ct-requirements-mapping";
import {
  FlaskConicalIcon,
  ClockIcon,
  CheckCircle2Icon,
  FileTextIcon,
  ShieldCheckIcon,
  ClipboardListIcon,
  AlertCircleIcon,
  InfoIcon
} from "lucide-react";

export default function ClinicalTrialsPage() {
  const data = clinicalTrialKPIData;
  const [showRequirements, setShowRequirements] = useState(false);

  return (
    <AuthGuard>
      <DashboardLayout>
      {/* Requirement Toggle */}
      <RequirementToggle 
        enabled={showRequirements}
        onChange={setShowRequirements}
        category="Clinical Trial"
      />
      
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FlaskConicalIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight">Clinical Trials KPIs</h1>
          </div>
          <p className="text-muted-foreground">
            Official harmonized KPIs for Clinical Trial regulatory performance monitoring across NRAs (TMDA, EFDA, RFDA, UNDA)
          </p>
        </div>

        {/* KPI 1: % of new CT applications evaluated within timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileTextIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle>KPI 1: New CT Applications Evaluated Within Timeline</CardTitle>
                  <CardDescription className="mt-1">{ctKPIMetadata[0].definition}</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant="outline" className="bg-green-100 text-green-800">Quarterly</Badge>
                <Badge variant="outline">Process</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MetricGrid columns={3}>
              <KPICardWithRequirement
                title="Performance Rate"
                value={data.kpi1.percentage}
                suffix="%"
                description={`${data.kpi1.numerator} of ${data.kpi1.denominator} evaluated on time`}
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                status={data.kpi1.percentage >= 85 ? "excellent" : "warning"}
                trend="up"
                trendValue="+2.3%"
                requirement={getCTRequirementByKpiId('ct-kpi-1')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Numerator"
                value={data.kpi1.numerator}
                description="Apps evaluated within timeline"
                icon={<FileTextIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-1')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Denominator"
                value={data.kpi1.denominator}
                description="Total new CT apps received"
                icon={<FileTextIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-1')}
                showRequirement={showRequirements}
              />
            </MetricGrid>
            <div className="mt-4">
              <KPIBarChart
                data={data.kpi1.quarterlyData.map(q => ({
                  name: q.quarter,
                  value: q.percentage,
                  target: q.target
                }))}
                title="Quarterly Performance"
                description="Performance by quarter against 85% target"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: % of CT amendments evaluated within timelines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardListIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle>KPI 2: CT Amendments Evaluated Within Timelines</CardTitle>
                  <CardDescription className="mt-1">{ctKPIMetadata[1].definition}</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant="outline" className="bg-green-100 text-green-800">Quarterly</Badge>
                <Badge variant="outline">Process</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MetricGrid columns={3}>
              <KPICardWithRequirement
                title="Performance Rate"
                value={data.kpi2.percentage}
                suffix="%"
                description={`${data.kpi2.numerator} of ${data.kpi2.denominator} amendments reviewed on time`}
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                status={data.kpi2.percentage >= 85 ? "excellent" : "warning"}
                trend="up"
                trendValue="+1.8%"
                requirement={getCTRequirementByKpiId('ct-kpi-2')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Numerator"
                value={data.kpi2.numerator}
                description="Amendments evaluated on time"
                icon={<ClipboardListIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-2')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Denominator"
                value={data.kpi2.denominator}
                description="Total amendments received"
                icon={<ClipboardListIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-2')}
                showRequirement={showRequirements}
              />
            </MetricGrid>
            <div className="mt-4">
              <KPIBarChart
                data={data.kpi2.quarterlyData.map(q => ({
                  name: q.quarter,
                  value: q.percentage,
                  target: q.target
                }))}
                title="Quarterly Amendment Review Performance"
                description="Protocol amendments evaluated within specified timelines"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: % of approved & ongoing CTs inspected as per GCP plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle>KPI 3: CTs Inspected as per GCP Plan</CardTitle>
                  <CardDescription className="mt-1">{ctKPIMetadata[2].definition}</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant="outline" className="bg-purple-100 text-purple-800">Annual</Badge>
                <Badge variant="outline">Output</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MetricGrid columns={3}>
              <KPICardWithRequirement
                title="Inspection Completion Rate"
                value={data.kpi3.percentage}
                suffix="%"
                description={`${data.kpi3.numerator} of ${data.kpi3.denominator} planned inspections completed`}
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                status={data.kpi3.percentage >= 80 ? "excellent" : "warning"}
                trend="up"
                trendValue="+3.0%"
                requirement={getCTRequirementByKpiId('ct-kpi-3')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Inspections Completed"
                value={data.kpi3.numerator}
                description="GCP inspections conducted"
                icon={<ShieldCheckIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-3')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Scheduled Inspections"
                value={data.kpi3.denominator}
                description="Total planned for the year"
                icon={<ShieldCheckIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-3')}
                showRequirement={showRequirements}
              />
            </MetricGrid>
            <div className="mt-4">
              <KPILineChart
                data={data.kpi3.annualData.map(y => ({
                  date: y.year.toString(),
                  value: y.percentage,
                  target: y.target
                }))}
                title="Annual GCP Inspection Performance"
                description="Inspection completion trend over years"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: % of field & safety reports assessed within timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircleIcon className="h-5 w-5 text-orange-600" />
                <div>
                  <CardTitle>KPI 4: Field & Safety Reports Assessed Within Timeline</CardTitle>
                  <CardDescription className="mt-1">{ctKPIMetadata[3].definition}</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant="outline" className="bg-green-100 text-green-800">Quarterly</Badge>
                <Badge variant="outline">Process</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MetricGrid columns={3}>
              <KPICardWithRequirement
                title="Assessment Rate"
                value={data.kpi4.percentage}
                suffix="%"
                description={`${data.kpi4.numerator} of ${data.kpi4.denominator} reports assessed on time`}
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                status={data.kpi4.percentage >= 85 ? "excellent" : "warning"}
                trend="up"
                trendValue="+4.1%"
                requirement={getCTRequirementByKpiId('ct-kpi-4')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Reports Assessed"
                value={data.kpi4.numerator}
                description="Assessed within timeline"
                icon={<AlertCircleIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-4')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Total Reports"
                value={data.kpi4.denominator}
                description="Safety reports received"
                icon={<AlertCircleIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-4')}
                showRequirement={showRequirements}
              />
            </MetricGrid>
          </CardContent>
        </Card>

        {/* KPI 5: % of CTs compliant with GCP requirements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle>KPI 5: CTs Compliant with GCP Requirements</CardTitle>
                  <CardDescription className="mt-1">{ctKPIMetadata[4].definition}</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant="outline" className="bg-green-100 text-green-800">Quarterly</Badge>
                <Badge variant="outline">Outcome</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MetricGrid columns={3}>
              <KPICardWithRequirement
                title="GCP Compliance Rate"
                value={data.kpi5.percentage}
                suffix="%"
                description={`${data.kpi5.numerator} of ${data.kpi5.denominator} CTs compliant`}
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                status={data.kpi5.percentage >= 80 ? "excellent" : "warning"}
                trend="stable"
                requirement={getCTRequirementByKpiId('ct-kpi-5')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="Compliant CTs"
                value={data.kpi5.numerator}
                description="Meeting GCP standards"
                icon={<ShieldCheckIcon className="h-4 w-4" />}
                status="excellent"
                requirement={getCTRequirementByKpiId('ct-kpi-5')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="CTs Inspected"
                value={data.kpi5.denominator}
                description="Total inspected for GCP"
                icon={<ShieldCheckIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-5')}
                showRequirement={showRequirements}
              />
            </MetricGrid>
          </CardContent>
        </Card>

        {/* KPI 6, 7, 8 in a row */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* KPI 6: % of approved CTs listed in national registry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI 6: CTs in National Registry</CardTitle>
              <CardDescription className="text-xs">{ctKPIMetadata[5].definition}</CardDescription>
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-xs">Quarterly</Badge>
                <Badge variant="outline" className="text-xs">Output</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <KPICardWithRequirement
                title="Registry Publication Rate"
                value={data.kpi6.percentage}
                suffix="%"
                description={`${data.kpi6.numerator}/${data.kpi6.denominator} published`}
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                status="excellent"
                requirement={getCTRequirementByKpiId('ct-kpi-6')}
                showRequirement={showRequirements}
              />
            </CardContent>
          </Card>

          {/* KPI 7: % of CAPA evaluated within timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI 7: CAPA Evaluation</CardTitle>
              <CardDescription className="text-xs">{ctKPIMetadata[6].definition}</CardDescription>
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-xs">Quarterly</Badge>
                <Badge variant="outline" className="text-xs">Process</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <KPICardWithRequirement
                title="CAPA Evaluation Rate"
                value={data.kpi7.percentage}
                suffix="%"
                description={`${data.kpi7.numerator}/${data.kpi7.denominator} evaluated`}
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                status="excellent"
                requirement={getCTRequirementByKpiId('ct-kpi-7')}
                showRequirement={showRequirements}
              />
            </CardContent>
          </Card>

          {/* KPI 8: Average turnaround time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI 8: Evaluation Turnaround Time</CardTitle>
              <CardDescription className="text-xs">{ctKPIMetadata[7].definition}</CardDescription>
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-xs">Quarterly</Badge>
                <Badge variant="outline" className="text-xs">Process</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <KPICardWithRequirement
                title="Average Time"
                value={data.kpi8.averageDays}
                suffix=" days"
                description={`Target: 60 days`}
                icon={<ClockIcon className="h-4 w-4" />}
                status={data.kpi8.averageDays <= 60 ? "excellent" : "warning"}
                trend="down"
                trendValue="-3.2 days"
                requirement={getCTRequirementByKpiId('ct-kpi-8')}
                showRequirement={showRequirements}
              />
            </CardContent>
          </Card>
        </div>

        {/* Supplemental KPIs for Ethiopia FDA */}
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <InfoIcon className="h-5 w-5 text-purple-600" />
              <CardTitle>Supplemental KPIs - Ethiopia FDA (EFDA)</CardTitle>
            </div>
            <CardDescription>Additional KPIs tracked specifically by Ethiopia FDA</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricGrid columns={3}>
              <KPICardWithRequirement
                title="KPI 2.1: Amendments Evaluated"
                value={data.supplemental.kpi2_1.percentage}
                suffix="%"
                description={`${data.supplemental.kpi2_1.numerator}/${data.supplemental.kpi2_1.denominator} evaluated`}
                icon={<ClipboardListIcon className="h-4 w-4" />}
                status="excellent"
                requirement={getCTRequirementByKpiId('ct-kpi-2-1')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="KPI 3.1: Regulatory Measures"
                value={data.supplemental.kpi3_1.percentage}
                suffix="%"
                description={`${data.supplemental.kpi3_1.numerator} measures taken`}
                icon={<AlertCircleIcon className="h-4 w-4" />}
                status="good"
                requirement={getCTRequirementByKpiId('ct-kpi-3-1')}
                showRequirement={showRequirements}
              />
              <KPICardWithRequirement
                title="KPI 4.1: Safety Reports Assessed"
                value={data.supplemental.kpi4_1.percentage}
                suffix="%"
                description={`${data.supplemental.kpi4_1.numerator}/${data.supplemental.kpi4_1.denominator} assessed`}
                icon={<AlertCircleIcon className="h-4 w-4" />}
                status="excellent"
                requirement={getCTRequirementByKpiId('ct-kpi-4-1')}
                showRequirement={showRequirements}
              />
            </MetricGrid>
          </CardContent>
        </Card>

        {/* KPI Metadata Reference */}
        {showRequirements && (
          <Card>
            <CardHeader>
              <CardTitle>KPI Metadata & Formulas</CardTitle>
              <CardDescription>Complete specifications for all Clinical Trial KPIs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ctKPIMetadata.slice(0, 8).map((kpi, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">{kpi.kpiNumber}</Badge>
                      <span className="font-semibold text-sm">{kpi.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{kpi.definition}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-medium">Formula:</span> {kpi.formula}</div>
                      <div><span className="font-medium">Unit:</span> {kpi.unit}</div>
                      <div><span className="font-medium">Frequency:</span> {kpi.reportingFrequency}</div>
                      <div><span className="font-medium">Type:</span> {kpi.indicatorType}</div>
                    </div>
                    {kpi.notes.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="font-medium">Notes:</span>
                        <ul className="list-disc list-inside ml-2">
                          {kpi.notes.map((note, i) => (
                            <li key={i} className="text-muted-foreground">{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
    </AuthGuard>
  );
}
