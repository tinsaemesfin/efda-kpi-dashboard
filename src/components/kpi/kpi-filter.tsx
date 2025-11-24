"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, FilterIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FilterMode = "quarterly" | "annual" | "date-range";

export interface KPIFilterState {
  mode: FilterMode;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4";
  year?: number;
  startDate?: string;
  endDate?: string;
}

interface KPIFilterProps {
  reportingFrequency: "Quarterly" | "Annual" | "Semi-Annual";
  onFilterChange: (filter: KPIFilterState) => void;
  defaultYear?: number;
  defaultQuarter?: "Q1" | "Q2" | "Q3" | "Q4";
}

export function KPIFilter({
  reportingFrequency,
  onFilterChange,
  defaultYear = new Date().getFullYear(),
  defaultQuarter = "Q4"
}: KPIFilterProps) {
  const [filter, setFilter] = useState<KPIFilterState>(() => {
    const mode: FilterMode = reportingFrequency === "Annual" ? "annual" : "quarterly";
    return {
      mode,
      year: defaultYear,
      quarter: mode === "quarterly" ? defaultQuarter : undefined,
    };
  });

  // Generate year options (current year and 3 previous years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  // Get current quarter based on current date
  const getCurrentQuarter = (): "Q1" | "Q2" | "Q3" | "Q4" => {
    const month = new Date().getMonth();
    if (month < 3) return "Q1";
    if (month < 6) return "Q2";
    if (month < 9) return "Q3";
    return "Q4";
  };

  useEffect(() => {
    // Initialize filter on mount
    onFilterChange(filter);
  }, []);

  const handleModeChange = (mode: FilterMode) => {
    const newFilter: KPIFilterState = {
      mode,
      year: filter.year || defaultYear,
      quarter: mode === "quarterly" ? (filter.quarter || getCurrentQuarter()) : undefined,
      startDate: mode === "date-range" ? filter.startDate : undefined,
      endDate: mode === "date-range" ? filter.endDate : undefined,
    };
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
      mode: reportingFrequency === "Annual" ? "annual" : "quarterly",
      year: defaultYear,
      quarter: reportingFrequency !== "Annual" ? getCurrentQuarter() : undefined,
    };
    setFilter(resetFilter);
    onFilterChange(resetFilter);
  };

  const hasActiveFilter = 
    filter.mode === "date-range" && (filter.startDate || filter.endDate) ||
    filter.mode === "quarterly" && filter.quarter !== getCurrentQuarter() ||
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
          Filter data by {reportingFrequency.toLowerCase()} period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          {/* Filter Mode Selection - only show if Quarterly */}
          {reportingFrequency === "Quarterly" && (
            <div className="flex flex-col gap-2 min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground">Filter Mode</label>
              <Select
                value={filter.mode}
                onValueChange={(value: FilterMode) => handleModeChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">By Quarter</SelectItem>
                  <SelectItem value="date-range">Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quarter Selection - only for quarterly mode */}
          {filter.mode === "quarterly" && reportingFrequency === "Quarterly" && (
            <div className="flex flex-col gap-2 min-w-[120px]">
              <label className="text-xs font-medium text-muted-foreground">Quarter</label>
              <Select
                value={filter.quarter}
                onValueChange={(value: "Q1" | "Q2" | "Q3" | "Q4") => handleQuarterChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year Selection */}
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
                {filter.mode === "quarterly" && `${filter.quarter} ${filter.year}`}
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

