// Clinical Trial KPI Types based on official requirements

export interface ClinicalTrialKPI {
  // KPI 1: % of new CT applications evaluated within timeline
  kpi1: {
    numerator: number; // New CT apps evaluated within timeline
    denominator: number; // Total new CT apps received
    percentage: number; // (N ÷ D) × 100
    maturityLevel: number;
    indicatorType: 'Process';
    unit: '%';
    reportingFrequency: 'Quarterly';
    quarterlyData: QuarterlyData[];
  };

  // KPI 2: % of CT amendments evaluated within timelines
  kpi2: {
    numerator: number; // CT amendments evaluated within timeline
    denominator: number; // Total CT amendments received
    percentage: number;
    maturityLevel: number;
    indicatorType: 'Process';
    unit: '%';
    reportingFrequency: 'Quarterly';
    quarterlyData: QuarterlyData[];
  };

  // KPI 3: % of approved & ongoing CTs inspected as per GCP plan
  kpi3: {
    numerator: number; // Approved & ongoing CTs inspected
    denominator: number; // Total approved & ongoing CTs scheduled for GCP inspection
    percentage: number;
    maturityLevel: number;
    indicatorType: 'Output';
    unit: '%';
    reportingFrequency: 'Annual';
    annualData: AnnualData[];
  };

  // KPI 4: % of field & safety reports assessed within timeline
  kpi4: {
    numerator: number; // Field & safety reports assessed within timeline
    denominator: number; // Total field & safety reports received
    percentage: number;
    maturityLevel: number;
    indicatorType: 'Process';
    unit: '%';
    reportingFrequency: 'Quarterly';
    quarterlyData: QuarterlyData[];
  };

  // KPI 5: % of CTs compliant with GCP requirements
  kpi5: {
    numerator: number; // CTs compliant with GCP
    denominator: number; // Total CTs inspected
    percentage: number;
    maturityLevel: number;
    indicatorType: 'Outcome';
    unit: '%';
    reportingFrequency: 'Quarterly';
    quarterlyData: QuarterlyData[];
  };

  // KPI 6: % of approved CTs listed in national registry
  kpi6: {
    numerator: number; // Approved CTs submitted for registry publication
    denominator: number; // Total approved CTs
    percentage: number;
    maturityLevel: number;
    indicatorType: 'Output';
    unit: '%';
    reportingFrequency: 'Quarterly';
    quarterlyData: QuarterlyData[];
  };

  // KPI 7: % of CAPA evaluated within timeline
  kpi7: {
    numerator: number; // CAPA evaluated within timeline
    denominator: number; // Total CAPA received
    percentage: number;
    maturityLevel: number;
    indicatorType: 'Process';
    unit: '%';
    reportingFrequency: 'Quarterly';
    quarterlyData: QuarterlyData[];
  };

  // KPI 8: Average turnaround time to complete CT evaluation
  kpi8: {
    numerator: number; // Sum of evaluation times for each application
    denominator: number; // Total number of evaluated applications
    averageDays: number; // N ÷ D
    maturityLevel: number;
    indicatorType: 'Process';
    unit: 'Days';
    reportingFrequency: 'Quarterly';
    quarterlyData: QuarterlyTurnaroundData[];
  };

  // Supplemental KPIs for Ethiopia FDA
  supplemental: {
    kpi2_1: {
      // % of received amendments evaluated
      numerator: number;
      denominator: number;
      percentage: number;
      indicatorType: 'Output';
      unit: '%';
      reportingFrequency: 'Quarterly';
    };
    kpi3_1: {
      // % of regulatory measures taken due to GCP findings
      numerator: number;
      denominator: number;
      percentage: number;
      indicatorType: 'Outcome';
      unit: '%';
      reportingFrequency: 'Quarterly';
    };
    kpi4_1: {
      // % of received safety reports assessed
      numerator: number;
      denominator: number;
      percentage: number;
      indicatorType: 'Output';
      unit: '%';
      reportingFrequency: 'Quarterly';
    };
  };
}

export interface QuarterlyData {
  quarter: string; // e.g., "Q1 2024", "Q2 2024"
  year: number;
  quarterNumber: number; // 1, 2, 3, or 4
  numerator: number;
  denominator: number;
  percentage: number;
  target?: number; // Target percentage if applicable
}

export interface AnnualData {
  year: number;
  numerator: number;
  denominator: number;
  percentage: number;
  target?: number;
}

export interface QuarterlyTurnaroundData {
  quarter: string;
  year: number;
  quarterNumber: number;
  totalDays: number; // Sum of evaluation times
  totalApplications: number; // Number of evaluated applications
  averageDays: number; // totalDays ÷ totalApplications
  target?: number; // Target days if applicable
}

// KPI Metadata
export interface CTKPIMetadata {
  kpiNumber: string; // e.g., "KPI 1", "KPI 2"
  title: string;
  definition: string;
  maturityLevel: number;
  indicatorType: 'Process' | 'Output' | 'Outcome';
  numeratorDescription: string;
  denominatorDescription: string;
  formula: string;
  unit: '%' | 'Days';
  reportingFrequency: 'Quarterly' | 'Annual' | 'Semi-Annually';
  notes: string[];
  harmonizationStatus: string;
}

