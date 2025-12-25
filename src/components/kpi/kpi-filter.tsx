"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, FilterIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FilterMode = "monthly" | "quarterly" | "annual" | "date-range";

export interface KPIFilterState {
  mode: FilterMode;
  month?: number; // 0-11 (JavaScript month index)
  quarter?: "Q1" | "Q2" | "Q3" | "Q4";
  year?: number;
  startDate?: string;
  endDate?: string;
}

interface KPIFilterProps {
  reportingFrequency?: "Quarterly" | "Annual" | "Semi-Annual";
  onFilterChange: (filter: KPIFilterState) => void;
  defaultYear?: number;
  defaultQuarter?: "Q1" | "Q2" | "Q3" | "Q4";
  defaultMonth?: number;
  showAllModes?: boolean; // If true, show all filter modes regardless of reportingFrequency
}

export function KPIFilter({
  reportingFrequency,
  onFilterChange,
  defaultYear = new Date().getFullYear(),
  defaultQuarter = "Q4",
  defaultMonth,
  showAllModes = false
}: KPIFilterProps) {
  const getCurrentMonth = (): number => new Date().getMonth();
  const getCurrentQuarter = (): "Q1" | "Q2" | "Q3" | "Q4" => {
    const month = new Date().getMonth();
    if (month < 3) return "Q1";
    if (month < 6) return "Q2";
    if (month < 9) return "Q3";
    return "Q4";
  };

  // Format quarter with month range
  const formatQuarterWithMonths = (quarter: "Q1" | "Q2" | "Q3" | "Q4"): string => {
    const quarterLabels: Record<"Q1" | "Q2" | "Q3" | "Q4", string> = {
      Q1: "Q1 JAN-MAR",
      Q2: "Q2 APR-JUN",
      Q3: "Q3 JUL-SEP",
      Q4: "Q4 OCT-DEC",
    };
    return quarterLabels[quarter];
  };

  const [filter, setFilter] = useState<KPIFilterState>(() => {
    const mode: FilterMode = showAllModes 
      ? "quarterly" 
      : reportingFrequency === "Annual" 
        ? "annual" 
        : "quarterly";
    return {
      mode,
      year: defaultYear,
      month: undefined,
      quarter: mode === "quarterly" ? defaultQuarter : undefined,
    };
  });

  // Generate year options (current year and 3 previous years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  // Month options
  const months = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" },
  ];

  useEffect(() => {
    // Initialize filter on mount
    onFilterChange(filter);
  }, []);

  const handleModeChange = (mode: FilterMode) => {
    const newFilter: KPIFilterState = {
      mode,
      year: filter.year || defaultYear,
      month: mode === "monthly" ? (filter.month ?? getCurrentMonth()) : undefined,
      quarter: mode === "quarterly" ? (filter.quarter || getCurrentQuarter()) : undefined,
      startDate: mode === "date-range" ? filter.startDate : undefined,
      endDate: mode === "date-range" ? filter.endDate : undefined,
    };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleMonthChange = (month: number) => {
    const newFilter = { ...filter, month };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleQuarterChange = (quarter: "Q1" | "Q2" | "Q3" | "Q4") => {
    const newFilter = { ...filter, quarter };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleYearChange = (year: number) => {
    const newFilter = { ...filter, year };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    const newFilter = { ...filter, startDate, endDate };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const clearFilter = () => {
    const resetFilter: KPIFilterState = {
      mode: showAllModes 
        ? "quarterly" 
        : reportingFrequency === "Annual" 
          ? "annual" 
          : "quarterly",
      year: defaultYear,
      month: undefined,
      quarter: reportingFrequency !== "Annual" ? getCurrentQuarter() : undefined,
    };
    setFilter(resetFilter);
    onFilterChange(resetFilter);
  };

  const hasActiveFilter = 
    filter.mode === "date-range" && (filter.startDate || filter.endDate) ||
    filter.mode === "monthly" && (filter.month !== getCurrentMonth() || filter.year !== defaultYear) ||
    filter.mode === "quarterly" && (filter.quarter !== getCurrentQuarter() || filter.year !== defaultYear) ||
    filter.mode === "annual" && filter.year !== defaultYear;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filter KPIs</CardTitle>
          </div>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilter}
              className="h-7 text-xs"
            >
              <XIcon className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          {reportingFrequency 
            ? `Filter data by ${reportingFrequency.toLowerCase()} period`
            : "Filter data by date period"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          {/* Filter Mode Selection */}
          {(showAllModes || reportingFrequency === "Quarterly") && (
            <div className="flex flex-col gap-2 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Filter Mode</label>
              <Select
                value={filter.mode}
                onValueChange={(value: FilterMode) => handleModeChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annually</SelectItem>
                  <SelectItem value="date-range">Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Month Selection - only for monthly mode */}
          {filter.mode === "monthly" && (
            <div className="flex flex-col gap-2 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <Select
                value={filter.month?.toString()}
                onValueChange={(value) => handleMonthChange(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quarter Selection - only for quarterly mode */}
          {filter.mode === "quarterly" && (showAllModes || reportingFrequency === "Quarterly") && (
            <div className="flex flex-col gap-2 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Quarter</label>
              <Select
                value={filter.quarter}
                onValueChange={(value: "Q1" | "Q2" | "Q3" | "Q4") => handleQuarterChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1 JAN-MAR</SelectItem>
                  <SelectItem value="Q2">Q2 APR-JUN</SelectItem>
                  <SelectItem value="Q3">Q3 JUL-SEP</SelectItem>
                  <SelectItem value="Q4">Q4 OCT-DEC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year Selection - show for monthly, quarterly, and annual modes */}
          {(filter.mode === "monthly" || filter.mode === "quarterly" || filter.mode === "annual") && (
            <div className="flex flex-col gap-2 min-w-[120px]">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Select
                value={filter.year?.toString()}
                onValueChange={(value) => handleYearChange(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Selection */}
          {filter.mode === "date-range" && (
            <>
              <div className="flex flex-col gap-2 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filter.startDate || ""}
                    onChange={(e) => handleDateRangeChange(e.target.value, filter.endDate || "")}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filter.endDate || ""}
                    onChange={(e) => handleDateRangeChange(filter.startDate || "", e.target.value)}
                    className="pl-8"
                    min={filter.startDate}
                  />
                </div>
              </div>
            </>
          )}

          {/* Active Filter Badge */}
          {hasActiveFilter && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filter.mode === "monthly" && `${months[filter.month ?? 0].label} ${filter.year}`}
                {filter.mode === "quarterly" && filter.quarter && `${formatQuarterWithMonths(filter.quarter)} ${filter.year}`}
                {filter.mode === "annual" && `Year ${filter.year}`}
                {filter.mode === "date-range" && 
                  `${filter.startDate ? new Date(filter.startDate).toLocaleDateString() : "Start"} - ${filter.endDate ? new Date(filter.endDate).toLocaleDateString() : "End"}`
                }
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



