/**
 * Normalized home-dashboard dataset: 3 regulatory programs × 4 product lines.
 * MA cells are derived from `maProductKpiSeed`; Clinical Trials & GMP use realistic mock splits until API data exists.
 */

import type { LucideIcon } from "lucide-react";

import {
  FlaskConicalIcon,
  ShieldCheckIcon,
  ClipboardCheckIcon,
} from "lucide-react";

import { maProductKpiSeed, type MAProductKey } from "@/data/ma-dummy-data";

export const REPORTING_PERIOD = "Q4 2024";
export const LAST_UPDATED = "28 Apr 2026, 14:58 EAT";

export type ProgramKey = "clinicalTrials" | "gmpInspections" | "marketAuthorizations";

export type ProductLineKey = "medicine" | "medicalDevice" | "food" | "cosmetics";

export type DashboardStatus = "excellent" | "good" | "warning" | "critical";

export type KpiSignal = {
  code: string;
  title: string;
  description: string;
  value: number;
  suffix: string;
  decimals?: number;
  numerator?: number;
  denominator?: number;
};

export type ProductLineCell = {
  program: ProgramKey;
  productLine: ProductLineKey;
  primaryMetric: KpiSignal;
  secondaryMetric: KpiSignal;
  exceptionMetric?: KpiSignal;
  /** Worst-case status across selected signals */
  status: DashboardStatus;
  /** Count of selected KPI signals that are Warning or Critical */
  exceptions: number;
  href: string;
  isMockDerived: boolean;
};

export type ProgramTone = "blue" | "green" | "purple";

export type ProgramDashboardMeta = {
  key: ProgramKey;
  title: string;
  shortDescription: string;
  href: string;
  ctaLabel: string;
  tone: ProgramTone;
  icon: LucideIcon;
  productLines: Record<ProductLineKey, ProductLineCell>;
};

export const PROGRAM_ORDER: ProgramKey[] = [
  "clinicalTrials",
  "gmpInspections",
  "marketAuthorizations",
];

export const PRODUCT_LINE_ORDER: ProductLineKey[] = [
  "medicine",
  "medicalDevice",
  "food",
  "cosmetics",
];

export const PRODUCT_LINE_LABELS: Record<ProductLineKey, string> = {
  medicine: "Medicine",
  medicalDevice: "Medical Device",
  food: "Food",
  cosmetics: "Cosmetics",
};

const PROGRAM_HREF: Record<ProgramKey, string> = {
  clinicalTrials: "/clinical-trials",
  gmpInspections: "/gmp-inspections",
  marketAuthorizations: "/market-authorizations",
};

const statusRank: Record<DashboardStatus, number> = {
  critical: 4,
  warning: 3,
  good: 2,
  excellent: 1,
};

export function pctStatus(value: number): DashboardStatus {
  if (value >= 90) return "excellent";
  if (value >= 80) return "good";
  if (value >= 70) return "warning";
  return "critical";
}

/** Median completion days — aligned with Market Authorizations page helper */
export function medianDayStatus(days: number): DashboardStatus {
  if (days <= 150) return "excellent";
  if (days <= 180) return "good";
  if (days <= 220) return "warning";
  return "critical";
}

function worstStatus(...statuses: DashboardStatus[]): DashboardStatus {
  return statuses.reduce((acc, s) => (statusRank[s] > statusRank[acc] ? s : acc), statuses[0] ?? "good");
}

function signalStatus(signal: KpiSignal): DashboardStatus {
  const suf = signal.suffix.trim().toLowerCase();
  if (suf === "%" || suf.endsWith("%")) {
    return pctStatus(signal.value);
  }
  if (suf.includes("day")) {
    return medianDayStatus(signal.value);
  }
  return pctStatus(signal.value);
}

function exceptionCount(primary: KpiSignal, secondary: KpiSignal, exception?: KpiSignal): number {
  let n = 0;
  const p = signalStatus(primary);
  const s = signalStatus(secondary);
  if (p === "warning" || p === "critical") n += 1;
  if (s === "warning" || s === "critical") n += 1;
  if (exception) {
    const e = signalStatus(exception);
    if (e === "warning" || e === "critical") n += 1;
  }
  return n;
}

function maCardToSignal(card: (typeof maProductKpiSeed)["medicine"]["cards"][number]): KpiSignal {
  return {
    code: card.drilldownId,
    title: card.title,
    description: card.description,
    value: Number(card.value),
    suffix: card.suffix,
    decimals: card.decimals,
    numerator: card.numerator,
    denominator: card.denominator,
  };
}

/** KPI-1 primary, KPI-6 secondary (median days); exception = first warning/critical among KPI-4, KPI-5, KPI-8. */
const MA_DASHBOARD_PRIMARY_ID = "MA-KPI-1";
const MA_DASHBOARD_SECONDARY_ID = "MA-KPI-6";
const MA_EXCEPTION_DRILLDOWN_ORDER = ["MA-KPI-4", "MA-KPI-5", "MA-KPI-8"] as const;

function fromMaCard(
  program: ProgramKey,
  productLine: MAProductKey,
  isMockDerived: boolean
): ProductLineCell {
  const bundle = maProductKpiSeed[productLine];
  const cards = bundle.cards;

  const primaryCard = cards.find((c) => c.drilldownId === MA_DASHBOARD_PRIMARY_ID);
  const secondaryCard = cards.find((c) => c.drilldownId === MA_DASHBOARD_SECONDARY_ID);
  if (!primaryCard || !secondaryCard) {
    throw new Error(
      `MA seed for "${productLine}" must include ${MA_DASHBOARD_PRIMARY_ID} and ${MA_DASHBOARD_SECONDARY_ID}.`
    );
  }

  const primarySignal = maCardToSignal(primaryCard);
  const secondarySignal = maCardToSignal(secondaryCard);

  let exception: KpiSignal | undefined;
  for (const drilldownId of MA_EXCEPTION_DRILLDOWN_ORDER) {
    const c = cards.find((x) => x.drilldownId === drilldownId);
    if (!c) continue;
    const cand = maCardToSignal(c);
    const stc = signalStatus(cand);
    if (stc === "warning" || stc === "critical") {
      exception = cand;
      break;
    }
  }

  const st = worstStatus(
    signalStatus(primarySignal),
    signalStatus(secondarySignal),
    exception ? signalStatus(exception) : "excellent"
  );

  return {
    program,
    productLine,
    primaryMetric: primarySignal,
    secondaryMetric: secondarySignal,
    exceptionMetric: exception,
    status: st,
    exceptions: exceptionCount(primarySignal, secondarySignal, exception),
    href: PROGRAM_HREF[program],
    isMockDerived,
  };
}

type MockTrials = {
  primary: KpiSignal;
  secondary: KpiSignal;
  exception?: KpiSignal;
};

const clinicalTrialsMock: Record<ProductLineKey, MockTrials> = {
  medicine: {
    primary: {
      code: "CT-KPI-1",
      title: "Applications Evaluated on Time",
      description: "New trial applications screened and decided within SLA",
      value: 86.4,
      suffix: "%",
      decimals: 1,
      numerator: 124,
      denominator: 144,
    },
    secondary: {
      code: "CT-KPI-5",
      title: "GCP Compliance Rate",
      description: "Inspected trials meeting GCP requirements",
      value: 91.2,
      suffix: "%",
      decimals: 1,
      numerator: 52,
      denominator: 57,
    },
  },
  medicalDevice: {
    primary: {
      code: "CT-KPI-1",
      title: "Applications Evaluated on Time",
      description: "Device trial applications within regulatory timeline",
      value: 71.2,
      suffix: "%",
      decimals: 1,
      numerator: 37,
      denominator: 52,
    },
    secondary: {
      code: "CT-KPI-5",
      title: "GCP Compliance Rate",
      description: "Inspected device trials meeting GCP",
      value: 83.0,
      suffix: "%",
      decimals: 1,
      numerator: 83,
      denominator: 100,
    },
    exception: {
      code: "CT-KPI-3",
      title: "GCP Plan Inspection Coverage",
      description: "Approved / ongoing trials inspected per plan",
      value: 68.0,
      suffix: "%",
      decimals: 1,
      numerator: 34,
      denominator: 50,
    },
  },
  food: {
    primary: {
      code: "CT-KPI-1",
      title: "Applications Evaluated on Time",
      description: "Food-related trial applications within timeline",
      value: 78.6,
      suffix: "%",
      decimals: 1,
      numerator: 44,
      denominator: 56,
    },
    secondary: {
      code: "CT-KPI-5",
      title: "GCP Compliance Rate",
      description: "Food trials meeting GCP after inspection",
      value: 87.4,
      suffix: "%",
      decimals: 1,
      numerator: 41,
      denominator: 47,
    },
  },
  cosmetics: {
    primary: {
      code: "CT-KPI-1",
      title: "Applications Evaluated on Time",
      description: "Cosmetics trial applications within timeline",
      value: 65.5,
      suffix: "%",
      decimals: 1,
      numerator: 19,
      denominator: 29,
    },
    secondary: {
      code: "CT-KPI-5",
      title: "GCP Compliance Rate",
      description: "Cosmetics trials inspected and compliant",
      value: 74.0,
      suffix: "%",
      decimals: 1,
      numerator: 37,
      denominator: 50,
    },
    exception: {
      code: "CT-KPI-2",
      title: "Amendments Evaluated on Time",
      description: "Protocol amendments assessed within SLA",
      value: 62.0,
      suffix: "%",
      decimals: 1,
      numerator: 18,
      denominator: 29,
    },
  },
};

const gmpMock: Record<ProductLineKey, MockTrials> = {
  medicine: {
    primary: {
      code: "GMP-KPI-1",
      title: "Planned Inspections Completed",
      description: "Sites inspected vs quarterly plan — medicine-focused sites",
      value: 92.3,
      suffix: "%",
      decimals: 1,
      numerator: 108,
      denominator: 117,
    },
    secondary: {
      code: "GMP-KPI-4",
      title: "GMP Facility Compliance",
      description: "Inspected medicine facilities meeting GMP",
      value: 94.0,
      suffix: "%",
      decimals: 1,
      numerator: 94,
      denominator: 100,
    },
  },
  medicalDevice: {
    primary: {
      code: "GMP-KPI-1",
      title: "Planned Inspections Completed",
      description: "Device manufacturing sites inspected per plan",
      value: 81.8,
      suffix: "%",
      decimals: 1,
      numerator: 63,
      denominator: 77,
    },
    secondary: {
      code: "GMP-KPI-4",
      title: "GMP Facility Compliance",
      description: "Device facilities meeting GMP after inspection",
      value: 88.0,
      suffix: "%",
      decimals: 1,
      numerator: 88,
      denominator: 100,
    },
    exception: {
      code: "GMP-KPI-5",
      title: "CAPA Decisions on Time",
      description: "Corrective actions closed within regulatory timeline",
      value: 71.0,
      suffix: "%",
      decimals: 1,
      numerator: 71,
      denominator: 100,
    },
  },
  food: {
    primary: {
      code: "GMP-KPI-1",
      title: "Planned Inspections Completed",
      description: "Food sites inspected vs quarterly plan",
      value: 76.5,
      suffix: "%",
      decimals: 1,
      numerator: 49,
      denominator: 64,
    },
    secondary: {
      code: "GMP-KPI-4",
      title: "GMP Facility Compliance",
      description: "Food facilities meeting GMP",
      value: 90.1,
      suffix: "%",
      decimals: 1,
      numerator: 91,
      denominator: 101,
    },
  },
  cosmetics: {
    primary: {
      code: "GMP-KPI-1",
      title: "Planned Inspections Completed",
      description: "Cosmetics sites inspected per plan",
      value: 69.0,
      suffix: "%",
      decimals: 1,
      numerator: 31,
      denominator: 45,
    },
    secondary: {
      code: "GMP-KPI-4",
      title: "GMP Facility Compliance",
      description: "Cosmetics facilities meeting GMP",
      value: 79.0,
      suffix: "%",
      decimals: 1,
      numerator: 79,
      denominator: 100,
    },
    exception: {
      code: "GMP-KPI-5",
      title: "CAPA Decisions on Time",
      description: "CAPA closure timeliness for cosmetics sites",
      value: 64.0,
      suffix: "%",
      decimals: 1,
      numerator: 48,
      denominator: 75,
    },
  },
};

function cellFromMock(
  program: ProgramKey,
  productLine: ProductLineKey,
  mock: MockTrials
): ProductLineCell {
  const st = worstStatus(
    signalStatus(mock.primary),
    signalStatus(mock.secondary),
    mock.exception ? signalStatus(mock.exception) : "excellent"
  );

  return {
    program,
    productLine,
    primaryMetric: mock.primary,
    secondaryMetric: mock.secondary,
    exceptionMetric: mock.exception,
    status: st,
    exceptions: exceptionCount(mock.primary, mock.secondary, mock.exception),
    href: PROGRAM_HREF[program],
    isMockDerived: true,
  };
}

function buildProgramCells(
  program: ProgramKey,
  source: Record<ProductLineKey, MockTrials | "ma">
): Record<ProductLineKey, ProductLineCell> {
  const out = {} as Record<ProductLineKey, ProductLineCell>;

  for (const pl of PRODUCT_LINE_ORDER) {
    if (source[pl] === "ma") {
      out[pl] = fromMaCard(program, pl, false);
    } else {
      out[pl] = cellFromMock(program, pl, source[pl] as MockTrials);
    }
  }

  return out;
}

export const programDashboardByKey: Record<ProgramKey, ProgramDashboardMeta> = {
  clinicalTrials: {
    key: "clinicalTrials",
    title: "Clinical Trials",
    shortDescription: "Application timeliness, GCP compliance, and inspection coverage by product line.",
    href: PROGRAM_HREF.clinicalTrials,
    ctaLabel: "Open Clinical Trials workspace",
    tone: "blue",
    icon: FlaskConicalIcon,
    productLines: buildProgramCells("clinicalTrials", {
      medicine: clinicalTrialsMock.medicine,
      medicalDevice: clinicalTrialsMock.medicalDevice,
      food: clinicalTrialsMock.food,
      cosmetics: clinicalTrialsMock.cosmetics,
    }),
  },
  gmpInspections: {
    key: "gmpInspections",
    title: "GMP Inspections",
    shortDescription: "Inspection plan execution, compliance, and CAPA timeliness by product line.",
    href: PROGRAM_HREF.gmpInspections,
    ctaLabel: "Open GMP inspections workspace",
    tone: "green",
    icon: ShieldCheckIcon,
    productLines: buildProgramCells("gmpInspections", {
      medicine: gmpMock.medicine,
      medicalDevice: gmpMock.medicalDevice,
      food: gmpMock.food,
      cosmetics: gmpMock.cosmetics,
    }),
  },
  marketAuthorizations: {
    key: "marketAuthorizations",
    title: "Market Authorizations",
    shortDescription: "Authorization timeliness, processing time, and publication signals by product line.",
    href: PROGRAM_HREF.marketAuthorizations,
    ctaLabel: "Open Market Authorizations workspace",
    tone: "purple",
    icon: ClipboardCheckIcon,
    productLines: buildProgramCells("marketAuthorizations", {
      medicine: "ma",
      medicalDevice: "ma",
      food: "ma",
      cosmetics: "ma",
    }),
  },
};

export function getAllCells(): ProductLineCell[] {
  const cells: ProductLineCell[] = [];
  for (const prog of PROGRAM_ORDER) {
    for (const pl of PRODUCT_LINE_ORDER) {
      cells.push(programDashboardByKey[prog].productLines[pl]);
    }
  }
  return cells;
}

export type ExecutiveSignal = {
  id: string;
  label: string;
  value: string;
  helper: string;
};

export function getExecutiveSignals(): ExecutiveSignal[] {
  const cells = getAllCells();
  const atRisk = cells.filter((c) => c.status === "warning" || c.status === "critical").length;
  const total = cells.length;

  const maTimes = PRODUCT_LINE_ORDER.map((pl) => {
    const c = programDashboardByKey.marketAuthorizations.productLines[pl];
    return { pl, days: c.secondaryMetric.value };
  });
  const slowest = maTimes.reduce((a, b) => (a.days >= b.days ? a : b));

  const byLine = PRODUCT_LINE_ORDER.map((pl) => {
    const lineCells = PROGRAM_ORDER.map((p) => programDashboardByKey[p].productLines[pl]);
    const bad = lineCells.filter((c) => c.status === "warning" || c.status === "critical").length;
    return { pl, bad };
  });
  const bestLine = byLine.reduce((a, b) => (a.bad <= b.bad ? a : b));

  return [
    {
      id: "at-risk",
      label: "Product-line combinations needing attention",
      value: String(atRisk),
      helper: `Across ${total} program × product-line pairs (Warning or Critical).`,
    },
    {
      id: "slowest-ma",
      label: "Slowest MA median processing (new applications)",
      value: `${slowest.days.toFixed(0)} days`,
      helper: `${PRODUCT_LINE_LABELS[slowest.pl]} — compare with other product lines in slides below.`,
    },
    {
      id: "best-line",
      label: "Most stable product line (fewest at-risk programs)",
      value: PRODUCT_LINE_LABELS[bestLine.pl],
      helper: `${bestLine.bad} program area(s) flagged for this line in the snapshot.`,
    },
    {
      id: "freshness",
      label: "Reporting snapshot",
      value: REPORTING_PERIOD,
      helper: `Figures are representative through ${REPORTING_PERIOD}. Last updated ${LAST_UPDATED}.`,
    },
  ];
}

export type ExceptionStripModel = {
  totalPairs: number;
  atRiskCount: number;
  bestProductLine: string;
  reportingPeriod: string;
  lastUpdated: string;
  operationalLabel: string;
};

export function getExceptionStripModel(): ExceptionStripModel {
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
    atRiskCount: atRisk,
    bestProductLine: PRODUCT_LINE_LABELS[bestLine.pl],
    reportingPeriod: REPORTING_PERIOD,
    lastUpdated: LAST_UPDATED,
    operationalLabel: atRisk === 0 ? "Within expected controls" : "Attention required in one or more areas",
  };
}
