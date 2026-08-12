"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { MATimeDrillDownModal } from "@/components/kpi/ma-time-drilldown-modal";
import {
  DEFAULT_FOOD_SUB_TAB,
  getMAProductKpiSeedForView,
  maProductKpiSeed,
  type MAFoodSubTabKey,
  type MAProductKey,
} from "@/data/ma-dummy-data";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import {
  useMACosmeticsParFaceFacade,
  useMAFoodParFaceFacade,
  useMAKPIDataCosmeticsFacade,
  useMAKPIDataFoodFacade,
  useMAKPIDataFoodNotificationFacade,
  useMAKPIDataMedicalDeviceFacade,
  useMAKPIDataMedicineFacade,
  useMAMedicalDeviceParFaceFacade,
  useMAMedicineMedianAverageFaceFacade,
  useMAMedicineParFaceFacade,
} from "@/hooks/useMAApi";
import {
  mergeCosmeticsCardsWithStrictFaceData,
  mergeFoodCardsWithStrictFaceData,
  mergeMedicalDeviceCardsWithStrictFaceData,
  mergeMedicineCardsWithAllFaceData,
  mergeParCardsWithStrictFaceData,
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
import type { KPIDrillDownData, MATimeDrillDownData } from "@/types/ma-drilldown";
import { cn } from "@/lib/utils";
import type { MAApiFilterParams, MAKPIId } from "@/types/ma-api";

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
const MEDICINE_TIME_KPI_IDS = ["MA-KPI-6", "MA-KPI-7"] as const;
const PAR_KPI_IDS = ["MA-KPI-8"] as const;

/** Face API: Cosmetics only — KPI 1–3 (variation aggregates into MA-KPI-3). */
const COSMETICS_FACE_KPI_IDS = ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3"] as const;

function isApiKpiId(kpiId: string): kpiId is MAKPIId {
  return API_KPI_IDS.includes(kpiId as (typeof API_KPI_IDS)[number]);
}

function isMedicineTimeKpiId(kpiId: string): kpiId is (typeof MEDICINE_TIME_KPI_IDS)[number] {
  return MEDICINE_TIME_KPI_IDS.includes(kpiId as (typeof MEDICINE_TIME_KPI_IDS)[number]);
}

function isParKpiId(kpiId: string): boolean {
  return PAR_KPI_IDS.includes(kpiId as (typeof PAR_KPI_IDS)[number]);
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
  const [datePreset, setDatePreset] = useState("ytd");
  /** Draft values bound to the date inputs (may change while spinning month/year). */
  const [draftDateFrom, setDraftDateFrom] = useState("2026-01-01");
  const [draftDateTo, setDraftDateTo] = useState("2026-12-31");
  /** Committed values — drive face APIs; drilldowns snapshot these on open. */
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");
  const [drilldownApiFilters, setDrilldownApiFilters] = useState<
    MAApiFilterParams | undefined
  >(undefined);
  const [cardDensity, setCardDensity] = useState<"grid" | "condensed">("grid");
  const dateCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftDatesRef = useRef({ from: "2026-01-01", to: "2026-12-31" });

  const clearDateCommitTimer = () => {
    if (dateCommitTimerRef.current != null) {
      clearTimeout(dateCommitTimerRef.current);
      dateCommitTimerRef.current = null;
    }
  };

  const commitDateFilters = (from: string, to: string) => {
    clearDateCommitTimer();
    setDateFrom(from);
    setDateTo(to);
  };

  /** Commit after the picker settles so month/year spinning does not spam face APIs. */
  const scheduleDateFilterCommit = () => {
    clearDateCommitTimer();
    dateCommitTimerRef.current = setTimeout(() => {
      const { from: nextFrom, to: nextTo } = draftDatesRef.current;
      setDateFrom(nextFrom);
      setDateTo(nextTo);
      dateCommitTimerRef.current = null;
    }, 500);
  };

  useEffect(() => () => clearDateCommitTimer(), []);

  const dateFiltersReady = Boolean(dateFrom && dateTo);
  const apiDateFilters = useMemo(
    () =>
      dateFiltersReady
        ? { startDate: dateFrom, endDate: dateTo }
        : undefined,
    [dateFiltersReady, dateFrom, dateTo]
  );

  const {
    kpiFaceDataById: apiMedicineData,
    loading: apiMedicineLoading,
    error: apiMedicineError,
  } = useMAKPIDataMedicineFacade(apiDateFilters, dateFiltersReady);

  const {
    kpiTimeDataById: apiMedicineTimeData,
    loading: apiMedicineTimeLoading,
    error: apiMedicineTimeError,
  } = useMAMedicineMedianAverageFaceFacade(apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiFoodData,
    loading: apiFoodLoading,
    error: apiFoodError,
  } = useMAKPIDataFoodFacade(apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiFoodNotificationData,
    loading: apiFoodNotificationLoading,
    error: apiFoodNotificationError,
  } = useMAKPIDataFoodNotificationFacade(apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiMedicalDeviceData,
    loading: apiMedicalDeviceLoading,
    error: apiMedicalDeviceError,
  } = useMAKPIDataMedicalDeviceFacade(apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiCosmeticsData,
    loading: apiCosmeticsLoading,
    error: apiCosmeticsError,
  } = useMAKPIDataCosmeticsFacade(apiDateFilters, dateFiltersReady);

  const {
    parData: apiMedicineParData,
    loading: apiMedicineParLoading,
    error: apiMedicineParError,
  } = useMAMedicineParFaceFacade(apiDateFilters, dateFiltersReady);

  const {
    parData: apiMedicalDeviceParData,
    loading: apiMedicalDeviceParLoading,
    error: apiMedicalDeviceParError,
  } = useMAMedicalDeviceParFaceFacade(apiDateFilters, dateFiltersReady);

  const {
    parData: apiFoodParData,
    loading: apiFoodParLoading,
    error: apiFoodParError,
  } = useMAFoodParFaceFacade(apiDateFilters, dateFiltersReady);

  const {
    parData: apiCosmeticsParData,
    loading: apiCosmeticsParLoading,
    error: apiCosmeticsParError,
  } = useMACosmeticsParFaceFacade(apiDateFilters, dateFiltersReady);

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

  /** Medicine: /8 (KPI 1–4), /26 (KPI 6–7), /29 (KPI 8 PAR); Food/MD/CO also merge PAR faces. */
  const mergedCards = useMemo(() => {
    const seedCards = activeSeed.cards;
    if (activeProduct === "medicine") {
      return mergeMedicineCardsWithAllFaceData(
        seedCards,
        apiMedicineData,
        apiMedicineTimeData,
        apiMedicineParData
      );
    }
    if (isFoodFrontApiView) {
      return mergeParCardsWithStrictFaceData(
        mergeFoodCardsWithStrictFaceData(seedCards, apiFoodData),
        apiFoodParData
      );
    }
    if (isFoodNotificationFaceApiView) {
      return mergeFoodCardsWithStrictFaceData(seedCards, apiFoodNotificationData);
    }
    if (isMedicalDeviceFaceApiView) {
      return mergeParCardsWithStrictFaceData(
        mergeMedicalDeviceCardsWithStrictFaceData(seedCards, apiMedicalDeviceData),
        apiMedicalDeviceParData
      );
    }
    if (isCosmeticsFaceApiView) {
      return mergeParCardsWithStrictFaceData(
        mergeCosmeticsCardsWithStrictFaceData(seedCards, apiCosmeticsData),
        apiCosmeticsParData
      );
    }
    return seedCards;
  }, [
    activeProduct,
    activeSeed.cards,
    apiMedicineData,
    apiMedicineTimeData,
    apiMedicineParData,
    apiFoodData,
    apiFoodParData,
    apiFoodNotificationData,
    apiMedicalDeviceData,
    apiMedicalDeviceParData,
    apiCosmeticsData,
    apiCosmeticsParData,
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
        !dateFiltersReady ||
        (activeProduct === "medicine" &&
          product.key === "medicine" &&
          (apiMedicineLoading || apiMedicineTimeLoading || apiMedicineParLoading)) ||
        (isFoodFrontApiView && product.key === "food" && (apiFoodLoading || apiFoodParLoading)) ||
        (isFoodNotificationFaceApiView &&
          product.key === "food" &&
          apiFoodNotificationLoading) ||
        (isMedicalDeviceFaceApiView &&
          product.key === "medicalDevice" &&
          (apiMedicalDeviceLoading || apiMedicalDeviceParLoading)) ||
        (isCosmeticsFaceApiView &&
          product.key === "cosmetics" &&
          (apiCosmeticsLoading || apiCosmeticsParLoading));

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
    dateFiltersReady,
    apiMedicineLoading,
    apiMedicineTimeLoading,
    apiMedicineParLoading,
    apiFoodLoading,
    apiFoodParLoading,
    apiFoodNotificationLoading,
    apiMedicalDeviceLoading,
    apiMedicalDeviceParLoading,
    apiCosmeticsLoading,
    apiCosmeticsParLoading,
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
    // Snapshot dates at open so face date changes do not refetch an open drilldown.
    setDrilldownApiFilters(apiDateFilters);
    setSelectedKpiId(kpiId);
    setIsModalOpen(true);
  };

  const handleModalClose = (open?: boolean) => {
    if (open) return;
    setIsModalOpen(false);
    setSelectedKpiId(null);
    setDrilldownApiFilters(undefined);
  };

  const selectedDrilldown: KPIDrillDownData | null = useMemo(() => {
    if (!selectedKpiId) return null;
    return maDrillDownData[selectedKpiId] ?? null;
  }, [selectedKpiId]);

  const selectedTimeDrilldown: MATimeDrillDownData | null = useMemo(() => {
    if (!selectedKpiId || !isMedicineTimeKpiId(selectedKpiId)) return null;
    const seed = maDrillDownData[selectedKpiId];
    if (selectedKpiId === "MA-KPI-6") {
      return {
        kpiId: "MA-KPI-6",
        kpiName: seed?.kpiName ?? "Median Time for New MA Applications",
        metricType: "median",
        currentValue: {
          value: seed?.currentValue.median ?? seed?.currentValue.value ?? 0,
          median: seed?.currentValue.median ?? seed?.currentValue.value,
          targetDays: 270,
        },
        categoryViews: [],
      };
    }
    return {
      kpiId: "MA-KPI-7",
      kpiName: seed?.kpiName ?? "Average Time for New MA Applications",
      metricType: "average",
      currentValue: {
        value: seed?.currentValue.average ?? seed?.currentValue.value ?? 0,
        average: seed?.currentValue.average ?? seed?.currentValue.value,
        targetDays: 270,
      },
      categoryViews: [],
    };
  }, [selectedKpiId]);

  const selectedDrilldownSource =
    isFoodFrontApiView && selectedKpiId && isApiKpiId(selectedKpiId)
      ? "food"
      : isMedicalDeviceFaceApiView && selectedKpiId && isApiKpiId(selectedKpiId)
        ? "medicalDevice"
        : "default";

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
    const applyBoth = (from: string, to: string) => {
      setDraftDateFrom(from);
      setDraftDateTo(to);
      draftDatesRef.current = { from, to };
      commitDateFilters(from, to);
    };
    if (preset === "this-quarter") {
      applyBoth("2026-01-01", "2026-03-31");
      return;
    }
    if (preset === "last-quarter") {
      applyBoth("2025-10-01", "2025-12-31");
      return;
    }
    if (preset === "last-30") {
      applyBoth("2026-02-01", "2026-03-31");
      return;
    }
    if (preset === "ytd") {
      applyBoth("2026-01-01", "2026-12-31");
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
                  <Select
                    value={datePreset || undefined}
                    onValueChange={applyDatePreset}
                  >
                    <SelectTrigger className="h-9 w-full min-w-0">
                      <SelectValue placeholder="Choose preset" />
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
                      value={draftDateFrom}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDatePreset("");
                        setDraftDateFrom(next);
                        draftDatesRef.current = { ...draftDatesRef.current, from: next };
                        scheduleDateFilterCommit();
                      }}
                      onBlur={() => {
                        commitDateFilters(
                          draftDatesRef.current.from,
                          draftDatesRef.current.to
                        );
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">DD/MM/YYYY</p>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <div className="relative min-w-0">
                    <CalendarDaysIcon className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="h-9 min-w-0 pl-8"
                      value={draftDateTo}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDatePreset("");
                        setDraftDateTo(next);
                        draftDatesRef.current = { ...draftDatesRef.current, to: next };
                        scheduleDateFilterCommit();
                      }}
                      onBlur={() => {
                        commitDateFilters(
                          draftDatesRef.current.from,
                          draftDatesRef.current.to
                        );
                      }}
                      min={draftDateFrom || undefined}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">DD/MM/YYYY</p>
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
              <div className="flex min-w-0 justify-end border-t border-border/60 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => {
                    setSearchTerm("");
                    applyDatePreset("ytd");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {(warningMessage ||
            (activeProduct === "medicine" &&
              (apiMedicineError || apiMedicineTimeError || apiMedicineParError)) ||
            (isFoodFrontApiView && (apiFoodError || apiFoodParError)) ||
            (isFoodNotificationFaceApiView && apiFoodNotificationError) ||
            (isMedicalDeviceFaceApiView && (apiMedicalDeviceError || apiMedicalDeviceParError)) ||
            (isCosmeticsFaceApiView && (apiCosmeticsError || apiCosmeticsParError))) && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 text-sm text-amber-800 dark:text-amber-200">
                {activeProduct === "medicine" &&
                (apiMedicineError || apiMedicineTimeError || apiMedicineParError)
                  ? [apiMedicineError?.message, apiMedicineTimeError?.message, apiMedicineParError?.message]
                      .filter(Boolean)
                      .join(" · ")
                  : isFoodFrontApiView && (apiFoodError || apiFoodParError)
                    ? [apiFoodError?.message, apiFoodParError?.message].filter(Boolean).join(" · ")
                    : isFoodNotificationFaceApiView && apiFoodNotificationError
                      ? apiFoodNotificationError.message
                      : isMedicalDeviceFaceApiView && (apiMedicalDeviceError || apiMedicalDeviceParError)
                        ? [apiMedicalDeviceError?.message, apiMedicalDeviceParError?.message]
                            .filter(Boolean)
                            .join(" · ")
                        : isCosmeticsFaceApiView && (apiCosmeticsError || apiCosmeticsParError)
                          ? [apiCosmeticsError?.message, apiCosmeticsParError?.message]
                              .filter(Boolean)
                              .join(" · ")
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
              {(activeProduct === "medicine" &&
                (apiMedicineLoading || apiMedicineTimeLoading || apiMedicineParLoading)) ||
              (isFoodFrontApiView && (apiFoodLoading || apiFoodParLoading)) ||
              (isFoodNotificationFaceApiView && apiFoodNotificationLoading) ||
              (isMedicalDeviceFaceApiView &&
                (apiMedicalDeviceLoading || apiMedicalDeviceParLoading)) ||
              (isCosmeticsFaceApiView && (apiCosmeticsLoading || apiCosmeticsParLoading)) ? (
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
              const isLiveFaceSlot =
                (activeProduct === "medicine" &&
                  (isApiKpiId(card.drilldownId) ||
                    isMedicineTimeKpiId(card.drilldownId) ||
                    isParKpiId(card.drilldownId))) ||
                (isFoodFrontApiView &&
                  (isApiKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                (isFoodNotificationFaceApiView && isApiKpiId(card.drilldownId)) ||
                (isMedicalDeviceFaceApiView &&
                  (isApiKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                (isCosmeticsFaceApiView &&
                  (isCosmeticsThreeSlotFaceKpi(card.drilldownId) ||
                    isParKpiId(card.drilldownId)));
              const maFacePending =
                isLiveFaceSlot &&
                (!dateFiltersReady ||
                  (activeProduct === "medicine" &&
                    isApiKpiId(card.drilldownId) &&
                    apiMedicineLoading) ||
                  (activeProduct === "medicine" &&
                    isMedicineTimeKpiId(card.drilldownId) &&
                    apiMedicineTimeLoading) ||
                  (activeProduct === "medicine" &&
                    isParKpiId(card.drilldownId) &&
                    apiMedicineParLoading) ||
                  (isFoodFrontApiView && isApiKpiId(card.drilldownId) && apiFoodLoading) ||
                  (isFoodFrontApiView && isParKpiId(card.drilldownId) && apiFoodParLoading) ||
                  (isFoodNotificationFaceApiView &&
                    isApiKpiId(card.drilldownId) &&
                    apiFoodNotificationLoading) ||
                  (isMedicalDeviceFaceApiView &&
                    isApiKpiId(card.drilldownId) &&
                    apiMedicalDeviceLoading) ||
                  (isMedicalDeviceFaceApiView &&
                    isParKpiId(card.drilldownId) &&
                    apiMedicalDeviceParLoading) ||
                  (isCosmeticsFaceApiView &&
                    isCosmeticsThreeSlotFaceKpi(card.drilldownId) &&
                    apiCosmeticsLoading) ||
                  (isCosmeticsFaceApiView &&
                    isParKpiId(card.drilldownId) &&
                    apiCosmeticsParLoading));
              const apiKpi14StrictEmpty =
                activeProduct === "medicine" &&
                isApiKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing);
              const apiMedicineTimeStrictEmpty =
                activeProduct === "medicine" &&
                isMedicineTimeKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing);
              const strictParFaceEmpty =
                isParKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing) &&
                (activeProduct === "medicine" ||
                  isFoodFrontApiView ||
                  isMedicalDeviceFaceApiView ||
                  isCosmeticsFaceApiView);
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
                apiMedicineTimeStrictEmpty ||
                strictParFaceEmpty ||
                strictFoodFaceEmpty ||
                strictMedicalDeviceFaceEmpty ||
                strictCosmeticsFaceEmpty ||
                Boolean(card.notApplicableReason);
              const showsLiveFaceMetric =
                !maFacePending &&
                !cardIsEmpty &&
                ((activeProduct === "medicine" &&
                  (isApiKpiId(card.drilldownId) ||
                    isMedicineTimeKpiId(card.drilldownId) ||
                    isParKpiId(card.drilldownId))) ||
                  (isFoodFrontApiView &&
                    (isApiKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                  (isFoodNotificationFaceApiView && isApiKpiId(card.drilldownId)) ||
                  (isMedicalDeviceFaceApiView &&
                    (isApiKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                  (isCosmeticsFaceApiView &&
                    (isCosmeticsThreeSlotFaceKpi(card.drilldownId) ||
                      isParKpiId(card.drilldownId))));
              const showsSampleMetric = !maFacePending && !cardIsEmpty && !showsLiveFaceMetric;
              const strictLiveSlotEmpty =
                cardIsEmpty &&
                !card.notApplicableReason &&
                (apiKpi14StrictEmpty ||
                  apiMedicineTimeStrictEmpty ||
                  strictParFaceEmpty ||
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
                  moduleBreakdown={card.moduleBreakdown}
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

          {selectedTimeDrilldown && (
            <MATimeDrillDownModal
              open={isModalOpen}
              onOpenChange={handleModalClose}
              data={selectedTimeDrilldown}
              filters={drilldownApiFilters}
            />
          )}

          {selectedDrilldown && !selectedTimeDrilldown && (
            <MADrillDownModal
              open={isModalOpen}
              onOpenChange={handleModalClose}
              data={selectedDrilldown}
              drilldownSource={selectedDrilldownSource}
              filters={drilldownApiFilters}
            />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
