import { notFound } from "next/navigation";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { GMPApiDrilldownDetail } from "@/components/kpi/gmp-api-drilldown-detail";
import { ClinicalTrialsDashboard } from "@/components/dashboard/clinical-trials-dashboard";
import { DataChart } from "@/components/charts/data-chart";

export default async function Review({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view } = await searchParams;
  return <DashboardLayout>{view === "clinical-trials" ? <ClinicalTrialsDashboard /> : view === "gmp" ? <GMPApiDrilldownDetail kpiId="GMP-KPI-1" title="Proportion of GMP applications inspected" filters={{}} reports={[
    { reportId: -1, label: "Inspected breakdown · Local", rows: [{ category_value: "Medicine", percentage: 85, numerator: 17, denominator: 20 }, { category_value: "Medical devices", percentage: 72, numerator: 18, denominator: 25 }, { category_value: "Food", percentage: 0, numerator: 0, denominator: 10 }, { category_value: "Cosmetics", percentage: null }] },
    { reportId: -2, label: "Inspected breakdown · Abroad", rows: [] },
  ]} supported loading={false} error={null} periodLabel="UI verification · sample data" /> : view === "charts" ? <div className="mx-auto max-w-3xl space-y-6"><h1>Chart verification · sample data</h1><DataChart data={[{ name: "January", value: 12 }, { name: "February", value: 25 }, { name: "March", value: 18 }]} label="Applications" additive ordered /><DataChart data={[{ name: "Missing", value: null }]} label="Unavailable metric" /></div> : <MainDashboard user={{ name: "Reviewer" }} />}</DashboardLayout>;
}

