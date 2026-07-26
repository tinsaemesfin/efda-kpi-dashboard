"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  Shield,
  FlaskConical,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
];

const kpiMenuItems = [
  {
    title: "Clinical Trials",
    url: "/clinical-trials",
    icon: FlaskConical,
    description: "Clinical trial applications and compliance",
  },
  {
    title: "GMP Inspections",
    url: "/gmp-inspections",
    icon: ShieldCheck,
    description: "Manufacturing inspections and certifications",
  },
  {
    title: "Market Authorizations",
    url: "/market-authorizations",
    icon: ClipboardCheck,
    description: "Drug authorization and approvals",
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const userName = String(profile?.given_name || profile?.name || profile?.email || "EFDA User");
  const userEmail = profile?.email ? String(profile.email) : "internal.user@efda.gov.et";
  const userRole = profile?.role ? String(profile.role) : "Regulatory Staff";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-slate-50 dark:text-slate-950">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold tracking-tight">EFDA KPI</span>
            <span className="text-xs text-muted-foreground">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>KPI Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {kpiMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-sidebar-accent/60 p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt={userName} />
            <AvatarFallback>{initials || "EU"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{userRole}</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
