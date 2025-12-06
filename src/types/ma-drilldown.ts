/**
 * Drill-down data types for MA KPIs
 * Based on plan.md drill-down structure
 */

// Base drill-down item
export interface DrillDownItem {
  category: string;
  value: number;
  count: number;
  total: number;
  percentage?: number;
}

// Level 1: By Submodule Type
export interface SubmoduleTypeDrillDown extends DrillDownItem {
  category: "Medicine" | "Food" | "Medical Device";
}

// Level 2: By Approval Pathway (for KPI 1)
export interface ApprovalPathwayDrillDown extends DrillDownItem {
  category: "SRA" | "Regular" | "Accelerated" | "Abridged" | "Verification";
}

// Level 2: By Renewal Status (for KPI 2)
export interface RenewalStatusDrillDown extends DrillDownItem {
  category: "On-Time Renewals" | "Late Renewals" | "Near-Expiry";
}

// Level 2: By Variation Reason (for KPI 3)
export interface VariationReasonDrillDown extends DrillDownItem {
  category: string; // e.g., "Manufacturing Site Change", "Formulation", "Labeling"
}

// Level 2: By Variation Complexity (for KPI 4)
export interface VariationComplexityDrillDown extends DrillDownItem {
  category: string; // e.g., "Low Complexity", "Medium Complexity", "High Complexity"
  firCount?: number;
  assessmentCycles?: number;
}

// Level 2: By FIR Type (for KPI 5)
export interface FIRTypeDrillDown extends DrillDownItem {
  category: "Screening FIR" | "Assessment FIR";
}

// Level 2: By Application Type (for KPI 5)
export interface ApplicationTypeDrillDown extends DrillDownItem {
  category: "New" | "Renewal" | "Minor Variation" | "Major Variation";
}

// Level 3: By Processing Stage
export interface ProcessingStageDrillDown {
  stage: string;
  days: number;
  target: number;
  onTime: boolean;
}

// Level 4: Individual Application
export interface IndividualApplication {
  maNumber: string;
  brandName: string;
  genericName: string;
  applicationType: string;
  status: "Approved" | "Rejected" | "Pending";
  submissionDate: string;
  decisionDate?: string;
  processingDays: number;
  targetDays: number;
  onTime: boolean;
  timeline: ProcessingStageDrillDown[];
  assessors: {
    prescreener?: string;
    primary?: string;
    secondary?: string;
  };
  agent: string;
  supplier: string;
  branchName?: string;
}

// Root Cause Analysis Dimensions
export interface RootCauseDimension {
  dimension: string;
  items: DrillDownItem[];
}

// Complete Drill-Down Data Structure
export interface KPIDrillDownData {
  kpiId: string;
  kpiName: string;
  currentValue: {
    value: number;
    numerator: number;
    denominator: number;
    percentage?: number;
    median?: number;
    average?: number;
  };
  level1?: {
    dimension: string;
    data: DrillDownItem[];
    drillable: boolean;
    nextLevel?: string;
  };
  level2?: {
    dimension: string;
    parentCategory?: string;
    data: DrillDownItem[];
    drillable: boolean;
    nextLevel?: string;
  };
  level3?: {
    dimension: string;
    parentCategory?: string;
    data: ProcessingStageDrillDown[];
    drillable: boolean;
    nextLevel?: string;
  };
  level4?: {
    dimension: string;
    parentCategory?: string;
    data: IndividualApplication[];
    drillable: boolean;
  };
  rootCauseAnalysis?: RootCauseDimension[];
}

