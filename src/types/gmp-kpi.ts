/**
 * GMP KPI Type Definitions
 * Based on official GMP KPI requirements document
 * 9 Main KPIs for Good Manufacturing Practice Inspections
 */

export interface GMPKPIValue {
  numerator: number;
  denominator: number;
  percentage?: number;  // For KPI 1-6, 9
  average?: number;     // For KPI 7
  median?: number;      // For KPI 8
}

export interface QuarterlyGMPData {
  quarter: string;      // e.g., "Q1 2024"
  value: GMPKPIValue;
}

export interface AnnualGMPData {
  year: string;         // e.g., "2024"
  value: GMPKPIValue;
}

export interface GMPDisaggregation {
  label: string;
  value: number;
  percentage?: number;
}

// KPI 1: Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan
export interface GMPKPI1 {
  id: 'GMP-KPI-1';
  title: 'Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan';
  definition: 'Measures how well the regulator executes its annual/quarterly GMP inspection plan.';
  maturityLevel: 3;
  type: 'Output';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Number of pharmaceutical manufacturing facilities inspected as per the plan';
  denominatorDescription: 'Total number of facilities planned for inspection';
  currentQuarter: GMPKPIValue;
  quarterlyData: QuarterlyGMPData[];
  disaggregations: {
    onsiteDomestic: GMPDisaggregation;
    onsiteForeign: GMPDisaggregation;
    jointOnsiteForeign: GMPDisaggregation;
  };
  notes: string[];
  harmonization: string[];
}

// KPI 2: Percentage of complaint-triggered GMP inspections conducted
export interface GMPKPI2 {
  id: 'GMP-KPI-2';
  title: 'Percentage of complaint-triggered GMP inspections conducted';
  definition: 'Measures responsiveness to complaints requiring GMP investigations.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Number of complaint-triggered GMP inspections conducted';
  denominatorDescription: 'Total number of complaints requiring GMP inspection';
  currentQuarter: GMPKPIValue;
  quarterlyData: QuarterlyGMPData[];
  disaggregations: {
    domestic: GMPDisaggregation;
    foreign: GMPDisaggregation;
  };
  notes: string[];
  harmonization: string[];
}

// KPI 3: Percentage of GMP on-site inspections waived
export interface GMPKPI3 {
  id: 'GMP-KPI-3';
  title: 'Percentage of GMP on-site inspections waived';
  definition: 'Measures the use of risk-based and reliance mechanisms to waive on-site inspections.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Facilities where on-site inspection was waived (remote/desk review done instead)';
  denominatorDescription: 'Total GMP inspections completed (physical or remote)';
  currentQuarter: GMPKPIValue;
  quarterlyData: QuarterlyGMPData[];
  notes: string[];
  harmonization: string[];
}

// KPI 4: Percentage of facilities compliant with GMP requirements
export interface GMPKPI4 {
  id: 'GMP-KPI-4';
  title: 'Percentage of facilities compliant with GMP requirements';
  definition: 'Measures extent of GMP compliance across inspected facilities.';
  maturityLevel: 3;
  type: 'Outcome';
  unit: '%';
  reportingFrequency: 'Annual';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Number of facilities compliant with GMP requirements';
  denominatorDescription: 'Total number of facilities inspected';
  currentYear: GMPKPIValue;
  annualData: AnnualGMPData[];
  disaggregations: {
    onsiteDomestic: GMPDisaggregation;
    onsiteForeign: GMPDisaggregation;
    jointOnsiteForeign: GMPDisaggregation;
    remoteDeskBased: GMPDisaggregation;
  };
  harmonization: string[];
}

// KPI 5: Percentage of final CAPA decisions issued within a specified timeline
export interface GMPKPI5 {
  id: 'GMP-KPI-5';
  title: 'Percentage of final CAPA decisions issued within a specified timeline';
  definition: 'Measures efficiency in evaluating and concluding CAPA responses from manufacturers.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Final CAPA decisions issued within timeline';
  denominatorDescription: 'Total CAPA responses received';
  currentQuarter: GMPKPIValue;
  quarterlyData: QuarterlyGMPData[];
  disaggregations: {
    directInspections: GMPDisaggregation;
    jointInspections: GMPDisaggregation;
  };
  notes: string[];
  harmonization: string[];
}

// KPI 6: Percentage of GMP inspection applications completed within the set timeline
export interface GMPKPI6 {
  id: 'GMP-KPI-6';
  title: 'Percentage of GMP inspection applications completed within the set timeline';
  definition: 'Measures efficiency of processing GMP applications end-to-end.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Applications completed within NRA SLA timeline';
  denominatorDescription: 'Total GMP inspection applications received';
  currentQuarter: GMPKPIValue;
  quarterlyData: QuarterlyGMPData[];
  disaggregations: {
    domestic: GMPDisaggregation;
    foreignDirect: GMPDisaggregation;
    foreignReliance: GMPDisaggregation;
  };
  stopClockRules: string[];
  harmonization: string[];
}

// KPI 7: Average turnaround time to complete GMP applications
export interface GMPKPI7 {
  id: 'GMP-KPI-7';
  title: 'Average turnaround time to complete GMP applications';
  definition: 'Average number of days NRAs take to complete GMP inspection applications.';
  maturityLevel: 3;
  type: 'Process';
  unit: 'Days';
  reportingFrequency: 'Quarterly';
  formula: 'N ÷ D';
  numeratorDescription: 'Sum of processing days for all applications completed';
  denominatorDescription: 'Number of applications completed';
  currentQuarter: GMPKPIValue;
  quarterlyData: QuarterlyGMPData[];
  disaggregations: {
    onsiteDomestic: GMPDisaggregation;
    onsiteForeign: GMPDisaggregation;
    jointOnsiteForeign: GMPDisaggregation;
  };
  notes: string[];
  harmonization: string[];
}

// KPI 8: Median turnaround time to complete GMP inspection applications
export interface GMPKPI8 {
  id: 'GMP-KPI-8';
  title: 'Median turnaround time to complete GMP inspection applications';
  definition: 'Median number of days required to process GMP inspections.';
  maturityLevel: 3;
  type: 'Process';
  unit: 'Days';
  reportingFrequency: 'Annual';
  formula: 'Arrange all completion times in order; If odd: median is middle value; If even: median is average of two middle values';
  currentYear: GMPKPIValue;
  annualData: AnnualGMPData[];
  notes: string[];
  harmonization: string[];
}

// KPI 9: Percentage of GMP inspection reports published within a specified timeline
export interface GMPKPI9 {
  id: 'GMP-KPI-9';
  title: 'Percentage of GMP inspection reports published within a specified timeline';
  definition: 'Tracks transparency and timely publication of GMP inspection outcomes.';
  maturityLevel: 4;
  type: 'Output';
  unit: '%';
  reportingFrequency: 'Annual';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Inspection reports published within timeline';
  denominatorDescription: 'Total inspections completed';
  currentYear: GMPKPIValue;
  annualData: AnnualGMPData[];
  disaggregations: {
    onsiteDomestic: GMPDisaggregation;
    onsiteForeign: GMPDisaggregation;
    jointInspections: GMPDisaggregation;
    remoteDeskBased: GMPDisaggregation;
  };
  notes: string[];
  harmonization: string[];
}

// Combined GMP KPI Data
export interface GMPKPIData {
  kpi1: GMPKPI1;
  kpi2: GMPKPI2;
  kpi3: GMPKPI3;
  kpi4: GMPKPI4;
  kpi5: GMPKPI5;
  kpi6: GMPKPI6;
  kpi7: GMPKPI7;
  kpi8: GMPKPI8;
  kpi9: GMPKPI9;
}

