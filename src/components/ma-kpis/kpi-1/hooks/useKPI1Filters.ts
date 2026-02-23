/**
 * Hook for managing KPI-1 filter state
 */

import { useState, useMemo } from "react";
import { maDrillDownData } from "@/data/ma-drilldown-data";
import type { IndividualApplication } from "@/types/ma-drilldown";

const APPLICATION_TYPE_OPTIONS = [
  "All",
  "New Chemical Entity",
  "Generics",
  "Biologics",
  "Vaccines",
  "Biosimilar",
  "Radiopharmaceuticals",
  "Traditional / Herbal",
  "Plasma Derived Medical Products",
];

const INTERNAL_PATHWAY_OPTIONS = [
  "All",
  "Standard/regular",
  "Fast Track",
  "Emergency Use",
  "Conditional",
];

const RELIANCE_PATHWAY_OPTIONS = [
  "All",
  "WHO PQ",
  "SRA",
  "Regional (IGAD MRH)",
  "Continental (AMA)",
  "Article 58",
];

const OUTCOME_OPTIONS = [
  "All",
  "Approved",
  "Rejected",
  "Cancelled",
  "Suspended",
  "Further information requested",
  "Withdrawn",
];

export interface KPI1FiltersState {
  period: "Monthly" | "Quarterly" | "Annually" | "Date Filter";
  applicationType: string;
  internalPathway: string;
  reliancePathway: string;
  outcome: string;
}

export function useKPI1Filters() {
  const [filtersState, setFiltersState] = useState<KPI1FiltersState>({
    period: "Quarterly",
    applicationType: "All",
    internalPathway: "All",
    reliancePathway: "All",
    outcome: "All",
  });

  const kpi1Applications = useMemo(
    () => (maDrillDownData["MA-KPI-1"].level4?.data ?? []) as IndividualApplication[],
    []
  );

  const filteredApplications = useMemo(() => {
    return kpi1Applications.filter((app) => {
      if (filtersState.applicationType !== "All" && app.applicationType !== filtersState.applicationType)
        return false;
      if (filtersState.internalPathway !== "All" && app.internalPathway !== filtersState.internalPathway)
        return false;
      if (filtersState.reliancePathway !== "All" && app.reliancePathway !== filtersState.reliancePathway)
        return false;
      if (filtersState.outcome !== "All" && (app.regulatoryOutcome ?? app.status) !== filtersState.outcome)
        return false;
      return true;
    });
  }, [kpi1Applications, filtersState]);

  const workingSet = filteredApplications.length > 0 ? filteredApplications : kpi1Applications;

  const resetFilters = () => {
    setFiltersState({
      period: "Quarterly",
      applicationType: "All",
      internalPathway: "All",
      reliancePathway: "All",
      outcome: "All",
    });
  };

  return {
    filtersState,
    setFiltersState,
    filteredApplications,
    workingSet,
    resetFilters,
    options: {
      applicationTypes: APPLICATION_TYPE_OPTIONS,
      internalPathways: INTERNAL_PATHWAY_OPTIONS,
      reliancePathways: RELIANCE_PATHWAY_OPTIONS,
      outcomes: OUTCOME_OPTIONS,
    },
  };
}
