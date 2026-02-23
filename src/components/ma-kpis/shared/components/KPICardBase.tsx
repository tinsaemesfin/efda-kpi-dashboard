"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataSourceBadge } from "@/components/kpi/data-source-badge";

export interface KPICardBaseProps {
  kpiId: string;
  title: string;
  value: string | number;
  description: string;
  status: "excellent" | "good" | "warning" | "critical";
  icon: React.ReactNode;
  suffix: string;
  numerator?: number;
  denominator?: number;
  dataSource?: "api" | "dummy";
  disaggregations?: Record<
    string,
    { code?: string; label: string; value: number; total?: number; percentage: number }
  >;
  loading?: boolean;
  errorMessage?: string | null;
  onClick?: () => void;
}

const statusColors = {
  excellent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function KPICardBase({
  kpiId,
  title,
  value,
  description,
  status,
  icon,
  suffix,
  numerator,
  denominator,
  dataSource = "dummy",
  disaggregations,
  loading = false,
  errorMessage,
  onClick,
}: KPICardBaseProps) {
  const disaggregationList = disaggregations
    ? Object.values(disaggregations)
        .filter((item) => {
          const label = item.label?.trim();
          return Boolean(label) && item.value >= 0;
        })
        .sort((a, b) => b.value - a.value)
    : [];

  if (loading) {
    return (
      <Card className="cursor-default">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          {icon && <div className="text-muted-foreground opacity-50">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
            {description && <Skeleton className="h-3 w-full" />}
            <Skeleton className="h-3 w-20" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card
        className={cn(
          "cursor-pointer border-red-300/70 bg-red-50/70 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-red-800/60 dark:bg-red-950/20",
          onClick && "hover:scale-[1.01]"
        )}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <DataSourceBadge source={dataSource} />
          </div>
          {icon && <div className="text-red-600 dark:text-red-400">{icon}</div>}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
            <AlertTriangleIcon className="h-4 w-4 shrink-0" />
            Unable to load KPI data
          </div>
          <p className="text-xs text-red-700/90 dark:text-red-300/90">{errorMessage}</p>
          <p className="text-xs text-red-700/80 dark:text-red-300/80">
            Open the card to view details and retry guidance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden border-border/70 bg-linear-to-br from-background via-background to-muted/20 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl",
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-500 via-indigo-500 to-cyan-500 opacity-80" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <DataSourceBadge source={dataSource} />
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="text-3xl font-bold tracking-tight">
            {value}
            {suffix}
          </div>

          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}

          {numerator !== undefined && denominator !== undefined && (
            <CardDescription className="text-xs">
              {numerator} / {denominator}
            </CardDescription>
          )}

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", statusColors[status])}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </div>

        {disaggregationList.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Product Type Breakdown
              </p>
              <span className="text-[11px] text-muted-foreground">
                Visible by default
              </span>
            </div>
            <div className="space-y-2.5">
              {disaggregationList.map((disagg, idx) => {
                const total =
                  disagg.total !== undefined
                    ? disagg.total
                    : disagg.percentage > 0
                    ? Math.round(disagg.value / (disagg.percentage / 100))
                    : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium">{disagg.label}</span>
                      <span className="whitespace-nowrap text-muted-foreground">
                        {disagg.value} / {total} ({disagg.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, disagg.percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
