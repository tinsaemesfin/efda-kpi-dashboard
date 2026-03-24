"use client";

import { useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { maProductKpiSeed, type MAProductKey } from "@/data/ma-dummy-data";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import { useMAKPIDataMedicineFacade } from "@/hooks/useMAApi";
import { mergeMedicineCardsWithFaceData } from "@/lib/ma-api/merge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDaysIcon,
  ClipboardCheckIcon,
  CroissantIcon,
  Loader2Icon,
  SearchIcon,
  PackageIcon,
  SparklesIcon,
} from "lucide-react";
import type { KPIDrillDownData } from "@/types/ma-drilldown";
import { cn } from "@/lib/utils";
import type { MAKPIId } from "@/types/ma-api";

const productTabs: Array<{ key: MAProductKey; label: string }> = [
  { key: "medicine", label: "Medicine" },
  { key: "food", label: "Food" },
  { key: "medicalDevice", label: "Medical Device" },
  { key: "cosmetics", label: "Cosmetics" },
];

const summaryIcons: Record<MAProductKey, React.ReactNode> = {
  medicine: <ClipboardCheckIcon className="h-4 w-4" />,
  food: <CroissantIcon className="h-4 w-4" />,
  medicalDevice: <PackageIcon className="h-4 w-4" />,
  cosmetics: <SparklesIcon className="h-4 w-4" />,
};

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

  if (value <= 150) return "excellent";
  if (value <= 180) return "good";
  if (value <= 220) return "warning";
  return "critical";
};

const API_KPI_IDS = ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3", "MA-KPI-4"] as const;

function isApiKpiId(kpiId: string): kpiId is MAKPIId {
  return API_KPI_IDS.includes(kpiId as (typeof API_KPI_IDS)[number]);
}

export default function MarketAuthorizationsPage() {
  const [activeProduct, setActiveProduct] = useState<MAProductKey>("medicine");
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [datePreset, setDatePreset] = useState("last-30");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-31");
  const [cardDensity, setCardDensity] = useState<"grid" | "condensed">("grid");

  const {
    kpiFaceDataById: apiMedicineData,
    loading: apiLoading,
    error: apiError,
    metadata: apiMetadata,
  } = useMAKPIDataMedicineFacade();

  const activeSeed = maProductKpiSeed[activeProduct];

  /** For Medicine tab: merge API data (New/Renewal/Minor/Major Variation) with seed; others use seed only */
  const mergedCards = useMemo(() => {
    const seedCards = activeSeed.cards;
    if (activeProduct !== "medicine" || !apiMedicineData) {
      return seedCards;
    }
    return mergeMedicineCardsWithFaceData(seedCards, apiMedicineData);
  }, [activeProduct, activeSeed.cards, apiMedicineData]);

  const summaryCards = useMemo(
    () =>
      productTabs.map((product) => {
        const seed = maProductKpiSeed[product.key];
        const isMedicine = product.key === "medicine";
        const lead = isMedicine && mergedCards.length > 0 ? mergedCards[0] : seed.cards[0];
        return {
          key: product.key,
          label: seed.summaryTitle,
          text: `${lead.value.toFixed(lead.decimals)}${lead.suffix}`,
          description: seed.summaryDescription,
        };
      }),
    [mergedCards]
  );

  const handleCardClick = (kpiId: string) => {
    if (!maDrillDownData[kpiId]) {
      setWarningMessage(`No drilldown data found for ${kpiId}.`);
      return;
    }
    setWarningMessage(null);
    setSelectedKpiId(kpiId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedKpiId(null);
  };

  const selectedDrilldown: KPIDrillDownData | null = useMemo(() => {
    if (!selectedKpiId) return null;
    return maDrillDownData[selectedKpiId] ?? null;
  }, [selectedKpiId]);

  const visibleCards = useMemo(() => {
    if (!searchTerm.trim()) return mergedCards;
    const q = searchTerm.toLowerCase();
    return mergedCards.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [mergedCards, searchTerm]);

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === "this-quarter") {
      setDateFrom("2026-01-01");
      setDateTo("2026-03-31");
      return;
    }
    if (preset === "last-quarter") {
      setDateFrom("2025-10-01");
      setDateTo("2025-12-31");
      return;
    }
    if (preset === "last-30") {
      setDateFrom("2026-02-01");
      setDateTo("2026-03-31");
      return;
    }
    if (preset === "ytd") {
      setDateFrom("2026-01-01");
      setDateTo("2026-12-31");
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <Card className="border-primary/40 bg-card shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl tracking-tight">
                Market Authorization KPI
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm">
                Product-specific KPI dashboard for Market Authorization. Use the tabs
                below to switch context, then click any KPI card to open drilldown.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "rounded-xl border bg-muted/40 p-3",
                    item.key === activeProduct && "border-primary/60 bg-primary/5"
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {summaryIcons[item.key]}
                    <span>{item.label}</span>
                  </div>
                  <div className="text-xl font-semibold">{item.text}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="rounded-xl border bg-card p-2">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {productTabs.map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant={activeProduct === tab.key ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setActiveProduct(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

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
                  {activeProduct === "medicine"
                    ? "Medicine: KPI card values use live API (/8), KPI 1 drilldown uses /9, and KPI 2 drilldown uses /10; others use sample data. "
                        .concat(
                          `Rows accepted: ${apiMetadata.acceptedRows}/${apiMetadata.filteredRows} filtered (${apiMetadata.totalRows} total).`
                        )
                    : "Filters apply when API is wired for this product."}
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

          {(warningMessage || (activeProduct === "medicine" && apiError)) && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 text-sm text-amber-800 dark:text-amber-200">
                {activeProduct === "medicine" && apiError ? apiError.message : warningMessage}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Showing {visibleCards.length} KPI cards for{" "}
              <span className="font-medium text-foreground">
                {productTabs.find((tab) => tab.key === activeProduct)?.label}
              </span>
              {activeProduct === "medicine" && apiLoading && (
                <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
              )}
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
            {visibleCards.map((card, index) => (
              <MAKPICard
                key={card.id}
                kpiCode={card.drilldownId}
                title={card.title}
                description={card.description}
                value={card.value.toFixed(card.decimals)}
                suffix={card.suffix}
                numerator={card.numerator}
                denominator={card.denominator}
                helperText={
                  activeProduct === "medicine" && isApiKpiId(card.drilldownId) && apiMedicineData?.[card.drilldownId]
                    ? "Medicine view (live)"
                    : `${productTabs.find((tab) => tab.key === activeProduct)?.label} view`
                }
                status={getStatus(card.value, card.suffix)}
                active={false}
                compact={cardDensity === "condensed"}
                animationDelayMs={index * 45}
                onClick={() => handleCardClick(card.drilldownId)}
              />
            ))}
          </div>

          {visibleCards.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No KPI cards match this search for the selected product.
              </CardContent>
            </Card>
          )}

          {selectedDrilldown && (
            <MADrillDownModal
              open={isModalOpen}
              onOpenChange={handleModalClose}
              data={selectedDrilldown}
            />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
