"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MAKPICardProps {
  kpiId: string;
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string | number;
  status?: "excellent" | "good" | "warning" | "critical";
  icon?: React.ReactNode;
  suffix?: string;
  prefix?: string;
  numerator?: number;
  denominator?: number;
  onClick?: () => void;
}

export function MAKPICard({
  title,
  value,
  description,
  trend,
  trendValue,
  status = "good",
  icon,
  suffix,
  prefix,
  numerator,
  denominator,
  onClick,
}: MAKPICardProps) {
  const statusColors = {
    excellent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    good: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const getTrendIcon = () => {
    if (trend === "up") return <ArrowUpIcon className="h-4 w-4" />;
    if (trend === "down") return <ArrowDownIcon className="h-4 w-4" />;
    return <MinusIcon className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-green-600 dark:text-green-400";
    if (trend === "down") return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:border-primary",
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-bold">
            {prefix}
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
            {trend && trendValue && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  getTrendColor()
                )}
              >
                {getTrendIcon()}
                <span>{trendValue}</span>
              </div>
            )}

            {status && (
              <Badge
                variant="outline"
                className={cn("text-xs", statusColors[status])}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

