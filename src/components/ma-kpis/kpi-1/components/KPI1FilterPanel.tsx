"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKPI1Filters } from "../hooks/useKPI1Filters";

export function KPI1FilterPanel() {
  const { filtersState, setFiltersState, resetFilters, options } = useKPI1Filters();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <div className="text-xs uppercase text-muted-foreground">Date</div>
          <Select
            value={filtersState.period}
            onValueChange={(value) =>
              setFiltersState((prev) => ({ ...prev, period: value as any }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Quarterly">Quarterly</SelectItem>
              <SelectItem value="Annually">Annually</SelectItem>
              <SelectItem value="Date Filter">Date filter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase text-muted-foreground">Application type</div>
          <Select
            value={filtersState.applicationType}
            onValueChange={(value) =>
              setFiltersState((prev) => ({ ...prev, applicationType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {options.applicationTypes.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase text-muted-foreground">Internal pathway</div>
          <Select
            value={filtersState.internalPathway}
            onValueChange={(value) =>
              setFiltersState((prev) => ({ ...prev, internalPathway: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select pathway" />
            </SelectTrigger>
            <SelectContent>
              {options.internalPathways.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase text-muted-foreground">Reliance pathway</div>
          <Select
            value={filtersState.reliancePathway}
            onValueChange={(value) =>
              setFiltersState((prev) => ({ ...prev, reliancePathway: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reliance" />
            </SelectTrigger>
            <SelectContent>
              {options.reliancePathways.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase text-muted-foreground">Regulatory outcome</div>
          <Select
            value={filtersState.outcome}
            onValueChange={(value) =>
              setFiltersState((prev) => ({ ...prev, outcome: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select outcome" />
            </SelectTrigger>
            <SelectContent>
              {options.outcomes.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={resetFilters}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
