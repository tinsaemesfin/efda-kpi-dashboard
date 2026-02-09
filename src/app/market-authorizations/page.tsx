"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { MADashboardProvider } from "@/components/ma-kpis/shared/context/MADashboardContext";
import { MarketAuthorizationHero } from "@/components/ma-kpis/shared/components/MarketAuthorizationHero";
import { DashboardFilters } from "@/components/ma-kpis/shared/components/DashboardFilters";
import { KPICardsGrid } from "@/components/ma-kpis/shared/components/KPICardsGrid";
import { MultiKPIVisualGallery } from "@/components/ma-kpis/shared/components/MultiKPIVisualGallery";

export default function MarketAuthorizationsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <MADashboardProvider>
          <div className="space-y-8">
            <MarketAuthorizationHero />
            <DashboardFilters />
            <KPICardsGrid />
            <MultiKPIVisualGallery />
          </div>
        </MADashboardProvider>
      </DashboardLayout>
    </AuthGuard>
  );
}
