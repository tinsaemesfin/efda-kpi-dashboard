"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DataSourceBadgeProps {
  source: "api" | "dummy";
  className?: string;
}

export function DataSourceBadge({ source, className }: DataSourceBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-normal",
        source === "api"
          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
          : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400",
        className
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          source === "api" ? "bg-green-500" : "bg-orange-500"
        )}
      />
      {source === "api" ? "Live" : "Sample"}
    </Badge>
  );
}
