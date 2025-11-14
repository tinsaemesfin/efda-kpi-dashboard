"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { KPICardWithRequirement, MetricGrid, StatsCard, RequirementToggle } from "@/components/kpi";
import { KPILineChart, KPIBarChart, KPIPieChart } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { marketAuthorizationData } from "@/data/dummy-data";
import { marketAuthorizationRequirements, getRequirementByKpiId } from "@/data/requirements-mapping";
import {
  ClipboardCheckIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  FileTextIcon,
  TrendingUpIcon,
  PillIcon,
  StarIcon
} from "lucide-react";

export default function MarketAuthorizationsPage() {
  const data = marketAuthorizationData;
  const [showRequirements, setShowRequirements] = useState(false);

  return (
    <DashboardLayout>
      {/* Requirement Toggle */}
      <RequirementToggle 
        enabled={showRequirements}
        onChange={setShowRequirements}
        category="Market Authorization"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheckIcon className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold tracking-tight">Market Authorization KPIs</h1>
          </div>
          <p className="text-muted-foreground">
            Comprehensive tracking of drug authorization applications, review timelines, and approval metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Application Overview</h2>
          <MetricGrid columns={4}>
            <KPICardWithRequirement
              title="Total Applications"
              value={data.totalApplications}
              description="All time applications"
              icon={<FileTextIcon className="h-4 w-4" />}
              trend="up"
              trendValue="+11.3%"
              status="good"
              requirement={getRequirementByKpiId('ma-total-applications', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Pending Applications"
              value={data.pendingApplications}
              description="Currently under review"
              icon={<ClockIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-pending-applications', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Approved Applications"
              value={data.approvedApplications}
              description={`${data.approvalRate.toFixed(1)}% approval rate`}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              trend="up"
              trendValue="+7.2%"
              status="excellent"
              requirement={getRequirementByKpiId('ma-approved-applications', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Rejected Applications"
              value={data.rejectedApplications}
              description={`${((data.rejectedApplications / data.totalApplications) * 100).toFixed(1)}% rejection rate`}
              icon={<XCircleIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-rejected-applications', 'MA')}
              showRequirement={showRequirements}
            />
          </MetricGrid>
        </div>

        {/* Review Timeline Metrics */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Review Timeline Performance</h2>
          <MetricGrid columns={3}>
            <KPICardWithRequirement
              title="Average Review Time"
              value={data.averageReviewTime}
              suffix=" days"
              description={`Target: ${data.targetReviewTime} days`}
              icon={<ClockIcon className="h-4 w-4" />}
              status={data.averageReviewTime <= data.targetReviewTime ? "excellent" : "warning"}
              trend="down"
              trendValue="-22 days"
              requirement={getRequirementByKpiId('ma-avg-review-time', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Median Review Time"
              value={data.medianReviewTime}
              suffix=" days"
              description="50th percentile"
              status="excellent"
              requirement={getRequirementByKpiId('ma-median-review-time', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Target Achievement"
              value={((data.targetReviewTime - data.averageReviewTime) / data.targetReviewTime * 100).toFixed(1)}
              suffix="%"
              description="Ahead of target"
              status="excellent"
              trend="up"
              trendValue="+5%"
              requirement={getRequirementByKpiId('ma-target-achievement', 'MA')}
              showRequirement={showRequirements}
            />
          </MetricGrid>
        </div>

        {/* Product Type Metrics */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Application Types</h2>
          <MetricGrid columns={4}>
            <KPICardWithRequirement
              title="New Drug Applications"
              value={data.newDrugApplications}
              description={`${((data.newDrugApplications / data.totalApplications) * 100).toFixed(1)}% of total`}
              icon={<PillIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-new-drug-applications', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Generic Applications"
              value={data.genericApplications}
              description={`${((data.genericApplications / data.totalApplications) * 100).toFixed(1)}% of total`}
              icon={<FileTextIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-generic-applications', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Biosimilar Applications"
              value={data.biosimilarApplications}
              description={`${((data.biosimilarApplications / data.totalApplications) * 100).toFixed(1)}% of total`}
              icon={<PillIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-biosimilar-applications', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Withdrawn Applications"
              value={data.withdrawnApplications}
              description="Voluntarily withdrawn"
              icon={<AlertTriangleIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-withdrawn-applications', 'MA')}
              showRequirement={showRequirements}
            />
          </MetricGrid>
        </div>

        {/* Priority and Performance Metrics */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Review Priority & Performance</h2>
          <MetricGrid columns={4}>
            <KPICardWithRequirement
              title="Priority Reviews"
              value={data.priorityReviews}
              description="Expedited review track"
              icon={<StarIcon className="h-4 w-4" />}
              status="excellent"
              requirement={getRequirementByKpiId('ma-priority-reviews', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Standard Reviews"
              value={data.standardReviews}
              description="Regular review process"
              icon={<FileTextIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-standard-reviews', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="First Cycle Approval Rate"
              value={data.firstCycleApprovalRate}
              suffix="%"
              description="Approved in first cycle"
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              trend="up"
              trendValue="+4.2%"
              status="excellent"
              requirement={getRequirementByKpiId('ma-first-cycle-approval', 'MA')}
              showRequirement={showRequirements}
            />
            <KPICardWithRequirement
              title="Orphan Drug Designations"
              value={data.orphanDrugDesignations}
              description="Rare disease treatments"
              icon={<StarIcon className="h-4 w-4" />}
              status="good"
              requirement={getRequirementByKpiId('ma-orphan-drug', 'MA')}
              showRequirement={showRequirements}
            />
          </MetricGrid>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Application Trends */}
          <KPILineChart
            data={data.applicationTrends.map(item => ({
              date: item.label || item.date,
              value: item.value,
              target: item.target
            }))}
            title="Monthly Application Trends"
            description="Number of applications received per month"
          />

          {/* Review Time Trends */}
          <KPILineChart
            data={data.reviewTimeTrends.map(item => ({
              date: item.label || item.date,
              value: item.value,
              target: item.target
            }))}
            title="Review Time Trends"
            description="Average review time in days"
          />
        </div>

        {/* Distribution Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Type Distribution */}
          <KPIPieChart
            data={data.productTypeDistribution.map(item => ({
              name: item.name,
              value: item.value
            }))}
            title="Product Type Distribution"
            description="Distribution by application type"
          />

          {/* Approval Rate Trends */}
          <KPIBarChart
            data={data.approvalRateTrends.slice(-6).map(item => ({
              name: item.label || item.date,
              value: item.value,
              target: item.target
            }))}
            title="Approval Rate Trends"
            description="Monthly approval rates (%)"
          />
        </div>

        {/* Therapeutic Area Distribution */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Therapeutic Area Distribution</CardTitle>
              <CardDescription>Applications by therapeutic category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.therapeuticAreaDistribution.map((area, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{area.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {area.value} ({area.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${area.percentage}%`,
                          backgroundColor: area.color || '#8b5cf6'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Application Status Breakdown */}
          <StatsCard
            title="Application Status"
            description="Current status of all applications"
            stats={[
              {
                label: "Approved",
                value: data.approvedApplications,
                total: data.totalApplications,
                percentage: (data.approvedApplications / data.totalApplications) * 100
              },
              {
                label: "Pending",
                value: data.pendingApplications,
                total: data.totalApplications,
                percentage: (data.pendingApplications / data.totalApplications) * 100
              },
              {
                label: "Rejected",
                value: data.rejectedApplications,
                total: data.totalApplications,
                percentage: (data.rejectedApplications / data.totalApplications) * 100
              },
              {
                label: "Withdrawn",
                value: data.withdrawnApplications,
                total: data.totalApplications,
                percentage: (data.withdrawnApplications / data.totalApplications) * 100
              }
            ]}
          />

          {/* Product Types */}
          <StatsCard
            title="Product Type Breakdown"
            description="Distribution by product category"
            stats={data.productTypeDistribution.map(type => ({
              label: type.name,
              value: type.value,
              total: data.totalApplications,
              percentage: type.percentage
            }))}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Review Time:</span>
                <span className="font-medium">{data.averageReviewTime} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">vs Target:</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {data.targetReviewTime - data.averageReviewTime} days ahead
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Performance:</span>
                <span className="font-medium text-green-600">Excellent</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approval Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Rate:</span>
                <span className="font-medium">{data.approvalRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">First Cycle:</span>
                <span className="font-medium">{data.firstCycleApprovalRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  High Performance
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workload Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Applications:</span>
                <span className="font-medium">{data.totalApplications}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">In Review:</span>
                <span className="font-medium">{data.pendingApplications}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Priority Reviews:</span>
                <span className="font-medium text-purple-600">{data.priorityReviews}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

