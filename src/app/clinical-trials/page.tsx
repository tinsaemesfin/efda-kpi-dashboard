"use client";

import { useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { ctKpiSeed } from "@/data/ct-kpi-seed";
import { useCTKPIDataFacade } from "@/hooks/useCTApi";
import { mergeCTCardsWithStrictFaceData } from "@/lib/ct-api/merge";
import { CT_FACE_KPI_IDS } from "@/lib/ct-api/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDaysIcon,
  FlaskConicalIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CTApiFilterParams, CTFaceKPIId } from "@/types/ct-api";

const getStatus = (
  value: number,
  suffix: "%" | " days"
): "excellent" | "good" | "warning" | "critical" => {
  if (suffix === "%") {
    if (value >= 90) return "excellent";
    if (value >= 80) return "good";
    if (value >= 70) return "warning";
    return "critical";
  }

  if (value <= 60) return "excellent";
  if (value <= 75) return "good";
  if (value <= 90) return "warning";
  return "critical";
};

function isApiKpiId(kpiId: string): kpiId is CTFaceKPIId {
  return CT_FACE_KPI_IDS.includes(kpiId as CTFaceKPIId);
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), q, 1);
}

function endOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), q + 3, 0);
}

export default function ClinicalTrialsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [datePreset, setDatePreset] = useState("last-30");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-31");
  const [cardDensity, setCardDensity] = useState<"grid" | "condensed">("grid");

  const apiFilters: CTApiFilterParams = useMemo(
    () => ({
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    }),
    [dateFrom, dateTo]
  );

  const {
    kpiFaceDataById: apiFaceData,
    loading: apiLoading,
    error: apiError,
    metadata: apiMetadata,
  } = useCTKPIDataFacade(apiFilters);

  const mergedCards = useMemo(
    () => mergeCTCardsWithStrictFaceData(ctKpiSeed.cards, apiFaceData),
    [apiFaceData]
  );

  const visibleCards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return mergedCards;
    return mergedCards.filter(
      (card) =>
        card.title.toLowerCase().includes(term) ||
        card.description.toLowerCase().includes(term) ||
        card.drilldownId.toLowerCase().includes(term)
    );
  }, [mergedCards, searchTerm]);

  const leadCard = mergedCards[0];
  const summaryText =
    apiLoading && isApiKpiId(leadCard?.drilldownId ?? "") ? (
      <span
        className="inline-block h-7 w-28 animate-pulse rounded-md bg-muted"
        aria-hidden
      />
    ) : leadCard?.faceDataMissing ? (
      <span className="text-sm text-muted-foreground">No data found</span>
    ) : leadCard ? (
      `${leadCard.value.toFixed(leadCard.decimals)}${leadCard.suffix}`
    ) : (
      "—"
    );

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === "last-30") {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      setDateFrom(formatDateInput(from));
      setDateTo(formatDateInput(today));
      return;
    }
    if (preset === "this-quarter") {
      setDateFrom(formatDateInput(startOfQuarter(today)));
      setDateTo(formatDateInput(endOfQuarter(today)));
      return;
    }
    if (preset === "last-quarter") {
      const prev = new Date(today.getFullYear(), today.getMonth() - 3, 15);
      setDateFrom(formatDateInput(startOfQuarter(prev)));
      setDateTo(formatDateInput(endOfQuarter(prev)));
      return;
    }
    if (preset === "ytd") {
      setDateFrom(`${today.getFullYear()}-01-01`);
      setDateTo(formatDateInput(today));
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <Card className="border-primary/40 bg-card shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl tracking-tight">
                Clinical Trial KPI
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm">
                Harmonized Clinical Trial KPI dashboard. KPI 1–2 use live reporting
                data; remaining cards show sample values until their APIs are wired.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-muted/40 p-3 md:col-span-2 xl:col-span-1">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <FlaskConicalIcon className="h-4 w-4" />
                  <span>{ctKpiSeed.summaryTitle}</span>
                </div>
                <div className="text-xl font-semibold">{summaryText}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ctKpiSeed.summaryDescription}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border bg-card p-3">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Preset</label>
                  <Select value={datePreset} onValueChange={applyDatePreset}>
                    <SelectTrigger className="h-9 w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-quarter">This quarter</SelectItem>
                      <SelectItem value="last-quarter">Last quarter</SelectItem>
                      <SelectItem value="last-30">Last 30 days</SelectItem>
                      <SelectItem value="ytd">Year to date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">From</label>
                  <div className="relative min-w-0">
                    <CalendarDaysIcon className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="h-9 min-w-0 pl-8"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <div className="relative min-w-0">
                    <CalendarDaysIcon className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="h-9 min-w-0 pl-8"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Find KPI</label>
                  <div className="relative min-w-0">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search KPI title"
                      className="h-9 min-w-0 pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="min-w-0 flex-1 text-pretty text-xs leading-relaxed text-muted-foreground">
                  Clinical Trial: KPI 1 /33; KPI 2 /34. Drilldown not enabled yet.{" "}
                  {`Rows accepted: ${apiMetadata.acceptedRows}/${apiMetadata.filteredRows} filtered (${apiMetadata.totalRows} total).`}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto sm:self-center"
                  onClick={() => {
                    setSearchTerm("");
                    applyDatePreset("last-30");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {apiError && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 text-sm text-amber-800 dark:text-amber-200">
                {apiError.message}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Showing {visibleCards.length} KPI cards for{" "}
              <span className="font-medium text-foreground">Clinical Trials</span>
              {apiLoading ? (
                <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
              ) : null}
            </p>
            <div className="rounded-lg border bg-card p-1">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={cardDensity === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setCardDensity("grid")}
                >
                  Grid
                </Button>
                <Button
                  type="button"
                  variant={cardDensity === "condensed" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setCardDensity("condensed")}
                >
                  Condensed
                </Button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "grid gap-4",
              cardDensity === "grid"
                ? "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                : "md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            )}
          >
            {visibleCards.map((card, index) => {
              const facePending = isApiKpiId(card.drilldownId) && apiLoading;
              const strictFaceEmpty =
                isApiKpiId(card.drilldownId) && Boolean(card.faceDataMissing);
              const cardIsEmpty = strictFaceEmpty || Boolean(card.notApplicableReason);
              const showsLiveFaceMetric =
                !facePending && !cardIsEmpty && isApiKpiId(card.drilldownId);
              const showsSampleMetric = !facePending && !cardIsEmpty && !showsLiveFaceMetric;
              const strictLiveSlotEmpty = cardIsEmpty && !card.notApplicableReason && strictFaceEmpty;
              const helperText =
                cardIsEmpty || card.notApplicableReason
                  ? undefined
                  : showsLiveFaceMetric
                    ? "Values from the reporting API."
                    : "Clinical Trials view (sample data)";

              return (
                <MAKPICard
                  key={card.id}
                  kpiCode={card.drilldownId}
                  title={card.title}
                  description={card.description}
                  value={card.value.toFixed(card.decimals)}
                  suffix={card.suffix}
                  numerator={card.numerator}
                  denominator={card.denominator}
                  helperText={helperText}
                  dataAttribution={
                    showsLiveFaceMetric ? "live" : showsSampleMetric ? "sample" : "none"
                  }
                  strictLiveSlotEmpty={strictLiveSlotEmpty}
                  status={getStatus(card.value, card.suffix)}
                  active={false}
                  compact={cardDensity === "condensed"}
                  animationDelayMs={index * 45}
                  isLoading={facePending}
                  isEmpty={cardIsEmpty}
                  isNotApplicable={Boolean(card.notApplicableReason)}
                  emptyMessage={card.notApplicableReason ?? "No data found"}
                />
              );
            })}
          </div>

          {visibleCards.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No KPI cards match this search.
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
