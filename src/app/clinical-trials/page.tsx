"use client";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { ClinicalTrialsDashboard } from "@/components/dashboard/clinical-trials-dashboard";
import { Suspense } from "react";

export default function ClinicalTrialsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <Suspense fallback={null}>
          <ClinicalTrialsDashboard />
        </Suspense>
      </DashboardLayout>
    </AuthGuard>
  );
}
