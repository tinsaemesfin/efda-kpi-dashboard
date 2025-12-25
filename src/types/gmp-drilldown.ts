/**
 * GMP Drilldown Type Definitions
 * Based on backend specification in PDF/Drilldown/GMP-v01.md
 */

// Base drill-down item
export interface GMPDrillDownItem {
  category: string;
  value: number;
  count: number;
  total: number;
  percentage?: number;
}

// Individual inspection record
export interface GMPInspection {
  inspectionNumber: string;
  facilityName: string;
  inspectionType: string;
  inspectionTypeCode?: string;
  status: string;
  assignedUser?: string;
  startDate: Date | string;
  completionDate?: Date | string;
  isCompliant?: boolean;
  complianceStatus?: string;
  facilityType?: string;
  location?: 'domestic' | 'foreign';
  inspectionMode?: 'onsiteDomestic' | 'onsiteForeign' | 'jointOnsiteForeign' | 'remoteDeskBased';
  productType?: string;
  processingDays?: number;
  targetDays?: number;
  onTime?: boolean;
  decisionDate?: Date | string;
  paymentDate?: Date | string;
  certificateNumber?: string;
  expiryDate?: Date | string;
  deficiencyCount?: number;
  capaStatus?: string;
  inspector?: string;
  investigationType?: string;
  dateReceived?: Date | string;
  inspectionDate?: Date | string;
  outcome?: string;
  responseDays?: number;
  waiverType?: string;
  referenceCountry?: string;
  referenceAuthority?: string;
  previousGMPCertificateNumber?: string;
  applicationDate?: Date | string;
  publicationDate?: Date | string;
  daysToPublish?: number;
  isOnTime?: boolean;
  reportType?: string;
  letterNumber?: string;
  documentLink?: string;
  capaRequestedDate?: Date | string;
  capaDueDate?: Date | string;
  capaSubmittedDate?: Date | string;
  delayDays?: number;
  currentStatus?: string;
  stageBreakdown?: {
    screening?: number;
    assignment?: number;
    assessment?: number;
    review?: number;
    capa?: number;
    decision?: number;
  };
  applicantWaitDays?: number;
  nraProcessingDays?: number;
  performanceVsAvg?: number;
}

// Processing stage breakdown
export interface GMPProcessingStage {
  stage: string;
  days: number;
  target: number;
  onTime: boolean;
}

// Dimension view for switching perspectives
export interface GMPDimensionView {
  id: string;
  label: string;
  description?: string;
  sourceField?: keyof GMPInspection;
  data: GMPDrillDownItem[];
}

// Root cause analysis dimension
export interface GMPRootCauseDimension {
  dimension: string;
  items: GMPDrillDownItem[];
}

// KPI 1: Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan
export interface KPI1DrilldownData {
  summary: {
    numerator: number;
    denominator: number;
    percentage: number;
    period: string;
  };
  byInspectionMode: {
    onsiteDomestic: { count: number; percentage: number };
    onsiteForeign: { count: number; percentage: number };
    jointOnsiteForeign: { count: number; percentage: number };
  };
  byQuarter: Array<{
    quarter: string;
    planned: number;
    completed: number;
    percentage: number;
  }>;
  facilityList: GMPInspection[];
}

// KPI 2: Percentage of Complaint-Triggered GMP Inspections Conducted
export interface KPI2DrilldownData {
  summary: {
    complaintsReceived: number;
    inspectionsConducted: number;
    percentage: number;
    period: string;
  };
  byLocation: {
    domestic: { count: number; percentage: number };
    foreign: { count: number; percentage: number };
  };
  byInvestigationType: Array<{
    type: string;
    typeCode: string;
    count: number;
    percentage: number;
  }>;
  byStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    closed: number;
  };
  complaintList: GMPInspection[];
}

// KPI 3: Percentage of GMP On-site Inspections Waived
export interface KPI3DrilldownData {
  summary: {
    waivedInspections: number;
    totalDecisions: number;
    waiverPercentage: number;
    period: string;
  };
  byWaiverType: {
    newWaiver: { count: number; percentage: number };
    renewalWaiver: { count: number; percentage: number };
  };
  byReferenceAuthority: Array<{
    country: string;
    countryCode: string;
    count: number;
    percentage: number;
  }>;
  byStatus: {
    underReview: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  waiverList: GMPInspection[];
}

// KPI 4: Percentage of Facilities Compliant with GMP Requirements
export interface KPI4DrilldownData {
  summary: {
    compliantFacilities: number;
    totalInspected: number;
    complianceRate: number;
    reportingYear: number;
  };
  byInspectionMode: {
    onsiteDomestic: { total: number; compliant: number; rate: number };
    onsiteForeign: { total: number; compliant: number; rate: number };
    jointOnsite: { total: number; compliant: number; rate: number };
    remoteDeskBased: { total: number; compliant: number; rate: number };
  };
  byComplianceOutcome: {
    fullyCompliant: { count: number; percentage: number };
    partiallyCompliant: { count: number; percentage: number };
    nonCompliant: { count: number; percentage: number };
    capaRequired: { count: number; percentage: number };
    underReview: { count: number; percentage: number };
  };
  byProductType: Array<{
    productType: string;
    total: number;
    compliant: number;
    rate: number;
  }>;
  facilityList: GMPInspection[];
}

// KPI 5: Percentage of Final CAPA Decisions Issued Within Specified Timeline
export interface KPI5DrilldownData {
  summary: {
    withinTimeline: number;
    totalCapaResponses: number;
    percentage: number;
    period: string;
    targetDays: number;
  };
  byInspectionCategory: {
    directInspections: {
      domestic: { count: number; withinTimeline: number; rate: number };
      foreign: { count: number; withinTimeline: number; rate: number };
    };
    jointInspections: { count: number; withinTimeline: number; rate: number };
  };
  byCapaStatus: {
    requested: number;
    submitted: number;
    rejected: number;
    implementationRequested: number;
    implementationSubmitted: number;
    implementationRejected: number;
    completed: number;
  };
  byTimelinePerformance: {
    withinTimeline: { count: number; avgDays: number };
    exceededTimeline: { count: number; avgDays: number; avgDelayDays: number };
    pending: number;
  };
  capaList: GMPInspection[];
}

// KPI 6: Percentage of GMP Inspection Applications Completed Within Set Timeline
export interface KPI6DrilldownData {
  summary: {
    withinTimeline: number;
    totalCompleted: number;
    percentage: number;
    period: string;
  };
  byApplicantType: {
    domesticApplicants: {
      count: number;
      withinTimeline: number;
      percentage: number;
      targetDays: number;
    };
    foreignDirect: {
      count: number;
      withinTimeline: number;
      percentage: number;
      targetDays: number;
    };
    foreignReliance: {
      count: number;
      withinTimeline: number;
      percentage: number;
      targetDays: number;
    };
  };
  byProcessingStage: {
    screening: { avgDays: number; targetDays: number };
    assignment: { avgDays: number; targetDays: number };
    assessment: { avgDays: number; targetDays: number };
    taskForceReview: { avgDays: number; targetDays: number };
    capaProcessing: { avgDays: number; targetDays: number };
    decision: { avgDays: number; targetDays: number };
  };
  byTimelinePerformance: {
    wellWithin: { count: number; percentage: number };
    within: { count: number; percentage: number };
    slightlyExceeded: { count: number; percentage: number };
    significantlyExceeded: { count: number; percentage: number };
  };
  applicationList: GMPInspection[];
}

// KPI 7: Average Turnaround Time to Complete GMP Applications
export interface KPI7DrilldownData {
  summary: {
    totalDays: number;
    totalApplications: number;
    averageDays: number;
    period: string;
    targetDays: number;
  };
  byInspectionMode: Array<{
    mode: string;
    modeCode: string;
    count: number;
    totalDays: number;
    averageDays: number;
    minDays: number;
    maxDays: number;
    stdDevDays: number;
  }>;
  byProcessingStage: {
    screening: { totalDays: number; avgDays: number; percentageOfTotal: number };
    assignment: { totalDays: number; avgDays: number; percentageOfTotal: number };
    assessment: { totalDays: number; avgDays: number; percentageOfTotal: number };
    taskForceReview: { totalDays: number; avgDays: number; percentageOfTotal: number };
    capaProcessing: { totalDays: number; avgDays: number; percentageOfTotal: number };
    decision: { totalDays: number; avgDays: number; percentageOfTotal: number };
  };
  byQuarter: Array<{
    quarter: string;
    count: number;
    avgDays: number;
    minDays: number;
    maxDays: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  trendData: Array<{
    month: string;
    avgDays: number;
    count: number;
  }>;
  applicationList: GMPInspection[];
}

// KPI 8: Median Turnaround Time to Complete GMP Inspection Applications
export interface KPI8DrilldownData {
  summary: {
    medianDays: number;
    meanDays: number;
    modeDays: number;
    reportingYear: number;
    sampleSize: number;
  };
  distribution: Array<{
    bucket: string;
    minDays: number;
    maxDays: number;
    count: number;
    percentage: number;
    cumulative: number;
  }>;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  byInspectionType: Array<{
    type: string;
    typeCode: string;
    median: number;
    mean: number;
    count: number;
    p25: number;
    p75: number;
  }>;
  outlierAnalysis: {
    fastestApplications: Array<{
      inspectionNumber: string;
      facilityName: string;
      processingDays: number;
      percentile: number;
    }>;
    slowestApplications: Array<{
      inspectionNumber: string;
      facilityName: string;
      processingDays: number;
      percentile: number;
      delayReasons: string[];
    }>;
  };
  histogramData: Array<{
    daysRange: string;
    count: number;
    cumulative: number;
  }>;
}

// KPI 9: Percentage of GMP Inspection Reports Published Within Specified Timeline
export interface KPI9DrilldownData {
  summary: {
    publishedOnTime: number;
    totalReports: number;
    percentage: number;
    reportingYear: number;
    targetDays: number;
  };
  byInspectionMode: {
    onsiteDomestic: { total: number; onTime: number; percentage: number };
    onsiteForeign: { total: number; onTime: number; percentage: number };
    jointInspections: { total: number; onTime: number; percentage: number };
    remoteDeskBased: { total: number; onTime: number; percentage: number };
  };
  byPublicationStatus: {
    publishedOnTime: { count: number; percentage: number; avgDays: number };
    publishedLate: { count: number; percentage: number; avgDays: number };
    pendingPublication: { count: number; avgPendingDays: number };
    notApplicable: number;
  };
  byReportType: {
    approvalCertificates: { total: number; onTime: number; percentage: number };
    nonComplianceLetters: { total: number; onTime: number; percentage: number };
    partialApprovalLetters: { total: number; onTime: number; percentage: number };
    capaRequestLetters: { total: number; onTime: number; percentage: number };
  };
  trendByMonth: Array<{
    month: string;
    total: number;
    onTime: number;
    percentage: number;
  }>;
  reportList: GMPInspection[];
}

// Unified GMP KPI Drilldown Data Structure
export interface GMPKPIDrillDownData {
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
    data: GMPDrillDownItem[];
    drillable: boolean;
    nextLevel?: string;
  };
  dimensionViews?: GMPDimensionView[];
  level2?: {
    dimension: string;
    parentCategory?: string;
    data: GMPDrillDownItem[];
    drillable: boolean;
    nextLevel?: string;
  };
  level3?: {
    dimension: string;
    parentCategory?: string;
    data: GMPProcessingStage[];
    drillable: boolean;
    nextLevel?: string;
  };
  level4?: {
    dimension: string;
    parentCategory?: string;
    data: GMPInspection[];
    drillable: boolean;
  };
  rootCauseAnalysis?: GMPRootCauseDimension[];
  // KPI-specific data
  kpi1Data?: KPI1DrilldownData;
  kpi2Data?: KPI2DrilldownData;
  kpi3Data?: KPI3DrilldownData;
  kpi4Data?: KPI4DrilldownData;
  kpi5Data?: KPI5DrilldownData;
  kpi6Data?: KPI6DrilldownData;
  kpi7Data?: KPI7DrilldownData;
  kpi8Data?: KPI8DrilldownData;
  kpi9Data?: KPI9DrilldownData;
}

