import { ClipboardCheck, Droplets, FlaskConical, Pill, ShieldCheck, Stethoscope, Wheat, type LucideIcon } from "lucide-react";

/**
 * EFDA brand palette for the public sign-in landing pages. The cyan is sampled from the
 * EFDA emblem; the deeper blues keep text and buttons at WCAG AA contrast on white.
 * The flag colours are only used for the thin national stripe.
 */
export const EFDA_BRAND = {
  cyan: "#00AEEF",
  blue: "#0072BC",
  blueDark: "#005A94",
  navy: "#0A2540",
  navyDeep: "#061A2E",
  flagGreen: "#078930",
  flagYellow: "#FCDD09",
  flagRed: "#DA121A",
} as const;

export type ProgramKey = "ct" | "gmp" | "ma";

export interface LandingProgram {
  key: ProgramKey;
  code: string;
  title: string;
  href: string;
  icon: LucideIcon;
  kpiCount: number;
  summary: string;
  /** Short accent used only for markers and icon tiles (see the colour guidelines). */
  accent: string;
  indicators: string[];
}

export const LANDING_PROGRAMS: LandingProgram[] = [
  {
    key: "ma",
    code: "MA",
    title: "Market Authorization",
    href: "/market-authorizations",
    icon: ClipboardCheck,
    kpiCount: 8,
    summary: "Timeliness of new, renewal and variation applications, information requests and published assessment reports.",
    accent: "#0072BC",
    indicators: [
      "New and renewal applications completed on time",
      "Minor and major variations completed on time",
      "Further information requests (FIR) answered on time",
      "Median and average time for new applications",
      "Public Assessment Reports published on time",
    ],
  },
  {
    key: "gmp",
    code: "GMP",
    title: "GMP Inspection",
    href: "/gmp-inspections",
    icon: ShieldCheck,
    kpiCount: 9,
    summary: "Inspection of local and foreign pharmaceutical manufacturing facilities, compliance, CAPA decisions and turnaround time.",
    accent: "#0F766E",
    indicators: [
      "Facilities inspected as per the approved plan",
      "On-site inspections waived through reliance",
      "Facilities compliant with GMP requirements",
      "Final CAPA decisions issued on time",
      "Turnaround time and timely report publication",
    ],
  },
  {
    key: "ct",
    code: "CT",
    title: "Clinical Trial",
    href: "/clinical-trials",
    icon: FlaskConical,
    kpiCount: 11,
    summary: "Evaluation of trial applications and amendments, GCP inspections, safety reports and regulatory measures.",
    accent: "#1E3A8A",
    indicators: [
      "Applications and amendments evaluated on time",
      "GCP inspections completed and compliance rate",
      "Safety reports (SAE / NSAE) assessed on time",
      "CAPA plans evaluated within the target",
      "Average turnaround for new applications",
    ],
  },
];

export const TOTAL_KPIS = LANDING_PROGRAMS.reduce((sum, program) => sum + program.kpiCount, 0);

export type ProductKey = "medicine" | "medicalDevice" | "food" | "cosmetics";

export interface LandingProduct {
  key: ProductKey;
  title: string;
  abbreviation: string;
  icon: LucideIcon;
  description: string;
  /** Which programs report indicators for this product line. */
  programs: ProgramKey[];
  maKpis: number;
  note?: string;
}

export const LANDING_PRODUCTS: LandingProduct[] = [
  {
    key: "medicine",
    title: "Medicine",
    abbreviation: "MDCN",
    icon: Pill,
    description: "Human medicines, from clinical trial approval and manufacturing inspection to market authorization.",
    programs: ["ma", "gmp", "ct"],
    maKpis: 8,
  },
  {
    key: "medicalDevice",
    title: "Medical Device",
    abbreviation: "MD",
    icon: Stethoscope,
    description: "Medical devices and diagnostics registered for the Ethiopian market.",
    programs: ["ma"],
    maKpis: 8,
  },
  {
    key: "food",
    title: "Food",
    abbreviation: "FOOD",
    icon: Wheat,
    description: "Food product registration and food notification applications.",
    programs: ["ma"],
    maKpis: 8,
    note: "Product and notification pathways",
  },
  {
    key: "cosmetics",
    title: "Cosmetics",
    abbreviation: "COSM",
    icon: Droplets,
    description: "Cosmetic product registration, renewal and variation.",
    programs: ["ma"],
    maKpis: 7,
    note: "Variations reported as one indicator",
  },
];

export const SIGN_IN_STEPS = [
  "Continue to the EFDA Identity Server",
  "Sign in with your EFDA account credentials",
  "Return directly to your dashboard",
];

export function programForPath(returnPath: string): LandingProgram | undefined {
  return LANDING_PROGRAMS.find((program) => returnPath.startsWith(program.href));
}
