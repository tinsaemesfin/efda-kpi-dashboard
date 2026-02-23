"use client";

import { useMemo } from "react";
import { ClipboardCheckIcon, GaugeIcon, Wand2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMADashboard } from "../context/MADashboardContext";
import { useFilteredKPIValue } from "../hooks/useFilteredKPIValue";
import { maKPIData } from "@/data/ma-dummy-data";

export function MarketAuthorizationHero() {
  const { dashboardFilter } = useMADashboard();
  const { getFilteredQuarterlyValue, getFilteredAnnualValue } = useFilteredKPIValue();

  const overallOnTime = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(maKPIData.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(maKPIData.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(maKPIData.kpi3);
    const kpi4Value = getFilteredQuarterlyValue(maKPIData.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(maKPIData.kpi5);
    const kpi8Value = getFilteredQuarterlyValue(maKPIData.kpi8);

    const metrics = [
      kpi1Value.percentage ?? 0,
      kpi2Value.percentage ?? 0,
      kpi3Value.percentage ?? 0,
      kpi4Value.percentage ?? 0,
      kpi5Value.percentage ?? 0,
      kpi8Value.percentage ?? 0,
    ];
    return metrics.reduce((sum, value) => sum + value, 0) / (metrics.length || 1);
  }, [dashboardFilter, getFilteredQuarterlyValue]);

  const totalVolume = useMemo(() => {
    const kpi1Value = getFilteredQuarterlyValue(maKPIData.kpi1);
    const kpi2Value = getFilteredQuarterlyValue(maKPIData.kpi2);
    const kpi3Value = getFilteredQuarterlyValue(maKPIData.kpi3);
    const kpi4Value = getFilteredQuarterlyValue(maKPIData.kpi4);
    const kpi5Value = getFilteredQuarterlyValue(maKPIData.kpi5);
    const kpi8Value = getFilteredQuarterlyValue(maKPIData.kpi8);

    return (
      (kpi1Value.denominator ?? 0) +
      (kpi2Value.denominator ?? 0) +
      (kpi3Value.denominator ?? 0) +
      (kpi4Value.denominator ?? 0) +
      (kpi5Value.denominator ?? 0) +
      (kpi8Value.denominator ?? 0)
    );
  }, [dashboardFilter, getFilteredQuarterlyValue]);

  const medianCycleTime = useMemo(() => {
    const kpi6Value = getFilteredAnnualValue(maKPIData.kpi6);
    return kpi6Value.median ?? 0;
  }, [dashboardFilter, getFilteredAnnualValue]);

  const transparency = useMemo(() => {
    const kpi8Value = getFilteredQuarterlyValue(maKPIData.kpi8);
    return kpi8Value.percentage ?? 0;
  }, [dashboardFilter, getFilteredQuarterlyValue]);

  return (
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
                  Holistic visibility into MA timelines, transparency, and reliability with
                  multi-angle drill-downs.
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
              <CardDescription className="text-white/70">Overall on-time rate</CardDescription>
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
              <CardDescription className="text-white/70">Active workload</CardDescription>
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
              <CardDescription className="text-white/70">Median cycle time</CardDescription>
              <CardTitle className="text-3xl font-bold text-white">
                {medianCycleTime.toFixed(0)} days
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/80">
              Current year median for new MA applications
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/70">Transparency</CardDescription>
              <CardTitle className="text-3xl font-bold text-white">
                {transparency.toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/80">
              PARs published within specified timelines
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
