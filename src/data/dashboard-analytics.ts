/**
 * Derived analytics for the home dashboard — all values computed from
 * `dashboard-product-performance` cells only (no invented KPIs).
 */

import {
  PRODUCT_LINE_LABELS,
  PRODUCT_LINE_ORDER,
  PROGRAM_ORDER,
  programDashboardByKey,
  type DashboardStatus,
  type ProductLineCell,
  type ProductLineKey,
  type ProgramKey,
  getAllCells,
  getExecutiveSignals,
  LAST_UPDATED,
  REPORTING_PERIOD,
} from "@/data/dashboard-product-performance";

const statusRank: Record<DashboardStatus, number> = {
  critical: 4,
  warning: 3,
  good: 2,
  excellent: 1,
};

export type DashboardOverviewModel = {
  totalPairs: number;
  programsCount: number;
  productLinesCount: number;
  atRiskCount: number;
  bestProductLine: string;
  reportingPeriod: string;
  lastUpdated: string;
  operationalLabel: string;
};

export function getDashboardOverviewModel(): DashboardOverviewModel {
  const cells = getAllCells();
  const atRisk = cells.filter((c) => c.status === "warning" || c.status === "critical").length;

  const byLine = PRODUCT_LINE_ORDER.map((pl) => {
    const lineCells = PROGRAM_ORDER.map((p) => programDashboardByKey[p].productLines[pl]);
    const bad = lineCells.filter((c) => c.status === "warning" || c.status === "critical").length;
    return { pl, bad };
  });
  const bestLine = byLine.reduce((a, b) => (a.bad <= b.bad ? a : b));

  return {
    totalPairs: cells.length,
    programsCount: PROGRAM_ORDER.length,
    productLinesCount: PRODUCT_LINE_ORDER.length,
    atRiskCount: atRisk,
    bestProductLine: PRODUCT_LINE_LABELS[bestLine.pl],
    reportingPeriod: REPORTING_PERIOD,
    lastUpdated: LAST_UPDATED,
    operationalLabel: atRisk === 0 ? "Within expected controls" : "Attention required in one or more areas",
  };
}

export type StatusDistribution = Record<DashboardStatus, number>;

export function getStatusDistribution(): StatusDistribution {
  const cells = getAllCells();
  const init: StatusDistribution = {
    excellent: 0,
    good: 0,
    warning: 0,
    critical: 0,
  };
  for (const c of cells) {
    init[c.status] += 1;
  }
  return init;
}

export type ProgramRiskMatrixRow = {
  program: ProgramKey;
  programTitle: string;
  cells: Array<{
    line: ProductLineKey;
    lineLabel: string;
    status: DashboardStatus;
    cell: ProductLineCell;
  }>;
};

export function getProgramRiskMatrix(): ProgramRiskMatrixRow[] {
  return PROGRAM_ORDER.map((program) => {
    const meta = programDashboardByKey[program];
    return {
      program,
      programTitle: meta.title,
      cells: PRODUCT_LINE_ORDER.map((line) => {
        const cell = meta.productLines[line];
        return {
          line,
          lineLabel: PRODUCT_LINE_LABELS[line],
          status: cell.status,
          cell,
        };
      }),
    };
  });
}

function worstCellInProgram(program: ProgramKey): { line: ProductLineKey; cell: ProductLineCell } {
  let worst: { line: ProductLineKey; cell: ProductLineCell } | null = null;
  for (const line of PRODUCT_LINE_ORDER) {
    const cell = programDashboardByKey[program].productLines[line];
    if (!worst || statusRank[cell.status] > statusRank[worst.cell.status]) {
      worst = { line, cell };
    }
  }
  return worst!;
}

export type ProgramFocusCardModel = {
  program: ProgramKey;
  title: string;
  shortDescription: string;
  href: string;
  ctaLabel: string;
  /** Worst-status product line in this program */
  focusLine: ProductLineKey;
  focusLineLabel: string;
  focusCell: ProductLineCell;
  atRiskCellCount: number;
  totalExceptionSignals: number;
  /** Data provenance for this program’s home snapshot */
  dataSourceLabel: string;
  dataSourceDetail: string;
};

export function getProgramFocusCards(): ProgramFocusCardModel[] {
  return PROGRAM_ORDER.map((program) => {
    const meta = programDashboardByKey[program];
    const programCells = PRODUCT_LINE_ORDER.map((line) => meta.productLines[line]);
    const atRiskCellCount = programCells.filter((c) => c.status === "warning" || c.status === "critical").length;
    const totalExceptionSignals = programCells.reduce((sum, c) => sum + c.exceptions, 0);
    const { line: focusLine, cell: focusCell } = worstCellInProgram(program);

    let dataSourceLabel: string;
    let dataSourceDetail: string;
    if (program === "marketAuthorizations") {
      dataSourceLabel = "Seeded MA product-line view";
      dataSourceDetail =
        "Values from maProductKpiSeed. Live API merges apply on the Market Authorizations workspace, not on this home snapshot.";
    } else {
      dataSourceLabel = "Mock split (product-line)";
      dataSourceDetail =
        "Representative splits until product-line API data is wired. Open the program workspace for full KPI views.";
    }

    return {
      program,
      title: meta.title,
      shortDescription: meta.shortDescription,
      href: meta.href,
      ctaLabel: meta.ctaLabel,
      focusLine,
      focusLineLabel: PRODUCT_LINE_LABELS[focusLine],
      focusCell,
      atRiskCellCount,
      totalExceptionSignals,
      dataSourceLabel,
      dataSourceDetail,
    };
  });
}

export type SourceQualitySummary = {
  /** User-facing chips for the hero / provenance strip */
  chips: Array<{ id: string; label: string }>;
  /** Longer note for accessibility / screen readers */
  fullNote: string;
};

export function getSourceQualitySummary(): SourceQualitySummary {
  return {
    chips: [
      { id: "ct", label: "Clinical Trials: mock split" },
      { id: "gmp", label: "GMP: mock split" },
      { id: "ma", label: "MA: seeded product-line data" },
      { id: "home", label: "Home snapshot not live API" },
    ],
    fullNote:
      "This overview uses curated signals only. Clinical Trials and GMP cells are mock splits. Market Authorization uses seeded product-line cards. The Market Authorizations page can merge live API data for Medicine; the home dashboard does not.",
  };
}

/** For bar chart: sum of exception signal counts per program */
export function getExceptionTotalsByProgram(): Array<{
  program: ProgramKey;
  name: string;
  totalExceptions: number;
  atRiskCells: number;
}> {
  return PROGRAM_ORDER.map((program) => {
    const meta = programDashboardByKey[program];
    let totalExceptions = 0;
    let atRiskCells = 0;
    for (const line of PRODUCT_LINE_ORDER) {
      const cell = meta.productLines[line];
      totalExceptions += cell.exceptions;
      if (cell.status === "warning" || cell.status === "critical") atRiskCells += 1;
    }
    return {
      program,
      name: meta.title,
      totalExceptions,
      atRiskCells,
    };
  });
}

export type MajorSignalCardModel = {
  id: string;
  label: string;
  value: string;
  helper: string;
  /** How this metric was derived for transparency */
  provenance: "derived_snapshot" | "ma_subset";
};

/** Same metrics as `getExecutiveSignals()`, with provenance for UI badges */
export function getMajorExecutiveCards(): MajorSignalCardModel[] {
  const base = getExecutiveSignals();
  const provenanceById: Record<string, MajorSignalCardModel["provenance"]> = {
    "at-risk": "derived_snapshot",
    "slowest-ma": "ma_subset",
    "best-line": "derived_snapshot",
    freshness: "derived_snapshot",
  };
  return base.map((s) => ({
    id: s.id,
    label: s.label,
    value: s.value,
    helper: s.helper,
    provenance: provenanceById[s.id] ?? "derived_snapshot",
  }));
}
