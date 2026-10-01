"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider data-dashboard-shell className="fixed inset-0 h-viewport min-h-0 min-w-0 overflow-clip">
      <div className="flex h-full min-h-0 w-full min-w-0 overflow-clip bg-efda-background">
        <a
          href="#dashboard-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <DashboardSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-clip">
          <DashboardHeader />
          <main
            id="dashboard-main-content"
            className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable] p-4 outline-none md:p-6 lg:p-8"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
