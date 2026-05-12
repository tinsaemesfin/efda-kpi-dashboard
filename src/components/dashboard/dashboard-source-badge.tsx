import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SourceVariant = "mock" | "seeded" | "derived" | "api" | "neutral";

const variantClass: Record<SourceVariant, string> = {
  mock: "border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  seeded: "border-efda-market-authorizations/35 bg-[color-mix(in_srgb,var(--color-efda-market-authorizations)_10%,transparent)] text-efda-text-primary",
  derived: "border-efda-primary/40 bg-[color-mix(in_srgb,var(--color-efda-primary)_8%,transparent)] text-efda-text-primary",
  api: "border-efda-secondary/45 bg-[color-mix(in_srgb,var(--color-efda-secondary)_10%,transparent)] text-efda-text-primary",
  neutral: "border-efda-border-custom text-muted-foreground",
};

export function DashboardSourceBadge({
  label,
  variant = "neutral",
  className,
}: {
  label: string;
  variant?: SourceVariant;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("cursor-default text-[11px] font-medium", variantClass[variant], className)}>
      {label}
    </Badge>
  );
}
