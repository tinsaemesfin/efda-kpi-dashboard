"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, ClipboardCheckIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useKPI1Data } from "./hooks/useKPI1Data";
import { useMAKPI1DrilldownData } from "@/hooks/useMAApi";

interface MAKPI1ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHART_COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#8b5cf6", "#ef4444", "#14b8a6", "#3b82f6"];
const INTERNAL_PATHWAY_CATEGORY = "Internal regulatory pathway";
const REGULATORY_OUTCOME_CATEGORY = "Regulatory outcome";
const FOOD_REPORT_CATEGORY_PREFIX = "Food - ";
const MEDICINE_REPORT_CATEGORY_PREFIX = "Medicine - ";
const COSMETICS_REPORT_CATEGORY_PREFIX = "Cosmetics - ";
const EXCLUDED_FOOD_CATEGORY_NAMES = new Set([
  "overall",
  "internal regulatory pathway",
  "food business type",
  "application type",
]);
const FOOD_NOTIFICATION_EXCLUDED_CATEGORY_NAMES = new Set(["approval pathway"]);
const MEDICINE_EXCLUDED_CATEGORY_NAMES = new Set(["reliance pathway"]);

function normalizeLabel(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function MAKPI1Modal({ open, onOpenChange }: MAKPI1ModalProps) {
  const { loading, errorMessage, hasData, value, numerator, denominator, submoduleRows } = useKPI1Data();
  const [selectedSubmoduleCode, setSelectedSubmoduleCode] = useState<string>("");
  const [chartMode, setChartMode] = useState<"horizontal" | "column" | "donut">("horizontal");
  const isMDSelected = selectedSubmoduleCode === "MD";
  const isFoodSelected = selectedSubmoduleCode === "FD";
  const isFoodNotificationSelected = selectedSubmoduleCode === "FNT";
  const isMedicineSelected = selectedSubmoduleCode === "MDCN";
  const isCosmeticsSelected = selectedSubmoduleCode === "CO";
  const {
    data: mdDrilldownData,
    loading: mdLoading,
    error: mdError,
    refetch: refetchMdDrilldown,
  } = useMAKPI1DrilldownData(undefined, open && isMDSelected);
  const {
    data: foodDrilldownData,
    loading: foodLoading,
    error: foodError,
    refetch: refetchFoodDrilldown,
  } = useMAKPI1DrilldownData(undefined, open && isFoodSelected);
  const {
    data: foodNotificationDrilldownData,
    loading: foodNotificationLoading,
    error: foodNotificationError,
    refetch: refetchFoodNotificationDrilldown,
  } = useMAKPI1DrilldownData(undefined, open && isFoodNotificationSelected);
  const {
    data: medicineDrilldownData,
    loading: medicineLoading,
    error: medicineError,
    refetch: refetchMedicineDrilldown,
  } = useMAKPI1DrilldownData(undefined, open && isMedicineSelected);
  const {
    data: cosmeticsDrilldownData,
    loading: cosmeticsLoading,
    error: cosmeticsError,
    refetch: refetchCosmeticsDrilldown,
  } = useMAKPI1DrilldownData(undefined, open && isCosmeticsSelected);

  useEffect(() => {
    if (!open) return;
    if (!submoduleRows.length) {
      setSelectedSubmoduleCode("");
      return;
    }
    setSelectedSubmoduleCode((previous) => {
      if (previous && submoduleRows.some((tab) => tab.code === previous)) return previous;
      return submoduleRows[0].code;
    });
  }, [open, submoduleRows]);

  const selectedSubmodule = useMemo(
    () => submoduleRows.find((row) => row.code === selectedSubmoduleCode) ?? submoduleRows[0],
    [submoduleRows, selectedSubmoduleCode]
  );
  const overallRate = Number(value) || 0;
  const selectedShare = selectedSubmodule && denominator > 0 ? (selectedSubmodule.total / denominator) * 100 : 0;
  const selectedGap = selectedSubmodule ? Math.max(0, 100 - selectedSubmodule.percentage) : 0;

  const chartData = useMemo(
    () =>
      submoduleRows.map((row) => ({
        name: row.code,
        label: row.label,
        onTimeRate: Number(row.percentage.toFixed(1)),
        onTimeCount: row.onTime,
        totalCount: row.total,
      })),
    [submoduleRows]
  );

  const donutData = selectedSubmodule
    ? [
        { name: "On time", value: selectedSubmodule.onTime },
        { name: "Delayed", value: Math.max(0, selectedSubmodule.total - selectedSubmodule.onTime) },
      ]
    : [];

  const mdRows = useMemo(() => mdDrilldownData?.data ?? [], [mdDrilldownData]);
  const selectedCategoryRows = useMemo(() => {
    if (isFoodNotificationSelected) {
      return foodNotificationDrilldownData?.data ?? [];
    }
    if (isFoodSelected) {
      return foodDrilldownData?.data ?? [];
    }
    if (isMedicineSelected) {
      return medicineDrilldownData?.data ?? [];
    }
    if (isCosmeticsSelected) {
      return cosmeticsDrilldownData?.data ?? [];
    }
    return [];
  }, [
    isFoodNotificationSelected,
    isFoodSelected,
    isMedicineSelected,
    isCosmeticsSelected,
    foodNotificationDrilldownData,
    foodDrilldownData,
    medicineDrilldownData,
    cosmeticsDrilldownData,
  ]);
  const selectedCategoryLoading = isFoodNotificationSelected
    ? foodNotificationLoading
    : isFoodSelected
    ? foodLoading
    : isMedicineSelected
    ? medicineLoading
    : cosmeticsLoading;
  const selectedCategoryError = isFoodNotificationSelected
    ? foodNotificationError
    : isFoodSelected
    ? foodError
    : isMedicineSelected
    ? medicineError
    : cosmeticsError;
  const selectedCategoryReportId = isFoodNotificationSelected ? 5 : isFoodSelected ? 4 : isMedicineSelected ? 6 : 7;
  const selectedCategoryPrefix = isFoodNotificationSelected
    ? "Food notification - "
    : isFoodSelected
    ? FOOD_REPORT_CATEGORY_PREFIX
    : isMedicineSelected
    ? MEDICINE_REPORT_CATEGORY_PREFIX
    : COSMETICS_REPORT_CATEGORY_PREFIX;
  const internalPathwayRows = useMemo(
    () => mdRows.filter((row) => row.category_name === INTERNAL_PATHWAY_CATEGORY),
    [mdRows]
  );
  const regulatoryOutcomeRows = useMemo(
    () => mdRows.filter((row) => row.category_name === REGULATORY_OUTCOME_CATEGORY),
    [mdRows]
  );

  const pathwayChartData = useMemo(
    () => {
      const grouped = new Map<string, { name: string; onTimeCount: number; totalCount: number }>();

      internalPathwayRows.forEach((row) => {
        const rawName = normalizeLabel(row.category_value);
        if (!rawName) return;
        const key = rawName.toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.onTimeCount += row.on_time_count;
          existing.totalCount += row.total_count;
          return;
        }
        grouped.set(key, {
          name: rawName,
          onTimeCount: row.on_time_count,
          totalCount: row.total_count,
        });
      });

      return Array.from(grouped.values())
        .map((row) => ({
          ...row,
          percentage: row.totalCount > 0 ? (row.onTimeCount * 100) / row.totalCount : 0,
        }))
        .sort((a, b) => b.totalCount - a.totalCount);
    },
    [internalPathwayRows]
  );

  const outcomeChartData = useMemo(
    () => {
      const grouped = new Map<string, { name: string; onTimeCount: number; totalCount: number }>();

      regulatoryOutcomeRows.forEach((row) => {
        const rawName = normalizeLabel(row.category_value);
        if (!rawName) return;
        const key = rawName.toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.onTimeCount += row.on_time_count;
          existing.totalCount += row.total_count;
          return;
        }
        grouped.set(key, {
          name: rawName,
          onTimeCount: row.on_time_count,
          totalCount: row.total_count,
        });
      });

      return Array.from(grouped.values())
        .map((row) => ({
          ...row,
          percentage: row.totalCount > 0 ? (row.onTimeCount * 100) / row.totalCount : 0,
        }))
        .sort((a, b) => b.totalCount - a.totalCount);
    },
    [regulatoryOutcomeRows]
  );

  const internalTotals = useMemo(
    () =>
      internalPathwayRows.reduce(
        (acc, row) => {
          acc.onTime += row.on_time_count;
          acc.total += row.total_count;
          return acc;
        },
        { onTime: 0, total: 0 }
      ),
    [internalPathwayRows]
  );

  const outcomeTotals = useMemo(
    () =>
      regulatoryOutcomeRows.reduce(
        (acc, row) => {
          acc.onTime += row.on_time_count;
          acc.total += row.total_count;
          return acc;
        },
        { onTime: 0, total: 0 }
      ),
    [regulatoryOutcomeRows]
  );

  const categorySections = useMemo(() => {
    const categoryMap = new Map<
      string,
      {
        name: string;
        rowsMap: Map<string, { name: string; onTimeCount: number; totalCount: number }>;
      }
    >();

    selectedCategoryRows.forEach((row) => {
      const rawCategoryName = normalizeLabel(row.category_name);
      const rawValueName = normalizeLabel(row.category_value);
      if (!rawCategoryName || !rawValueName) return;
      const normalizedCategoryName = rawCategoryName.toLowerCase();
      if ((isFoodSelected || isFoodNotificationSelected) && EXCLUDED_FOOD_CATEGORY_NAMES.has(normalizedCategoryName)) {
        return;
      }
      if (
        isFoodNotificationSelected &&
        FOOD_NOTIFICATION_EXCLUDED_CATEGORY_NAMES.has(normalizedCategoryName)
      ) {
        return;
      }
      if (isMedicineSelected && MEDICINE_EXCLUDED_CATEGORY_NAMES.has(normalizedCategoryName)) {
        return;
      }

      const categoryKey = normalizedCategoryName;
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          name: rawCategoryName,
          rowsMap: new Map<string, { name: string; onTimeCount: number; totalCount: number }>(),
        });
      }

      const section = categoryMap.get(categoryKey);
      if (!section) return;

      const valueKey = rawValueName.toLowerCase();
      const existing = section.rowsMap.get(valueKey);
      if (existing) {
        existing.onTimeCount += row.on_time_count;
        existing.totalCount += row.total_count;
      } else {
        section.rowsMap.set(valueKey, {
          name: rawValueName,
          onTimeCount: row.on_time_count,
          totalCount: row.total_count,
        });
      }
    });

    return Array.from(categoryMap.values()).map((section) => {
      const rows = Array.from(section.rowsMap.values())
        .map((row) => ({
          ...row,
          percentage: row.totalCount > 0 ? (row.onTimeCount * 100) / row.totalCount : 0,
        }))
        .sort((a, b) => b.totalCount - a.totalCount);

      const totals = rows.reduce(
        (acc, row) => {
          acc.onTime += row.onTimeCount;
          acc.total += row.totalCount;
          return acc;
        },
        { onTime: 0, total: 0 }
      );

      return {
        categoryName: section.name,
        rows,
        totals,
      };
    });
  }, [selectedCategoryRows, isFoodSelected, isFoodNotificationSelected, isMedicineSelected]);

  const handleSubmoduleSelect = (code: string) => {
    setSelectedSubmoduleCode(code);
    if (open && code === "MD") {
      void refetchMdDrilldown();
    }
    if (open && code === "FD") {
      void refetchFoodDrilldown();
    }
    if (open && code === "FNT") {
      void refetchFoodNotificationDrilldown();
    }
    if (open && code === "MDCN") {
      void refetchMedicineDrilldown();
    }
    if (open && code === "CO") {
      void refetchCosmeticsDrilldown();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader>
          <div className="border-b bg-linear-to-r from-indigo-50 via-background to-cyan-50 px-6 py-5 dark:from-indigo-950/30 dark:to-cyan-950/20">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheckIcon className="h-5 w-5 text-indigo-600" />
              MA KPI 1 drilldown
            </DialogTitle>
            <DialogDescription className="mt-1">
              Interactive submodule performance from live API data only.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6 pt-2">
          {loading && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-20 rounded-xl" />
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
                <Skeleton className="h-72 rounded-xl" />
              </div>
            </div>
          )}

          {!loading && errorMessage && (
            <Card className="border-red-300/70 bg-red-50/70 dark:border-red-800/60 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangleIcon className="h-4 w-4" />
                  Unable to load KPI 1 drilldown
                </CardTitle>
                <CardDescription className="text-red-700/90 dark:text-red-300/90">
                  {errorMessage}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {!loading && !errorMessage && hasData && submoduleRows.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No MASubmoduleTypeCode records were returned by the API for KPI 1.
              </CardContent>
            </Card>
          )}

          {!loading && !errorMessage && submoduleRows.length > 0 && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Overall KPI 1 on-time rate</CardDescription>
                    <CardTitle className="text-3xl">{overallRate.toFixed(1)}%</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {numerator}/{denominator} completed within timeline
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{selectedSubmodule?.label} on-time rate</CardDescription>
                    <CardTitle className="text-3xl">
                      {selectedSubmodule ? `${selectedSubmodule.percentage.toFixed(1)}%` : "—"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Gap to 100%: {selectedGap.toFixed(1)}%
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{selectedSubmodule?.label} volume share</CardDescription>
                    <CardTitle className="text-3xl">{selectedShare.toFixed(1)}%</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {selectedSubmodule?.total ?? 0} of {denominator} applications
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>Performance visualization</CardTitle>
                        <CardDescription>Live API breakdown by MASubmoduleTypeCode</CardDescription>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                        <Button
                          size="sm"
                          variant={chartMode === "horizontal" ? "default" : "ghost"}
                          onClick={() => setChartMode("horizontal")}
                        >
                          Horizontal
                        </Button>
                        <Button
                          size="sm"
                          variant={chartMode === "column" ? "default" : "ghost"}
                          onClick={() => setChartMode("column")}
                        >
                          Column
                        </Button>
                        <Button
                          size="sm"
                          variant={chartMode === "donut" ? "default" : "ghost"}
                          onClick={() => setChartMode("donut")}
                        >
                          Donut
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      {chartMode === "horizontal" ? (
                        <BarChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <YAxis dataKey="name" type="category" width={64} tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(v: number) => `${v.toFixed(1)}%`}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.label
                                ? `${payload[0].payload.label} (${payload[0].payload.name})`
                                : ""
                            }
                          />
                          <Bar dataKey="onTimeRate" radius={[8, 8, 8, 8]}>
                            {chartData.map((entry, idx) => (
                              <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : chartMode === "column" ? (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                          <Bar dataKey="onTimeRate" radius={[8, 8, 0, 0]}>
                            {chartData.map((entry, idx) => (
                              <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={78}
                            outerRadius={116}
                            paddingAngle={3}
                            label={({ name, value: sliceValue }) => `${name} ${sliceValue}`}
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Submodule leaderboard</CardTitle>
                    <CardDescription>Sorted by workload volume</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {submoduleRows.map((item) => (
                      <div key={item.code} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium">
                            {item.label} <span className="text-muted-foreground">({item.code})</span>
                          </span>
                          <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              item.code === selectedSubmoduleCode
                                ? "bg-linear-to-r from-indigo-500 to-cyan-500"
                                : "bg-linear-to-r from-emerald-500 to-teal-500"
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.onTime}/{item.total} on time
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Module codes
                  </p>
                  <Badge variant="outline">{submoduleRows.length} modules</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {submoduleRows.map((tab) => {
                    const isActive = selectedSubmoduleCode === tab.code;
                    return (
                      <Button
                        key={tab.code}
                        variant="outline"
                        className={cn(
                          "h-auto justify-start rounded-xl border p-4 text-left transition-all",
                          isActive
                            ? "border-indigo-500/60 bg-indigo-600 text-white shadow-md hover:bg-indigo-600"
                            : "bg-background hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20"
                        )}
                        onClick={() => handleSubmoduleSelect(tab.code)}
                      >
                        <div className="space-y-1">
                          <div className={cn("text-xs", isActive ? "text-indigo-100" : "text-muted-foreground")}>
                            {tab.code}
                          </div>
                          <div className="text-sm font-semibold">{tab.label}</div>
                          <div className={cn("text-xs", isActive ? "text-indigo-100" : "text-muted-foreground")}>
                            {tab.percentage.toFixed(1)}% ({tab.onTime}/{tab.total})
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Selected module drilldown
                </p>
                {!isMDSelected &&
                  !isFoodSelected &&
                  !isFoodNotificationSelected &&
                  !isMedicineSelected &&
                  !isCosmeticsSelected && (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      Select <span className="font-medium">MD</span>, <span className="font-medium">Food</span>, or{" "}
                      <span className="font-medium">Food Notification</span>, or{" "}
                      <span className="font-medium">Medicine</span>, or{" "}
                      <span className="font-medium">Cosmetics</span> to load module-specific drilldown from API reports
                      3, 4, 5, 6, and 7.
                    </CardContent>
                  </Card>
                )}
              </div>

              {isMDSelected && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>MD - Internal regulatory pathway</CardTitle>
                      <CardDescription>Loaded from drilldown API report 3</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {mdLoading ? (
                        <Skeleton className="h-64 w-full rounded-xl" />
                      ) : mdError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">{mdError.message}</p>
                      ) : internalPathwayRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No internal pathway rows returned.</p>
                      ) : (
                        <div className="space-y-4">
                          <ResponsiveContainer width="100%" height={Math.max(260, pathwayChartData.length * 34)}>
                            <BarChart data={pathwayChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={210}
                                interval={0}
                                tick={{ fontSize: 12 }}
                              />
                              <Tooltip
                                formatter={(v: number, _name, item) => {
                                  const payload = item?.payload as
                                    | { onTimeCount?: number; totalCount?: number }
                                    | undefined;
                                  return [
                                    `${v.toFixed(2)}% (${payload?.onTimeCount ?? 0}/${payload?.totalCount ?? 0})`,
                                    "On-time",
                                  ];
                                }}
                              />
                              <Bar dataKey="percentage" fill="#6366f1" radius={[6, 6, 6, 6]} />
                            </BarChart>
                          </ResponsiveContainer>

                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Counts by pathway</p>
                            <div className="space-y-1.5">
                              {pathwayChartData.map((row) => (
                                <div key={row.name} className="flex items-center justify-between text-xs">
                                  <span className="truncate pr-2">{row.name}</span>
                                  <span className="whitespace-nowrap text-muted-foreground">
                                    {row.onTimeCount}/{row.totalCount} ({row.percentage.toFixed(2)}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 border-t border-border/60 pt-2 text-xs font-medium">
                              Total: {internalTotals.onTime}/{internalTotals.total}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>MD - Regulatory outcome</CardTitle>
                      <CardDescription>Loaded from drilldown API report 3</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {mdLoading ? (
                        <Skeleton className="h-64 w-full rounded-xl" />
                      ) : mdError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">{mdError.message}</p>
                      ) : regulatoryOutcomeRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No regulatory outcome rows returned.</p>
                      ) : (
                        <div className="space-y-4">
                          <ResponsiveContainer width="100%" height={Math.max(260, outcomeChartData.length * 34)}>
                            <BarChart data={outcomeChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={210}
                                interval={0}
                                tick={{ fontSize: 12 }}
                              />
                              <Tooltip
                                formatter={(v: number, _name, item) => {
                                  const payload = item?.payload as
                                    | { onTimeCount?: number; totalCount?: number }
                                    | undefined;
                                  return [
                                    `${v.toFixed(2)}% (${payload?.onTimeCount ?? 0}/${payload?.totalCount ?? 0})`,
                                    "On-time",
                                  ];
                                }}
                              />
                              <Bar dataKey="percentage" fill="#0ea5e9" radius={[6, 6, 6, 6]} />
                            </BarChart>
                          </ResponsiveContainer>

                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Counts by outcome</p>
                            <div className="space-y-1.5">
                              {outcomeChartData.map((row) => (
                                <div key={row.name} className="flex items-center justify-between text-xs">
                                  <span className="truncate pr-2">{row.name}</span>
                                  <span className="whitespace-nowrap text-muted-foreground">
                                    {row.onTimeCount}/{row.totalCount} ({row.percentage.toFixed(2)}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 border-t border-border/60 pt-2 text-xs font-medium">
                              Total: {outcomeTotals.onTime}/{outcomeTotals.total}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {(isFoodSelected || isFoodNotificationSelected || isMedicineSelected || isCosmeticsSelected) && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {selectedCategoryLoading ? (
                    <Card className="lg:col-span-2">
                      <CardContent className="pt-6">
                        <Skeleton className="h-64 w-full rounded-xl" />
                      </CardContent>
                    </Card>
                  ) : selectedCategoryError ? (
                    <Card className="lg:col-span-2">
                      <CardContent className="py-6">
                        <p className="text-sm text-red-600 dark:text-red-400">{selectedCategoryError.message}</p>
                      </CardContent>
                    </Card>
                  ) : categorySections.length === 0 ? (
                    <Card className="lg:col-span-2">
                      <CardContent className="py-6 text-sm text-muted-foreground">
                        No rows returned from API report {selectedCategoryReportId}.
                      </CardContent>
                    </Card>
                  ) : (
                    categorySections.map((section) => (
                      <Card key={section.categoryName}>
                        <CardHeader>
                          <CardTitle>{selectedCategoryPrefix}{section.categoryName}</CardTitle>
                          <CardDescription>Loaded from drilldown API report {selectedCategoryReportId}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <ResponsiveContainer width="100%" height={Math.max(240, section.rows.length * 34)}>
                              <BarChart data={section.rows} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                <YAxis
                                  dataKey="name"
                                  type="category"
                                  width={220}
                                  interval={0}
                                  tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                  formatter={(v: number, _name, item) => {
                                    const payload = item?.payload as
                                      | { onTimeCount?: number; totalCount?: number }
                                      | undefined;
                                    return [
                                      `${v.toFixed(2)}% (${payload?.onTimeCount ?? 0}/${payload?.totalCount ?? 0})`,
                                      "On-time",
                                    ];
                                  }}
                                />
                                <Bar dataKey="percentage" fill="#22c55e" radius={[6, 6, 6, 6]} />
                              </BarChart>
                            </ResponsiveContainer>

                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">Counts by category value</p>
                              <div className="space-y-1.5">
                                {section.rows.map((row) => (
                                  <div key={row.name} className="flex items-center justify-between text-xs">
                                    <span className="truncate pr-2">{row.name}</span>
                                    <span className="whitespace-nowrap text-muted-foreground">
                                      {row.onTimeCount}/{row.totalCount} ({row.percentage.toFixed(2)}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 border-t border-border/60 pt-2 text-xs font-medium">
                                Total: {section.totals.onTime}/{section.totals.total}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
