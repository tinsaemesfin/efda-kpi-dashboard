"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { RequirementToggle } from "@/components/kpi";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maKPIData } from "@/data/ma-dummy-data";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import {
  ClipboardCheckIcon,
  ClockIcon,
  FileTextIcon,
  RefreshCwIcon,
  FileEditIcon,
  FileSearchIcon,
  AlertCircleIcon,
  BarChart3Icon,
} from "lucide-react";

export default function MarketAuthorizationsPage() {
  const data = maKPIData;
  const [showRequirements, setShowRequirements] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper function to get status based on percentage
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
    // For time-based metrics (lower is better)
    if (median !== undefined || average !== undefined) {
      if (value <= 150) return "excellent";
      if (value <= 180) return "good";
      if (value <= 220) return "warning";
      return "critical";
    }
    return "good";
  };

  const handleCardClick = (kpiId: string) => {
    setSelectedKpiId(kpiId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedKpiId(null);
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

  const kpiCards = [
    {
      id: "MA-KPI-1",
      title: "New MA Applications Completed on Time",
      data: data.kpi1.currentQuarter,
      description: "Applications completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-2",
      title: "Renewal MA Applications Completed on Time",
      data: data.kpi2.currentQuarter,
      description: "Renewals completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-3",
      title: "Minor Variation Applications Completed on Time",
      data: data.kpi3.currentQuarter,
      description: "Minor variations completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-4",
      title: "Major Variation Applications Completed on Time",
      data: data.kpi4.currentQuarter,
      description: "Major variations completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-5",
      title: "Queries/FIRs Completed on Time",
      data: data.kpi5.currentQuarter,
      description: "Queries/FIRs completed within timeline",
      suffix: "%",
    },
    {
      id: "MA-KPI-6",
      title: "Median Time for New MA Applications",
      data: data.kpi6.currentYear,
      description: "Median processing time in days",
      suffix: " days",
    },
    {
      id: "MA-KPI-7",
      title: "Average Time for New MA Applications",
      data: data.kpi7.currentYear,
      description: "Average processing time in days",
      suffix: " days",
    },
    {
      id: "MA-KPI-8",
      title: "PARs Published on Time",
      data: data.kpi8.currentQuarter,
      description: "Public Assessment Reports published within timeline",
      suffix: "%",
    },
  ];

  return (
    <AuthGuard>
      <DashboardLayout>
        {/* Requirement Toggle */}
        <RequirementToggle
          enabled={showRequirements}
          onChange={setShowRequirements}
          category="Market Authorization"
        />

        <div className="space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ClipboardCheckIcon className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold tracking-tight">
                Market Authorization KPIs
              </h1>
            </div>
            <p className="text-muted-foreground">
              Regulatory performance metrics for marketing authorization
              applications (Medicine, Medical devices, Food). Click on any KPI
              card to view detailed drill-down analysis.
            </p>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

          {/* Drill-Down Modal */}
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
