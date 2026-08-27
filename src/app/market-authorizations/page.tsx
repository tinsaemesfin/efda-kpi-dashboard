"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";
import { MAKPICard } from "@/components/kpi/ma-kpi-card";
import { MADrillDownModal } from "@/components/kpi/ma-drilldown-modal";
import { MATimeDrillDownModal } from "@/components/kpi/ma-time-drilldown-modal";
import {
  DEFAULT_FOOD_SUB_TAB,
  getMAProductKpiSeedForView,
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
  useMAProductMedianAverageFaceFacade,
  useMAProductParFaceFacade,
} from "@/hooks/useMAApi";
import {
  mergeCosmeticsCardsWithStrictFaceData,
  mergeFoodCardsWithStrictFaceData,
  mergeMedicalDeviceCardsWithStrictFaceData,
  mergeMedicineCardsWithAllFaceData,
  mergeMedicineTimeCardsWithStrictFaceData,
  mergeParCardsWithStrictFaceData,
} from "@/lib/ma-api/merge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ActivityIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  CroissantIcon,
  FileSearchIcon,
  LayoutGridIcon,
  Loader2Icon,
  RotateCcwIcon,
  Rows3Icon,
  SearchIcon,
  PackageIcon,
  SlidersHorizontalIcon,
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

const productTheme: Record<
  MAProductKey,
  { active: string; icon: string; border: string; description: string }
> = {
  medicine: {
    active: "border-violet-400 bg-violet-600 text-white shadow-violet-900/20",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    border: "hover:border-violet-300 dark:hover:border-violet-700",
    description: "New, renewal, variation and PAR pathways",
  },
  food: {
    active: "border-amber-400 bg-amber-500 text-white shadow-amber-900/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    border: "hover:border-amber-300 dark:hover:border-amber-700",
    description: "Food applications and notification services",
  },
  medicalDevice: {
    active: "border-sky-400 bg-sky-600 text-white shadow-sky-900/20",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    border: "hover:border-sky-300 dark:hover:border-sky-700",
    description: "Device authorization and publication pathways",
  },
  cosmetics: {
    active: "border-fuchsia-400 bg-fuchsia-600 text-white shadow-fuchsia-900/20",
    icon: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
    border: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
    description: "Cosmetic product authorization performance",
  },
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
const TIME_KPI_IDS = ["MA-KPI-6", "MA-KPI-7"] as const;
const PAR_KPI_IDS = ["MA-KPI-8"] as const;

/** Face API: Cosmetics only — KPI 1–3 (variation aggregates into MA-KPI-3). */
const COSMETICS_FACE_KPI_IDS = ["MA-KPI-1", "MA-KPI-2", "MA-KPI-3"] as const;

function isApiKpiId(kpiId: string): kpiId is MAKPIId {
  return API_KPI_IDS.includes(kpiId as (typeof API_KPI_IDS)[number]);
}

function isTimeKpiId(kpiId: string): kpiId is (typeof TIME_KPI_IDS)[number] {
  return TIME_KPI_IDS.includes(kpiId as (typeof TIME_KPI_IDS)[number]);
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
  } = useMAProductMedianAverageFaceFacade("medicine", apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiFoodData,
    loading: apiFoodLoading,
    error: apiFoodError,
  } = useMAKPIDataFoodFacade(apiDateFilters, dateFiltersReady);

  const { kpiTimeDataById: apiFoodTimeData, loading: apiFoodTimeLoading, error: apiFoodTimeError } =
    useMAProductMedianAverageFaceFacade("food", apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiFoodNotificationData,
    loading: apiFoodNotificationLoading,
    error: apiFoodNotificationError,
  } = useMAKPIDataFoodNotificationFacade(apiDateFilters, dateFiltersReady);

  const { kpiTimeDataById: apiFoodNotificationTimeData, loading: apiFoodNotificationTimeLoading, error: apiFoodNotificationTimeError } =
    useMAProductMedianAverageFaceFacade("foodNotification", apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiMedicalDeviceData,
    loading: apiMedicalDeviceLoading,
    error: apiMedicalDeviceError,
  } = useMAKPIDataMedicalDeviceFacade(apiDateFilters, dateFiltersReady);

  const { kpiTimeDataById: apiMedicalDeviceTimeData, loading: apiMedicalDeviceTimeLoading, error: apiMedicalDeviceTimeError } =
    useMAProductMedianAverageFaceFacade("medicalDevice", apiDateFilters, dateFiltersReady);

  const {
    kpiFaceDataById: apiCosmeticsData,
    loading: apiCosmeticsLoading,
    error: apiCosmeticsError,
  } = useMAKPIDataCosmeticsFacade(apiDateFilters, dateFiltersReady);

  const { kpiTimeDataById: apiCosmeticsTimeData, loading: apiCosmeticsTimeLoading, error: apiCosmeticsTimeError } =
    useMAProductMedianAverageFaceFacade("cosmetics", apiDateFilters, dateFiltersReady);

  const {
    parData: apiMedicineParData,
    loading: apiMedicineParLoading,
    error: apiMedicineParError,
  } = useMAProductParFaceFacade("medicine", apiDateFilters, dateFiltersReady);

  const {
    parData: apiMedicalDeviceParData,
    loading: apiMedicalDeviceParLoading,
    error: apiMedicalDeviceParError,
  } = useMAProductParFaceFacade("medicalDevice", apiDateFilters, dateFiltersReady);

  const {
    parData: apiFoodParData,
    loading: apiFoodParLoading,
    error: apiFoodParError,
  } = useMAProductParFaceFacade("food", apiDateFilters, dateFiltersReady);

  const {
    parData: apiCosmeticsParData,
    loading: apiCosmeticsParLoading,
    error: apiCosmeticsParError,
  } = useMAProductParFaceFacade("cosmetics", apiDateFilters, dateFiltersReady);

  const { parData: apiFoodNotificationParData, loading: apiFoodNotificationParLoading, error: apiFoodNotificationParError } =
    useMAProductParFaceFacade("foodNotification", apiDateFilters, dateFiltersReady);

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
        mergeMedicineTimeCardsWithStrictFaceData(
          mergeFoodCardsWithStrictFaceData(seedCards, apiFoodData),
          apiFoodTimeData
        ),
        apiFoodParData
      );
    }
    if (isFoodNotificationFaceApiView) {
      return mergeParCardsWithStrictFaceData(
        mergeMedicineTimeCardsWithStrictFaceData(
          mergeFoodCardsWithStrictFaceData(seedCards, apiFoodNotificationData),
          apiFoodNotificationTimeData
        ),
        apiFoodNotificationParData
      );
    }
    if (isMedicalDeviceFaceApiView) {
      return mergeParCardsWithStrictFaceData(
        mergeMedicineTimeCardsWithStrictFaceData(
          mergeMedicalDeviceCardsWithStrictFaceData(seedCards, apiMedicalDeviceData),
          apiMedicalDeviceTimeData
        ),
        apiMedicalDeviceParData
      );
    }
    if (isCosmeticsFaceApiView) {
      return mergeParCardsWithStrictFaceData(
        mergeMedicineTimeCardsWithStrictFaceData(
          mergeCosmeticsCardsWithStrictFaceData(seedCards, apiCosmeticsData),
          apiCosmeticsTimeData
        ),
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
    apiFoodTimeData,
    apiFoodParData,
    apiFoodNotificationData,
    apiFoodNotificationTimeData,
    apiFoodNotificationParData,
    apiMedicalDeviceData,
    apiMedicalDeviceTimeData,
    apiMedicalDeviceParData,
    apiCosmeticsData,
    apiCosmeticsTimeData,
    apiCosmeticsParData,
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
    if (!selectedKpiId || !isTimeKpiId(selectedKpiId)) return null;
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
    activeProduct === "food"
      ? activeFoodSubTab
      : activeProduct;

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

  const isFaceRefreshing =
    !dateFiltersReady ||
    (activeProduct === "medicine" &&
      (apiMedicineLoading || apiMedicineTimeLoading || apiMedicineParLoading)) ||
    (isFoodFrontApiView && (apiFoodLoading || apiFoodTimeLoading || apiFoodParLoading)) ||
    (isFoodNotificationFaceApiView &&
      (apiFoodNotificationLoading || apiFoodNotificationTimeLoading || apiFoodNotificationParLoading)) ||
    (isMedicalDeviceFaceApiView &&
      (apiMedicalDeviceLoading || apiMedicalDeviceTimeLoading || apiMedicalDeviceParLoading)) ||
    (isCosmeticsFaceApiView &&
      (apiCosmeticsLoading || apiCosmeticsTimeLoading || apiCosmeticsParLoading));

  const formatPeriodDate = (value: string) => {
    if (!value) return "Not set";
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mx-auto max-w-[1600px] space-y-6">
          <section className="ma-enter relative overflow-hidden rounded-[2rem] border border-violet-200/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_48%,#f1edff_100%)] shadow-[0_30px_80px_-55px_rgba(76,29,149,0.7)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111024_52%,#18112e_100%)]">
            <div className="ma-orbit pointer-events-none absolute -right-24 -top-32 size-[26rem] rounded-full border border-violet-300/30" />
            <div className="ma-orbit ma-orbit-reverse pointer-events-none absolute -right-6 -top-24 size-[20rem] rounded-full border border-fuchsia-300/20" />
            <div className="relative grid lg:grid-cols-[0.85fr_1.15fr]">
              <div className="flex flex-col justify-between border-b border-violet-100 p-6 sm:p-8 lg:min-h-[320px] lg:border-b-0 lg:border-r dark:border-violet-900/50">
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 shadow-sm backdrop-blur dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300"><ActivityIcon className="size-3.5" /> Market authorization</div>
                  <h1 className="max-w-xl text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl dark:text-white">From submission to <span className="text-violet-600 dark:text-violet-400">regulatory decision.</span></h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">Explore timeliness, processing speed, and publication transparency in the context of a specific regulated product.</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2Icon className="size-4 text-emerald-500" /> API-backed face metrics</span>
                  <span className="inline-flex items-center gap-1.5"><FileSearchIcon className="size-4 text-violet-500" /> Indicator-level exploration</span>
                </div>
              </div>

              <nav className="relative p-5 sm:p-7" aria-label="Market authorization product contexts">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div><p className="text-sm font-bold text-slate-900 dark:text-white">Choose a product context</p><p className="mt-1 text-xs text-slate-500">The indicator catalogue adapts to your selection.</p></div>
                  <span className="hidden rounded-full bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 sm:inline dark:bg-violet-950 dark:text-violet-300">Current: {activeProductLabel}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {productTabs.map((tab, index) => {
                    const selected = activeProduct === tab.key;
                    const theme = productTheme[tab.key];
                    return (
                      <button key={tab.key} type="button" className={cn("ma-product-option group relative min-h-28 overflow-hidden rounded-2xl border bg-white/80 p-4 text-left shadow-sm backdrop-blur transition-[transform,border-color,box-shadow,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-slate-950/55", theme.border, selected ? cn(theme.active, "-translate-y-0.5 shadow-xl") : "border-slate-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800")} style={{ animationDelay: `${100 + index * 70}ms` }} onClick={() => { setActiveProduct(tab.key); if (tab.key === "food") setActiveFoodSubTab(DEFAULT_FOOD_SUB_TAB); }} aria-pressed={selected}>
                        {selected && <span className="ma-selection-sheen pointer-events-none absolute inset-0" />}
                        <div className="relative flex h-full items-start gap-3">
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110", selected ? "bg-white/15 text-white" : theme.icon)}>{summaryIcons[tab.key]}</span>
                          <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-bold">{tab.label}</p>{selected && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">Viewing</span>}</div><p className={cn("mt-2 text-xs leading-5", selected ? "text-white/75" : "text-slate-500 dark:text-slate-400")}>{theme.description}</p></div>
                          <ArrowRightIcon className={cn("ml-auto mt-1 size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1", selected ? "text-white" : "text-slate-300")} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </section>

          {activeProduct === "food" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-2 dark:border-amber-900/70 dark:bg-amber-950/20">
              <div className="grid grid-cols-2 gap-2">
                {foodSubTabs.map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    variant={activeFoodSubTab === tab.key ? "default" : "ghost"}
                    className={cn("w-full rounded-xl", activeFoodSubTab === tab.key && "bg-amber-500 text-white hover:bg-amber-600")}
                    onClick={() => setActiveFoodSubTab(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <section className="ma-enter ma-enter-delay relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-950/70" aria-label="Dashboard filters">
            {isFaceRefreshing && <div className="ma-filter-loading absolute inset-x-0 top-0 z-10 h-1 bg-linear-to-r from-violet-500 via-fuchsia-400 to-sky-400" />}
            <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[0.85fr_1fr_1fr_1.25fr_auto]">
              <div className="min-w-0">
                <label htmlFor="ma-date-preset" className="sr-only">Date preset</label>
                <Select value={datePreset || undefined} onValueChange={applyDatePreset}>
                  <SelectTrigger id="ma-date-preset" className="h-11 w-full rounded-xl border-violet-200 bg-violet-50/70 py-1 pl-1.5 pr-3 hover:border-violet-300 dark:border-violet-900/70 dark:bg-violet-950/30">
                    <div className="flex min-w-0 items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-600 text-white shadow-sm shadow-violet-600/25"><SlidersHorizontalIcon className="size-4 text-white" /></span><SelectValue placeholder="Custom period" /></div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-quarter">This quarter</SelectItem>
                    <SelectItem value="last-quarter">Last quarter</SelectItem>
                    <SelectItem value="last-30">Last 30 days</SelectItem>
                    <SelectItem value="ytd">Year to date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative min-w-0"><label htmlFor="ma-date-from" className="sr-only">Start date</label><span className="pointer-events-none absolute left-1.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/25"><CalendarDaysIcon className="size-4" /></span><Input id="ma-date-from" type="date" className="h-11 rounded-xl border-sky-200 bg-sky-50/60 pl-11 focus-visible:border-sky-400 focus-visible:ring-sky-300 dark:border-sky-900/70 dark:bg-sky-950/25" value={draftDateFrom} onChange={(e) => { const next = e.target.value; setDatePreset(""); setDraftDateFrom(next); draftDatesRef.current = { ...draftDatesRef.current, from: next }; scheduleDateFilterCommit(); }} onBlur={() => commitDateFilters(draftDatesRef.current.from, draftDatesRef.current.to)} /></div>
              <div className="relative min-w-0"><label htmlFor="ma-date-to" className="sr-only">End date</label><span className="pointer-events-none absolute left-1.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-500/25"><CalendarDaysIcon className="size-4" /></span><Input id="ma-date-to" type="date" className="h-11 rounded-xl border-indigo-200 bg-indigo-50/60 pl-11 focus-visible:border-indigo-400 focus-visible:ring-indigo-300 dark:border-indigo-900/70 dark:bg-indigo-950/25" value={draftDateTo} onChange={(e) => { const next = e.target.value; setDatePreset(""); setDraftDateTo(next); draftDatesRef.current = { ...draftDatesRef.current, to: next }; scheduleDateFilterCommit(); }} onBlur={() => commitDateFilters(draftDatesRef.current.from, draftDatesRef.current.to)} min={draftDateFrom || undefined} /></div>
              <div className="relative min-w-0"><label htmlFor="ma-kpi-search" className="sr-only">Find an indicator</label><span className="pointer-events-none absolute left-1.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-lg bg-fuchsia-500 text-white shadow-sm shadow-fuchsia-500/25"><SearchIcon className="size-4" /></span><Input id="ma-kpi-search" type="search" placeholder="Search indicators…" className="h-11 rounded-xl border-fuchsia-200 bg-fuchsia-50/50 pl-11 focus-visible:border-fuchsia-400 focus-visible:ring-fuchsia-300 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <Button type="button" variant="outline" className="h-11 gap-2 rounded-xl border-rose-200 bg-rose-50/60 px-3 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-300" onClick={() => { setSearchTerm(""); applyDatePreset("ytd"); }}><span className="grid size-7 place-items-center rounded-lg bg-rose-500 text-white"><RotateCcwIcon className="size-3.5" /></span><span className="xl:sr-only">Reset</span></Button>
            </div>
            <div className="flex min-h-10 w-full flex-wrap items-center justify-between gap-2 border-t border-violet-100 bg-violet-50/60 px-4 py-2 text-xs dark:border-violet-900/60 dark:bg-violet-950/25">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className={cn("size-2 rounded-full", isFaceRefreshing ? "animate-pulse bg-amber-500" : "bg-emerald-600")} />{isFaceRefreshing ? "Updating indicators…" : "Filters applied"}</span>
              <span className="font-semibold text-violet-700 dark:text-violet-300">{formatPeriodDate(dateFrom)} → {formatPeriodDate(dateTo)}{searchTerm && ` · “${searchTerm}”`}</span>
            </div>
          </section>

          {(warningMessage ||
            (activeProduct === "medicine" &&
              (apiMedicineError || apiMedicineTimeError || apiMedicineParError)) ||
            (isFoodFrontApiView && (apiFoodError || apiFoodTimeError || apiFoodParError)) ||
            (isFoodNotificationFaceApiView && (apiFoodNotificationError || apiFoodNotificationTimeError || apiFoodNotificationParError)) ||
            (isMedicalDeviceFaceApiView && (apiMedicalDeviceError || apiMedicalDeviceTimeError || apiMedicalDeviceParError)) ||
            (isCosmeticsFaceApiView && (apiCosmeticsError || apiCosmeticsTimeError || apiCosmeticsParError))) && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 text-sm text-amber-800 dark:text-amber-200">
                {activeProduct === "medicine" &&
                (apiMedicineError || apiMedicineTimeError || apiMedicineParError)
                  ? [apiMedicineError?.message, apiMedicineTimeError?.message, apiMedicineParError?.message]
                      .filter(Boolean)
                      .join(" · ")
                  : isFoodFrontApiView && (apiFoodError || apiFoodTimeError || apiFoodParError)
                    ? [apiFoodError?.message, apiFoodTimeError?.message, apiFoodParError?.message].filter(Boolean).join(" · ")
                    : isFoodNotificationFaceApiView && (apiFoodNotificationError || apiFoodNotificationTimeError || apiFoodNotificationParError)
                      ? [apiFoodNotificationError?.message, apiFoodNotificationTimeError?.message, apiFoodNotificationParError?.message].filter(Boolean).join(" · ")
                      : isMedicalDeviceFaceApiView && (apiMedicalDeviceError || apiMedicalDeviceTimeError || apiMedicalDeviceParError)
                        ? [apiMedicalDeviceError?.message, apiMedicalDeviceTimeError?.message, apiMedicalDeviceParError?.message]
                            .filter(Boolean)
                            .join(" · ")
                        : isCosmeticsFaceApiView && (apiCosmeticsError || apiCosmeticsTimeError || apiCosmeticsParError)
                          ? [apiCosmeticsError?.message, apiCosmeticsTimeError?.message, apiCosmeticsParError?.message]
                              .filter(Boolean)
                              .join(" · ")
                          : warningMessage}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("grid size-9 place-items-center rounded-xl", productTheme[activeProduct].icon)}>{summaryIcons[activeProduct]}</span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{activeProductLabel} performance</h2>
                  <p className="text-xs text-muted-foreground">{visibleCards.length} indicators · select a card to explore details</p>
                </div>
              </div>
              {(activeProduct === "medicine" &&
                (apiMedicineLoading || apiMedicineTimeLoading || apiMedicineParLoading)) ||
              (isFoodFrontApiView && (apiFoodLoading || apiFoodTimeLoading || apiFoodParLoading)) ||
              (isFoodNotificationFaceApiView && (apiFoodNotificationLoading || apiFoodNotificationTimeLoading || apiFoodNotificationParLoading)) ||
              (isMedicalDeviceFaceApiView &&
                (apiMedicalDeviceLoading || apiMedicalDeviceTimeLoading || apiMedicalDeviceParLoading)) ||
              (isCosmeticsFaceApiView && (apiCosmeticsLoading || apiCosmeticsTimeLoading || apiCosmeticsParLoading)) ? (
                <span className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground"><Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden /> Refreshing live metrics</span>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={cardDensity === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                  onClick={() => setCardDensity("grid")}
                >
                  <LayoutGridIcon className="size-3.5" /> Grid
                </Button>
                <Button
                  type="button"
                  variant={cardDensity === "condensed" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                  onClick={() => setCardDensity("condensed")}
                >
                  <Rows3Icon className="size-3.5" /> Compact
                </Button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "grid items-stretch gap-4",
              cardDensity === "grid"
                ? "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                : "md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            )}
          >
            {visibleCards.map((card, index) => {
              const isLiveFaceSlot =
                (activeProduct === "medicine" &&
                  (isApiKpiId(card.drilldownId) ||
                    isTimeKpiId(card.drilldownId) ||
                    isParKpiId(card.drilldownId))) ||
                (isFoodFrontApiView &&
                  (isApiKpiId(card.drilldownId) || isTimeKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                (isFoodNotificationFaceApiView &&
                  (isApiKpiId(card.drilldownId) || isTimeKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                (isMedicalDeviceFaceApiView &&
                  (isApiKpiId(card.drilldownId) || isTimeKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                (isCosmeticsFaceApiView &&
                  (isCosmeticsThreeSlotFaceKpi(card.drilldownId) ||
                    isTimeKpiId(card.drilldownId) ||
                    isParKpiId(card.drilldownId)));
              const maFacePending =
                isLiveFaceSlot &&
                (!dateFiltersReady ||
                  (activeProduct === "medicine" &&
                    isApiKpiId(card.drilldownId) &&
                    apiMedicineLoading) ||
                  (activeProduct === "medicine" &&
                    isTimeKpiId(card.drilldownId) &&
                    apiMedicineTimeLoading) ||
                  (activeProduct === "medicine" &&
                    isParKpiId(card.drilldownId) &&
                    apiMedicineParLoading) ||
                  (isFoodFrontApiView && isApiKpiId(card.drilldownId) && apiFoodLoading) ||
                  (isFoodFrontApiView && isTimeKpiId(card.drilldownId) && apiFoodTimeLoading) ||
                  (isFoodFrontApiView && isParKpiId(card.drilldownId) && apiFoodParLoading) ||
                  (isFoodNotificationFaceApiView &&
                    isApiKpiId(card.drilldownId) &&
                    apiFoodNotificationLoading) ||
                  (isFoodNotificationFaceApiView && isTimeKpiId(card.drilldownId) && apiFoodNotificationTimeLoading) ||
                  (isFoodNotificationFaceApiView && isParKpiId(card.drilldownId) && apiFoodNotificationParLoading) ||
                  (isMedicalDeviceFaceApiView &&
                    isApiKpiId(card.drilldownId) &&
                    apiMedicalDeviceLoading) ||
                  (isMedicalDeviceFaceApiView && isTimeKpiId(card.drilldownId) && apiMedicalDeviceTimeLoading) ||
                  (isMedicalDeviceFaceApiView &&
                    isParKpiId(card.drilldownId) &&
                    apiMedicalDeviceParLoading) ||
                  (isCosmeticsFaceApiView &&
                    isCosmeticsThreeSlotFaceKpi(card.drilldownId) &&
                    apiCosmeticsLoading) ||
                  (isCosmeticsFaceApiView && isTimeKpiId(card.drilldownId) && apiCosmeticsTimeLoading) ||
                  (isCosmeticsFaceApiView &&
                    isParKpiId(card.drilldownId) &&
                    apiCosmeticsParLoading));
              const apiKpi14StrictEmpty =
                activeProduct === "medicine" &&
                isApiKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing);
              const strictTimeFaceEmpty =
                isTimeKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing);
              const strictParFaceEmpty =
                isParKpiId(card.drilldownId) &&
                Boolean(card.faceDataMissing) &&
                (activeProduct === "medicine" ||
                  isFoodFrontApiView ||
                  isFoodNotificationFaceApiView ||
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
                strictTimeFaceEmpty ||
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
                    isTimeKpiId(card.drilldownId) ||
                    isParKpiId(card.drilldownId))) ||
                  (isFoodFrontApiView &&
                    (isApiKpiId(card.drilldownId) || isTimeKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                  (isFoodNotificationFaceApiView &&
                    (isApiKpiId(card.drilldownId) || isTimeKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                  (isMedicalDeviceFaceApiView &&
                    (isApiKpiId(card.drilldownId) || isTimeKpiId(card.drilldownId) || isParKpiId(card.drilldownId))) ||
                  (isCosmeticsFaceApiView &&
                    (isCosmeticsThreeSlotFaceKpi(card.drilldownId) ||
                      isTimeKpiId(card.drilldownId) ||
                      isParKpiId(card.drilldownId))));
              const showsSampleMetric = !maFacePending && !cardIsEmpty && !showsLiveFaceMetric;
              const strictLiveSlotEmpty =
                cardIsEmpty &&
                !card.notApplicableReason &&
                (apiKpi14StrictEmpty ||
                  strictTimeFaceEmpty ||
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
              product={selectedDrilldownSource}
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
