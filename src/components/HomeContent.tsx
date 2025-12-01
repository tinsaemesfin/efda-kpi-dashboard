'use client';

import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from "@/components/layout";
import { KPICard, MetricGrid } from "@/components/kpi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clinicalTrialKPIData } from "@/data/clinical-trial-dummy-data";
import { gmpKPIData } from "@/data/gmp-dummy-data";
import { maKPIData } from "@/data/ma-dummy-data";
import { 
  FlaskConicalIcon, 
  ShieldCheckIcon,
  ClipboardCheckIcon,
  TrendingUpIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  FileTextIcon,
  ActivityIcon,
  ArrowRightIcon
} from "lucide-react";
import Link from "next/link";

export default function HomeContent() {
  const { profile } = useAuth();
  const ctData = clinicalTrialKPIData;
  const gmpData = gmpKPIData;
  const maData = maKPIData;

  // Helper function to safely calculate trend
  const calculateTrend = (currentValue: number, trendData: any[] | undefined): string | undefined => {
    if (!trendData || trendData.length < 2) return undefined;
    
    // Handle different data structures
    const previousItem = trendData[trendData.length - 2];
    let previousValue: number;
    
    // Check if it's GMP/MA structure with nested value object
    if (previousItem.value && typeof previousItem.value === 'object') {
      previousValue = previousItem.value.percentage || 0;
    } 
    // Check if it's CT structure with direct percentage
    else if (previousItem.percentage !== undefined) {
      previousValue = previousItem.percentage;
    } 
    // Fallback
    else {
      return undefined;
    }
    
    const difference = currentValue - previousValue;
    return difference > 0 ? `+${difference.toFixed(1)}%` : `${difference.toFixed(1)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                EFDA KPI Dashboard
              </h1>
              <p className="text-lg text-muted-foreground">
                Comprehensive regulatory performance monitoring across Clinical Trials, GMP Inspections, and Market Authorizations
              </p>
            </div>
            {profile && (
              <div className="text-right">
                <p className="text-sm font-medium">Welcome, {profile.given_name || profile.email}</p>
                {profile.role ? <p className="text-xs text-muted-foreground">{String(profile.role)}</p> : null}
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConicalIcon className="h-5 w-5 text-blue-600" />
                Clinical Trials
              </CardTitle>
              <CardDescription>8 Main KPIs + 3 Supplemental (EFDA)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Applications Evaluated</span>
                  <span className="text-2xl font-bold text-blue-600">{ctData.kpi1.percentage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">GCP Compliance</span>
                  <span className="text-lg font-semibold">{ctData.kpi5.percentage}%</span>
                </div>
                <Link 
                  href="/clinical-trials" 
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-3"
                >
                  View all KPIs <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                GMP Inspections
              </CardTitle>
              <CardDescription>9 Main KPIs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Facilities Inspected</span>
                  <span className="text-2xl font-bold text-green-600">{gmpData.kpi1.currentQuarter.percentage?.toFixed(1) || "0"}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Facility Compliance</span>
                  <span className="text-lg font-semibold">{gmpData.kpi4.currentYear.percentage?.toFixed(1) || "0"}%</span>
                </div>
                <Link 
                  href="/gmp-inspections" 
                  className="flex items-center gap-1 text-sm text-green-600 hover:underline mt-3"
                >
                  View all KPIs <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheckIcon className="h-5 w-5 text-purple-600" />
                Market Authorizations
              </CardTitle>
              <CardDescription>8 Main KPIs + AMRH Extensions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">New Apps Completed</span>
                  <span className="text-2xl font-bold text-purple-600">{maData.kpi1.currentQuarter.percentage?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Median Processing</span>
                  <span className="text-lg font-semibold">{maData.kpi6.currentYear.median} days</span>
                </div>
                <Link 
                  href="/market-authorizations" 
                  className="flex items-center gap-1 text-sm text-purple-600 hover:underline mt-3"
                >
                  View all KPIs <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clinical Trials - Key KPIs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FlaskConicalIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Clinical Trials</h2>
                <p className="text-sm text-muted-foreground">Key performance indicators for clinical trial oversight</p>
              </div>
            </div>
            <Link href="/clinical-trials">
              <Badge className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                View All 11 KPIs →
              </Badge>
            </Link>
          </div>

          <MetricGrid columns={4}>
            <KPICard
              title="New Applications Evaluated"
              value={ctData.kpi1.percentage}
              suffix="%"
              description={`${ctData.kpi1.numerator}/${ctData.kpi1.denominator} within timeline`}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status={ctData.kpi1.percentage >= 90 ? "excellent" : "good"}
              trend={ctData.kpi1.quarterlyData && ctData.kpi1.quarterlyData.length >= 2 ? "up" : undefined}
              trendValue={calculateTrend(ctData.kpi1.percentage, ctData.kpi1.quarterlyData)}
            />
            <KPICard
              title="Amendments Evaluated"
              value={ctData.kpi2.percentage}
              suffix="%"
              description={`${ctData.kpi2.numerator}/${ctData.kpi2.denominator} on time`}
              icon={<FileTextIcon className="h-4 w-4" />}
              status={ctData.kpi2.percentage >= 90 ? "excellent" : "good"}
            />
            <KPICard
              title="GCP Compliance Rate"
              value={ctData.kpi5.percentage}
              suffix="%"
              description={`${ctData.kpi5.numerator}/${ctData.kpi5.denominator} trials compliant`}
              icon={<ShieldCheckIcon className="h-4 w-4" />}
              status={ctData.kpi5.percentage >= 85 ? "excellent" : "good"}
            />
            <KPICard
              title="Avg Turnaround Time"
              value={ctData.kpi8.averageDays}
              suffix=" days"
              description="Target: 60 days"
              icon={<ClockIcon className="h-4 w-4" />}
              status={ctData.kpi8.averageDays <= 60 ? "excellent" : "good"}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">GCP Plan Inspections</CardTitle>
                <CardDescription>CT-KPI-3: Approved & ongoing trials inspected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{ctData.kpi3.percentage}%</span>
                  <span className="text-sm text-muted-foreground">({ctData.kpi3.numerator}/{ctData.kpi3.denominator})</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Registry Publication</CardTitle>
                <CardDescription>CT-KPI-6: Approved trials listed in registry</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{ctData.kpi6.percentage}%</span>
                  <span className="text-sm text-muted-foreground">({ctData.kpi6.numerator}/{ctData.kpi6.denominator})</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* GMP Inspections - Key KPIs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">GMP Inspections</h2>
                <p className="text-sm text-muted-foreground">Good Manufacturing Practice compliance monitoring</p>
              </div>
            </div>
            <Link href="/gmp-inspections">
              <Badge className="bg-green-600 hover:bg-green-700 cursor-pointer">
                View All 9 KPIs →
              </Badge>
            </Link>
          </div>

          <MetricGrid columns={4}>
            <KPICard
              title="Facilities Inspected as per Plan"
              value={gmpData.kpi1.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description={`${gmpData.kpi1.currentQuarter.numerator}/${gmpData.kpi1.currentQuarter.denominator} facilities`}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status={(gmpData.kpi1.currentQuarter.percentage || 0) >= 90 ? "excellent" : "good"}
              trend={gmpData.kpi1.quarterlyData && gmpData.kpi1.quarterlyData.length >= 2 ? "up" : undefined}
              trendValue={calculateTrend(gmpData.kpi1.currentQuarter.percentage || 0, gmpData.kpi1.quarterlyData)}
            />
            <KPICard
              title="GMP Compliance Rate"
              value={gmpData.kpi4.currentYear.percentage?.toFixed(1) || "0"}
              suffix="%"
              description={`${gmpData.kpi4.currentYear.numerator}/${gmpData.kpi4.currentYear.denominator} compliant`}
              icon={<ShieldCheckIcon className="h-4 w-4" />}
              status={(gmpData.kpi4.currentYear.percentage || 0) >= 85 ? "excellent" : "good"}
            />
            <KPICard
              title="CAPA Decisions on Time"
              value={gmpData.kpi5.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description={`${gmpData.kpi5.currentQuarter.numerator}/${gmpData.kpi5.currentQuarter.denominator} CAPA`}
              icon={<ClockIcon className="h-4 w-4" />}
              status={(gmpData.kpi5.currentQuarter.percentage || 0) >= 90 ? "excellent" : "good"}
            />
            <KPICard
              title="Avg Turnaround Time"
              value={gmpData.kpi7.currentQuarter.average?.toFixed(1) || "0"}
              suffix=" days"
              description="Target: 60 days"
              icon={<BarChart3Icon className="h-4 w-4" />}
              status={(gmpData.kpi7.currentQuarter.average || 0) <= 60 ? "excellent" : "good"}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Complaint-Triggered Inspections</CardTitle>
                <CardDescription>GMP-KPI-2: Response to complaints requiring inspection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{gmpData.kpi2.currentQuarter.percentage?.toFixed(1) || "0"}%</span>
                  <span className="text-sm text-muted-foreground">({gmpData.kpi2.currentQuarter.numerator}/{gmpData.kpi2.currentQuarter.denominator})</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Applications Completed on Time</CardTitle>
                <CardDescription>GMP-KPI-6: Within NRA SLA timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{gmpData.kpi6.currentQuarter.percentage?.toFixed(1) || "0"}%</span>
                  <span className="text-sm text-muted-foreground">({gmpData.kpi6.currentQuarter.numerator}/{gmpData.kpi6.currentQuarter.denominator})</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Market Authorizations - Key KPIs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClipboardCheckIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Market Authorizations</h2>
                <p className="text-sm text-muted-foreground">Medicine, medical devices, and food authorization tracking</p>
              </div>
            </div>
            <Link href="/market-authorizations">
              <Badge className="bg-purple-600 hover:bg-purple-700 cursor-pointer">
                View All 10 KPIs →
              </Badge>
            </Link>
          </div>

          <MetricGrid columns={4}>
            <KPICard
              title="New MA Applications"
              value={maData.kpi1.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description={`${maData.kpi1.currentQuarter.numerator}/${maData.kpi1.currentQuarter.denominator} on time`}
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              status={(maData.kpi1.currentQuarter.percentage || 0) >= 90 ? "excellent" : "good"}
              trend={maData.kpi1.quarterlyData && maData.kpi1.quarterlyData.length >= 2 ? "up" : undefined}
              trendValue={
                maData.kpi1.quarterlyData && maData.kpi1.quarterlyData.length >= 2
                  ? `${((maData.kpi1.currentQuarter.percentage || 0) - (maData.kpi1.quarterlyData[maData.kpi1.quarterlyData.length - 2].value.percentage || 0)).toFixed(1)}%`
                  : undefined
              }
            />
            <KPICard
              title="Renewal Applications"
              value={maData.kpi2.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description={`${maData.kpi2.currentQuarter.numerator}/${maData.kpi2.currentQuarter.denominator} renewals`}
              icon={<ActivityIcon className="h-4 w-4" />}
              status={(maData.kpi2.currentQuarter.percentage || 0) >= 85 ? "excellent" : "good"}
            />
            <KPICard
              title="Median Processing Time"
              value={maData.kpi6.currentYear.median?.toFixed(0) || "0"}
              suffix=" days"
              description="New MA applications"
              icon={<ClockIcon className="h-4 w-4" />}
              status="excellent"
            />
            <KPICard
              title="PARs Published"
              value={maData.kpi8.currentQuarter.percentage?.toFixed(1) || "0"}
              suffix="%"
              description={`${maData.kpi8.currentQuarter.numerator}/${maData.kpi8.currentQuarter.denominator} reports`}
              icon={<FileTextIcon className="h-4 w-4" />}
              status={(maData.kpi8.currentQuarter.percentage || 0) >= 80 ? "excellent" : "good"}
            />
          </MetricGrid>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Minor Variations</CardTitle>
                <CardDescription>MA-KPI-3: Completed within timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{maData.kpi3.currentQuarter.percentage?.toFixed(1)}%</span>
                  <span className="text-sm text-muted-foreground">({maData.kpi3.currentQuarter.numerator}/{maData.kpi3.currentQuarter.denominator})</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Major Variations</CardTitle>
                <CardDescription>MA-KPI-4: Completed within timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{maData.kpi4.currentQuarter.percentage?.toFixed(1)}%</span>
                  <span className="text-sm text-muted-foreground">({maData.kpi4.currentQuarter.numerator}/{maData.kpi4.currentQuarter.denominator})</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Queries/FIRs</CardTitle>
                <CardDescription>MA-KPI-5: Completed within timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{maData.kpi5.currentQuarter.percentage?.toFixed(1)}%</span>
                  <span className="text-sm text-muted-foreground">({maData.kpi5.currentQuarter.numerator}/{maData.kpi5.currentQuarter.denominator})</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Overall Summary */}
        <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5" />
              Overall Performance Summary
            </CardTitle>
            <CardDescription>Total KPIs tracked across all regulatory categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-600">Clinical Trials</p>
                <p className="text-3xl font-bold">11</p>
                <p className="text-xs text-muted-foreground">8 Main + 3 Supplemental KPIs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600">GMP Inspections</p>
                <p className="text-3xl font-bold">9</p>
                <p className="text-xs text-muted-foreground">Main KPIs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-600">Market Authorizations</p>
                <p className="text-3xl font-bold">10</p>
                <p className="text-xs text-muted-foreground">8 Main + 2 AMRH Extensions</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">30 Total KPIs</p>
                  <p className="text-sm text-muted-foreground">Comprehensive regulatory performance monitoring</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">All Systems Operational</Badge>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">Q4 2024</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

