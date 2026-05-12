"use client";

import { useMemo, useState, type ReactNode } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import {
  DEFAULT_FOOD_SUB_TAB,
  getMAProductKpiSeedForView,
  maProductKpiSeed,
  type MAFoodSubTabKey,
  type MAProductKey,
} from "@/data/ma-dummy-data";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import {
  useMAKPIDataCosmeticsFacade,
  useMAKPIDataFoodFacade,
  useMAKPIDataFoodNotificationFacade,
  useMAKPIDataMedicalDeviceFacade,
  useMAKPIDataMedicineFacade,
} from "@/hooks/useMAApi";
import {
  mergeCosmeticsCardsWithStrictFaceData,
  mergeFoodCardsWithStrictFaceData,
  mergeMedicalDeviceCardsWithStrictFaceData,
  mergeMedicineCardsWithStrictFaceData,
} from "@/lib/ma-api/merge";
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

const foodSubTabs: Array<{ key: MAFoodSubTabKey; label: string }> = [
  { key: "food", label: "Food" },
  { key: "foodNotification", label: "Food Notification" },
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

/** Face API: Cosmetics only — KPI 1–3 (variation aggregates into MA-KPI-3). */
const COSMETICS_FACE_KPI_IDS = ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3"] as const;

function isApiKpiId(kpiId: string): kpiId is MAKPIId {
  return API_KPI_IDS.includes(kpiId as (typeof API_KPI_IDS)[number]);
}

function isCosmeticsThreeSlotFaceKpi(drilldownId: string): boolean {
  return COSMETICS_FACE_KPI_IDS.includes(
    drilldownId as (typeof COSMETICS_FACE_KPI_IDS)[number]
  );
}

export default function MarketAuthorizationsPage() {
  const [activeProduct, setActiveProduct] = useState<MAProductKey>("medicine");
  const [activeFoodSubTab, setActiveFoodSubTab] =
    useState<MAFoodSubTabKey>(DEFAULT_FOOD_SUB_TAB);
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
    loading: apiMedicineLoading,
    error: apiMedicineError,
    metadata: apiMedicineMetadata,
  } = useMAKPIDataMedicineFacade();

  const {
    kpiFaceDataById: apiFoodData,
    loading: apiFoodLoading,
    error: apiFoodError,
    metadata: apiFoodMetadata,
  } = useMAKPIDataFoodFacade();

  const {
    kpiFaceDataById: apiFoodNotificationData,
    loading: apiFoodNotificationLoading,
    error: apiFoodNotificationError,
    metadata: apiFoodNotificationMetadata,
  } = useMAKPIDataFoodNotificationFacade();

  const {
    kpiFaceDataById: apiMedicalDeviceData,
    loading: apiMedicalDeviceLoading,
    error: apiMedicalDeviceError,
    metadata: apiMedicalDeviceMetadata,
  } = useMAKPIDataMedicalDeviceFacade();

  const {
    kpiFaceDataById: apiCosmeticsData,
    loading: apiCosmeticsLoading,
    error: apiCosmeticsError,
    metadata: apiCosmeticsMetadata,
  } = useMAKPIDataCosmeticsFacade();

  const isFoodFrontApiView =
    activeProduct === "food" && activeFoodSubTab === "food";
  const isFoodNotificationFaceApiView =
    activeProduct === "food" && activeFoodSubTab === "foodNotification";
  const isMedicalDeviceFaceApiView = activeProduct === "medicalDevice";
  const isCosmeticsFaceApiView = activeProduct === "cosmetics";
  const activeSeed = getMAProductKpiSeedForView(activeProduct, activeFoodSubTab);
  const activeProductLabel =
    activeProduct === "food"
      ? foodSubTabs.find((tab) => tab.key === activeFoodSubTab)?.label ?? "Food"
      : productTabs.find((tab) => tab.key === activeProduct)?.label;

  /** Medicine: merge API /8; Food (Food sub-tab): merge API /14; others use seed only */
  const mergedCards = useMemo(() => {
    const seedCards = activeSeed.cards;
    if (activeProduct === "medicine") {
      return mergeMedicineCardsWithStrictFaceData(seedCards, apiMedicineData);
    }
    if (isFoodFrontApiView) {
      return mergeFoodCardsWithStrictFaceData(seedCards, apiFoodData);
    }
    if (isFoodNotificationFaceApiView) {
      return mergeFoodCardsWithStrictFaceData(seedCards, apiFoodNotificationData);
    }
    if (isMedicalDeviceFaceApiView) {
      return mergeMedicalDeviceCardsWithStrictFaceData(seedCards, apiMedicalDeviceData);
    }
    if (isCosmeticsFaceApiView) {
      return mergeCosmeticsCardsWithStrictFaceData(seedCards, apiCosmeticsData);
    }
    return seedCards;
  }, [
    activeProduct,
    activeSeed.cards,
    apiMedicineData,
    apiFoodData,
    apiFoodNotificationData,
    apiMedicalDeviceData,
    apiCosmeticsData,
    isFoodFrontApiView,
    isFoodNotificationFaceApiView,
    isMedicalDeviceFaceApiView,
    isCosmeticsFaceApiView,
  ]);

  const summaryCards = useMemo(() => {
    return productTabs.map((product) => {
      const seed = maProductKpiSeed[product.key];
      const lead =
        product.key === activeProduct && mergedCards.length > 0
          ? mergedCards[0]
          : seed.cards[0];
      const summaryLoadingPulse =
        (activeProduct === "medicine" && product.key === "medicine" && apiMedicineLoading) ||
        (isFoodFrontApiView && product.key === "food" && apiFoodLoading) ||
        (isFoodNotificationFaceApiView &&
          product.key === "food" &&
          apiFoodNotificationLoading) ||
        (isMedicalDeviceFaceApiView &&
          product.key === "medicalDevice" &&
          apiMedicalDeviceLoading) ||
        (isCosmeticsFaceApiView && product.key === "cosmetics" && apiCosmeticsLoading);

      const text: ReactNode = summaryLoadingPulse ? (
        <span
          className="inline-block h-7 w-28 animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      ) : lead.faceDataMissing ? (
        <span className="text-sm text-muted-foreground">No data found</span>
      ) : lead.notApplicableReason ? (
        <span className="text-sm text-muted-foreground">N/A</span>
      ) : (
        `${lead.value.toFixed(lead.decimals)}${lead.suffix}`
      );
      return {
        key: product.key,
        label: seed.summaryTitle,
        text,
        description: seed.summaryDescription,
      };
    });
  }, [
    mergedCards,
    activeProduct,
    apiMedicineLoading,
    apiFoodLoading,
    apiFoodNotificationLoading,
    apiMedicalDeviceLoading,
    apiCosmeticsLoading,
    isFoodFrontApiView,
    isFoodNotificationFaceApiView,
    isMedicalDeviceFaceApiView,
    isCosmeticsFaceApiView,
  ]);

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

  const selectedDrilldownSource =
    isFoodFrontApiView && selectedKpiId && isApiKpiId(selectedKpiId) ? "food" : "default";

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
                  onClick={() => {
                    setActiveProduct(tab.key);
                    if (tab.key === "food") {
                      setActiveFoodSubTab(DEFAULT_FOOD_SUB_TAB);
                    }
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {activeProduct === "food" && (
            <div className="rounded-xl border bg-card p-2">
              <div className="grid grid-cols-2 gap-2">
                {foodSubTabs.map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    variant={activeFoodSubTab === tab.key ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setActiveFoodSubTab(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

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
                    ? "Medicine: KPI card values use live API (/8). Drilldowns: KPI 1 /9, KPI 2 /10, KPI 3 /11, KPI 4 /13. ".concat(
                        `Rows accepted: ${apiMedicineMetadata.acceptedRows}/${apiMedicineMetadata.filteredRows} filtered (${apiMedicineMetadata.totalRows} total).`
                      )
                    : isFoodFrontApiView
                      ? "Food: KPI 1–4 card values use live API (/14). Drilldowns: KPI 1 /18, KPI 2 /19, KPI 3 /20, KPI 4 /21. ".concat(
                          `Rows accepted: ${apiFoodMetadata.acceptedRows}/${apiFoodMetadata.filteredRows} filtered (${apiFoodMetadata.totalRows} total).`
                        )
                      : isFoodNotificationFaceApiView
                        ? "Food Notification: KPI 1–4 card values use live API (/15). Drilldowns unchanged (KPI 1 /9 … KPI 4 /13). ".concat(
                            `Rows accepted: ${apiFoodNotificationMetadata.acceptedRows}/${apiFoodNotificationMetadata.filteredRows} filtered (${apiFoodNotificationMetadata.totalRows} total).`
                          )
                        : isMedicalDeviceFaceApiView
                          ? "Medical Device: KPI 1–4 card values use live API (/16); `VMIN` → minor variation, `VMAJ` → major variation. KPI 5+ remain seeded. Drilldowns: KPI 1 /9, KPI 2 /10, KPI 3 /11, KPI 4 /13. ".concat(
                              `Rows accepted: ${apiMedicalDeviceMetadata.acceptedRows}/${apiMedicalDeviceMetadata.filteredRows} filtered (${apiMedicalDeviceMetadata.totalRows} total).`
                            )
                          : isCosmeticsFaceApiView
                            ? "Cosmetics: New, renewal, and combined variation face values use live API (/17). Minor and major variation rows aggregate into MA-KPI-3. KPI 5+ remain seeded. Drilldowns: KPI 1 /9, KPI 2 /10, KPI 3 /11, KPI 4 /13. ".concat(
                                `Rows accepted: ${apiCosmeticsMetadata.acceptedRows}/${apiCosmeticsMetadata.filteredRows} filtered (${apiCosmeticsMetadata.totalRows} total).`
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

          {(warningMessage ||
            (activeProduct === "medicine" && apiMedicineError) ||
            (isFoodFrontApiView && apiFoodError) ||
            (isFoodNotificationFaceApiView && apiFoodNotificationError) ||
            (isMedicalDeviceFaceApiView && apiMedicalDeviceError) ||
            (isCosmeticsFaceApiView && apiCosmeticsError)) && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 text-sm text-amber-800 dark:text-amber-200">
                {activeProduct === "medicine" && apiMedicineError
                  ? apiMedicineError.message
                  : isFoodFrontApiView && apiFoodError
                    ? apiFoodError.message
                    : isFoodNotificationFaceApiView && apiFoodNotificationError
                      ? apiFoodNotificationError.message
                      : isMedicalDeviceFaceApiView && apiMedicalDeviceError
                        ? apiMedicalDeviceError.message
                        : isCosmeticsFaceApiView && apiCosmeticsError
                          ? apiCosmeticsError.message
                          : warningMessage}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Showing {visibleCards.length} KPI cards for{" "}
              <span className="font-medium text-foreground">
                {activeProductLabel}
              </span>
              {(activeProduct === "medicine" && apiMedicineLoading) ||
              (isFoodFrontApiView && apiFoodLoading) ||
              (isFoodNotificationFaceApiView && apiFoodNotificationLoading) ||
              (isMedicalDeviceFaceApiView && apiMedicalDeviceLoading) ||
              (isCosmeticsFaceApiView && apiCosmeticsLoading) ? (
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
              const maFacePending =
                (activeProduct === "medicine" &&
                  isApiKpiId(card.drilldownId) &&
                  apiMedicineLoading) ||
                (isFoodFrontApiView && isApiKpiId(card.drilldownId) && apiFoodLoading) ||
                (isFoodNotificationFaceApiView &&
                  isApiKpiId(card.drilldownId) &&
                  apiFoodNotificationLoading) ||
                (isMedicalDeviceFaceApiView &&
                  isApiKpiId(card.drilldownId) &&
                  apiMedicalDeviceLoading) ||
                (isCosmeticsFaceApiView &&
                  isCosmeticsThreeSlotFaceKpi(card.drilldownId) &&
                  apiCosmeticsLoading);
              const apiKpi14StrictEmpty =
                activeProduct === "medicine" &&
                isApiKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing);
              const strictFoodFaceEmpty =
                (isFoodFrontApiView || isFoodNotificationFaceApiView) &&
                isApiKpiId(card.drilldownId) &&
                card.faceDataMissing;
              const strictMedicalDeviceFaceEmpty =
                isMedicalDeviceFaceApiView &&
                isApiKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing);
              const strictCosmeticsFaceEmpty =
                isCosmeticsFaceApiView &&
                isCosmeticsThreeSlotFaceKpi(card.drilldownId) &&
                Boolean(card.faceDataMissing);
              const cardIsEmpty =
                apiKpi14StrictEmpty ||
                strictFoodFaceEmpty ||
                strictMedicalDeviceFaceEmpty ||
                strictCosmeticsFaceEmpty ||
                Boolean(card.notApplicableReason);
              const showsLiveFaceMetric =
                !maFacePending &&
                !cardIsEmpty &&
                ((activeProduct === "medicine" && isApiKpiId(card.drilldownId)) ||
                  ((isFoodFrontApiView || isFoodNotificationFaceApiView) &&
                    isApiKpiId(card.drilldownId)) ||
                  (isMedicalDeviceFaceApiView && isApiKpiId(card.drilldownId)) ||
                  (isCosmeticsFaceApiView && isCosmeticsThreeSlotFaceKpi(card.drilldownId)));
              const showsSampleMetric = !maFacePending && !cardIsEmpty && !showsLiveFaceMetric;
              const strictLiveSlotEmpty =
                cardIsEmpty &&
                !card.notApplicableReason &&
                (apiKpi14StrictEmpty ||
                  strictFoodFaceEmpty ||
                  strictMedicalDeviceFaceEmpty ||
                  strictCosmeticsFaceEmpty);
              const helperText =
                cardIsEmpty || card.notApplicableReason
                  ? undefined
                  : showsLiveFaceMetric
                    ? "Values from the reporting API for this product line."
                    : `${activeProductLabel} view (sample data)`;
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
                  isLoading={maFacePending}
                  isEmpty={cardIsEmpty}
                  isNotApplicable={Boolean(card.notApplicableReason)}
                  emptyMessage={card.notApplicableReason ?? "No data found"}
                  onClick={() => handleCardClick(card.drilldownId)}
                />
              );
            })}
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
              drilldownSource={selectedDrilldownSource}
            />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
