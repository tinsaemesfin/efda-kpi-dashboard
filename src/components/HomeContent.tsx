'use client';

import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from "@/components/layout";
import { MainDashboard } from "@/components/dashboard/main-dashboard";

export default function HomeContent() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <MainDashboard
        user={
          profile
            ? {
                name: String(profile.given_name || profile.name || profile.email || "EFDA User"),
                email: profile.email,
                role: profile.role ? String(profile.role) : undefined,
              }
            : undefined
        }
      />
    </DashboardLayout>
  );
}

