"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheckIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKPI1Filters } from "./hooks/useKPI1Filters";
import { KPI1MetricCards } from "./components/KPI1MetricCards";
import { KPI1FilterPanel } from "./components/KPI1FilterPanel";
import { KPI1ChartSelector } from "./components/KPI1ChartSelector";
import { KPI1ChartRenderer } from "./components/KPI1ChartRenderer";

interface MAKPI1ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MAKPI1Modal({ open, onOpenChange }: MAKPI1ModalProps) {
  const { filtersState, workingSet } = useKPI1Filters();
  const [chartType, setChartType] = useState<string>("bar");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheckIcon className="h-5 w-5 text-emerald-600" />
            MA KPI 1 – drill-ready analytics
          </DialogTitle>
          <DialogDescription>
            Filter by portfolio, pathway, reliance route, or outcome, then toggle through all
            supported chart types.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <KPI1MetricCards workingSet={workingSet} />

          <KPI1FilterPanel />

          <KPI1ChartSelector selectedChartType={chartType} onChartTypeChange={setChartType} />

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Chart view</CardTitle>
                <CardDescription>Switch among all supported graph types.</CardDescription>
              </CardHeader>
              <CardContent>
                <KPI1ChartRenderer
                  chartType={chartType}
                  workingSet={workingSet}
                  period={filtersState.period}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dimension spotlight</CardTitle>
                <CardDescription>
                  Choose a dimension to anchor the pie / doughnut view.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Dimension selection will be implemented in future enhancement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
