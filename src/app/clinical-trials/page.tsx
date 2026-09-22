"use client";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { ClinicalTrialsDashboard } from "@/components/dashboard/clinical-trials-dashboard";

export default function ClinicalTrialsPage() {
  return <AuthGuard><DashboardLayout><ClinicalTrialsDashboard /></DashboardLayout></AuthGuard>;
}
