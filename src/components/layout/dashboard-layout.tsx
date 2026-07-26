"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden bg-efda-background">
        <a
          href="#dashboard-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <main
            id="dashboard-main-content"
            className="min-h-0 flex-1 overflow-y-auto p-4 outline-none md:p-6 lg:p-8"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
