"use client";

import { Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

export function DashboardHeader() {
  const { profile, logout, isAuthenticated } = useAuth();
  const profileUrl = "https://dev.id.eris.efda.gov.et/manage/profile";

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6">
        <SidebarTrigger className="size-9 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring" />

        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <label htmlFor="global-dashboard-search" className="sr-only">
              Search KPIs and reports
            </label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="global-dashboard-search"
              type="search"
              placeholder="KPIs, reports…"
              className="h-10 rounded-lg bg-muted/50 pl-9 focus-visible:ring-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open user menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={profile.given_name || profile.email || 'User'} />
                    <AvatarFallback>
                      {profile.given_name ? profile.given_name.charAt(0).toUpperCase() : 
                       profile.email ? profile.email.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.given_name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile.email || 'No email'}
                    </p>
                    {profile.role ? (
                      <p className="text-xs leading-none text-muted-foreground">
                        {String(profile.role)}
                      </p>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = profileUrl}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          )}
        </div>
      </div>
    </header>
  );
}
