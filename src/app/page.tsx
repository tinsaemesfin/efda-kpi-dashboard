"use client";

import { DashboardLayout } from "@/components/layout";
import { KPICard, MetricGrid } from "@/components/kpi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardOverview } from "@/data/dummy-data";
import { 
  ActivityIcon, 
  ClipboardCheckIcon, 
  FlaskConicalIcon, 
  ShieldCheckIcon,
  CalendarClockIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircle2Icon
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { clinicalTrials, gmpInspections, marketAuthorizations, recentActivities, upcomingDeadlines } = dashboardOverview;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'clinical_trial':
        return <FlaskConicalIcon className="h-4 w-4" />;
      case 'gmp_inspection':
        return <ShieldCheckIcon className="h-4 w-4" />;
      case 'market_authorization':
        return <ClipboardCheckIcon className="h-4 w-4" />;
      default:
        return <ActivityIcon className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EFDA KPI Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive regulatory authority performance monitoring and analytics
          </p>
        </div>

        {/* Overview Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Overview</h2>
          
          {/* Clinical Trials Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FlaskConicalIcon className="h-5 w-5 text-blue-600" />
                Clinical Trials
              </h3>
              <Link href="/clinical-trials" className="text-sm text-blue-600 hover:underline">
                View Details →
              </Link>
            </div>
            <MetricGrid columns={4}>
              <KPICard
                title="Active Trials"
                value={clinicalTrials.totalActive}
                description="Total clinical trials"
                icon={<FlaskConicalIcon className="h-4 w-4" />}
                status="good"
              />
              <KPICard
                title="New This Month"
                value={clinicalTrials.newThisMonth}
                description="New applications received"
                icon={<TrendingUpIcon className="h-4 w-4" />}
                trend="up"
                trendValue="+12%"
                status="excellent"
              />
              <KPICard
                title="Avg Processing Time"
                value={clinicalTrials.averageProcessingDays}
                suffix=" days"
                description="Target: 90 days"
                status="excellent"
              />
              <KPICard
                title="Compliance Rate"
                value={clinicalTrials.complianceRate}
                suffix="%"
                description="Protocol adherence"
                status="excellent"
              />
            </MetricGrid>
          </div>

          {/* GMP Inspections Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                GMP Inspections
              </h3>
              <Link href="/gmp-inspections" className="text-sm text-green-600 hover:underline">
                View Details →
              </Link>
            </div>
            <MetricGrid columns={4}>
              <KPICard
                title="Total Inspections"
                value={gmpInspections.totalInspections}
                description="All time inspections"
                icon={<ShieldCheckIcon className="h-4 w-4" />}
                status="good"
              />
              <KPICard
                title="Completed This Month"
                value={gmpInspections.completedThisMonth}
                description="Monthly completions"
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                trend="up"
                trendValue="+8%"
                status="good"
              />
              <KPICard
                title="Compliance Rate"
                value={gmpInspections.complianceRate}
                suffix="%"
                description="Facility compliance"
                status="good"
              />
              <KPICard
                title="Critical Findings"
                value={gmpInspections.criticalFindings}
                description="Requires immediate action"
                icon={<AlertTriangleIcon className="h-4 w-4" />}
                status="warning"
              />
            </MetricGrid>
          </div>

          {/* Market Authorizations Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <ClipboardCheckIcon className="h-5 w-5 text-purple-600" />
                Market Authorizations
              </h3>
              <Link href="/market-authorizations" className="text-sm text-purple-600 hover:underline">
                View Details →
              </Link>
            </div>
            <MetricGrid columns={4}>
              <KPICard
                title="Total Applications"
                value={marketAuthorizations.totalApplications}
                description="All time applications"
                icon={<ClipboardCheckIcon className="h-4 w-4" />}
                status="good"
              />
              <KPICard
                title="Approved This Month"
                value={marketAuthorizations.approvedThisMonth}
                description="Monthly approvals"
                icon={<CheckCircle2Icon className="h-4 w-4" />}
                trend="up"
                trendValue="+15%"
                status="excellent"
              />
              <KPICard
                title="Avg Review Time"
                value={marketAuthorizations.averageReviewDays}
                suffix=" days"
                description="Target: 300 days"
                status="excellent"
              />
              <KPICard
                title="Approval Rate"
                value={marketAuthorizations.approvalRate}
                suffix="%"
                description="Overall approval rate"
                status="good"
              />
            </MetricGrid>
          </div>
        </div>

        {/* Recent Activities and Upcoming Deadlines */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="h-5 w-5" />
                Recent Activities
              </CardTitle>
              <CardDescription>Latest regulatory activities and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="mt-1">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(activity.status)}`}>
                          {activity.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClockIcon className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription>Important dates and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="mt-1">{getActivityIcon(deadline.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{deadline.title}</p>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(deadline.priority)}`}>
                          {deadline.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(deadline.dueDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {deadline.daysRemaining} days remaining
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
