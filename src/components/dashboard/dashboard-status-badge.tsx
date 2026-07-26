import type { LucideIcon } from "lucide-react";
import { AlertTriangleIcon, CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DashboardStatus } from "@/data/dashboard-product-performance";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  DashboardStatus,
  {
    label: string;
    icon: LucideIcon;
    className: string;
  }
> = {
  excellent: {
    label: "Excellent",
    icon: CheckCircle2Icon,
    className:
      "border-[color-mix(in_srgb,var(--color-efda-status-excellent)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-efda-status-excellent)_10%,transparent)] text-efda-text-primary dark:text-efda-text-secondary",
  },
  good: {
    label: "Good",
    icon: CheckCircle2Icon,
    className:
      "border-[color-mix(in_srgb,var(--color-efda-status-good)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-efda-status-good)_10%,transparent)] text-efda-text-primary dark:text-efda-text-secondary",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangleIcon,
    className:
      "border-[color-mix(in_srgb,var(--color-efda-status-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-efda-status-warning)_12%,transparent)] text-efda-text-primary dark:text-efda-text-secondary",
  },
  critical: {
    label: "Critical",
    icon: ShieldAlertIcon,
    className:
      "border-[color-mix(in_srgb,var(--color-efda-status-critical)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-efda-status-critical)_12%,transparent)] text-efda-text-primary dark:text-efda-text-secondary",
  },
};

export function DashboardStatusBadge({ status }: { status: DashboardStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold", config.className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

export function statusHeatmapCellClass(status: DashboardStatus): string {
  switch (status) {
    case "excellent":
      return "bg-[color-mix(in_srgb,var(--color-efda-status-excellent)_14%,transparent)] border-[color-mix(in_srgb,var(--color-efda-status-excellent)_35%,transparent)]";
    case "good":
      return "bg-[color-mix(in_srgb,var(--color-efda-status-good)_14%,transparent)] border-[color-mix(in_srgb,var(--color-efda-status-good)_35%,transparent)]";
    case "warning":
      return "bg-[color-mix(in_srgb,var(--color-efda-status-warning)_16%,transparent)] border-[color-mix(in_srgb,var(--color-efda-status-warning)_40%,transparent)]";
    case "critical":
      return "bg-[color-mix(in_srgb,var(--color-efda-status-critical)_16%,transparent)] border-[color-mix(in_srgb,var(--color-efda-status-critical)_35%,transparent)]";
    default:
      return "bg-muted/40 border-efda-border-custom";
  }
}
