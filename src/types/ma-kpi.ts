/**
 * Marketing Authorization KPI Type Definitions
 * Based on official MA KPI requirements document
 * 8 Main KPIs for Marketing Authorization (Medicine, Medical devices, Food)
 */

export interface MAKPIValue {
  numerator: number;
  denominator: number;
  percentage?: number;  // For KPI 1-5, 8
  average?: number;     // For KPI 7
  median?: number;      // For KPI 6
}

export interface QuarterlyMAData {
  quarter: string;      // e.g., "Q1 2024"
  value: MAKPIValue;
}

export interface AnnualMAData {
  year: string;         // e.g., "2024"
  value: MAKPIValue;
}

// KPI 1: Percentage of New MA Applications Completed Within a Specified Time Period
export interface MAKPI1 {
  id: 'MA-KPI-1';
  title: 'Percentage of New MA Applications Completed Within a Specified Time Period';
  definition: 'Measures how many new MA applications were completed within the official processing timeline.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Number of new MA applications completed within the specified timeline';
  denominatorDescription: 'Total number of new MA applications received in that period';
  currentQuarter: MAKPIValue;
  quarterlyData: QuarterlyMAData[];
  timingRules: string[];
  notes: string[];
  harmonization: string[];
  amrhExtensions?: {
    kpi1_1: {
      title: 'Regional reliance positive outcomes within 90 working days';
      value: MAKPIValue;
    };
    kpi1_2: {
      title: 'Continental reliance positive outcomes within 90 working days';
      value: MAKPIValue;
    };
  };
}

// KPI 2: Percentage of Renewal MA Applications Completed Within a Specified Time Period
export interface MAKPI2 {
  id: 'MA-KPI-2';
  title: 'Percentage of Renewal MA Applications Completed Within a Specified Time Period';
  definition: 'Measures efficiency in completing renewal applications on time.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Renewal MA applications completed within timeline';
  denominatorDescription: 'Renewal MA applications received';
  currentQuarter: MAKPIValue;
  quarterlyData: QuarterlyMAData[];
  timingRules: string[];
  harmonization: string[];
}

// KPI 3: Percentage of Minor Variation MA Applications Completed Within a Specified Time Period
export interface MAKPI3 {
  id: 'MA-KPI-3';
  title: 'Percentage of Minor Variation MA Applications Completed Within a Specified Time Period';
  definition: 'Measures timeliness in evaluating minor variations.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Minor variation applications completed within timeline';
  denominatorDescription: 'Minor variations received';
  currentQuarter: MAKPIValue;
  quarterlyData: QuarterlyMAData[];
  timingRules: string[];
  harmonization: string[];
}

// KPI 4: Percentage of Major Variation MA Applications Completed Within a Specified Time Period
export interface MAKPI4 {
  id: 'MA-KPI-4';
  title: 'Percentage of Major Variation MA Applications Completed Within a Specified Time Period';
  definition: 'Measures if major variations are completed within required timelines.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Major variations completed on time';
  denominatorDescription: 'Major variations received';
  currentQuarter: MAKPIValue;
  quarterlyData: QuarterlyMAData[];
  timingRules: string[];
  harmonization: string[];
}

// KPI 5: Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period
export interface MAKPI5 {
  id: 'MA-KPI-5';
  title: 'Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period';
  definition: 'Tracks the efficiency of responding to queries, requests for additional information, and FIRs.';
  maturityLevel: 3;
  type: 'Process';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'Queries / FIRs completed on time';
  denominatorDescription: 'Queries / FIRs received';
  currentQuarter: MAKPIValue;
  quarterlyData: QuarterlyMAData[];
  timingRules: string[];
  harmonization: string[];
}

// KPI 6: Median Time Taken to Complete a New MA Application
export interface MAKPI6 {
  id: 'MA-KPI-6';
  title: 'Median Time Taken to Complete a New MA Application';
  definition: 'Measures the median number of days needed to complete new MA applications.';
  maturityLevel: 3;
  type: 'Process';
  unit: 'Days';
  reportingFrequency: 'Annually';
  formula: 'Arrange all completion times in ascending order; If odd number: median = middle value; If even: median = average of the two middle values';
  currentYear: MAKPIValue;
  annualData: AnnualMAData[];
  timingRules: string[];
  notes: string[];
  harmonization: string[];
  amrhExtensions?: {
    kpi6_1: {
      title: 'Median time for regional reliance pathway';
      value: MAKPIValue;
    };
    kpi6_2: {
      title: 'Median time for continental reliance pathway';
      value: MAKPIValue;
    };
  };
}

// KPI 7: Average Time Taken to Complete a New MA Application
export interface MAKPI7 {
  id: 'MA-KPI-7';
  title: 'Average Time Taken to Complete a New MA Application';
  definition: 'Measures the average time (mean) required to complete new MA applications.';
  maturityLevel: 3;
  type: 'Process';
  unit: 'Days';
  reportingFrequency: 'Annually';
  formula: 'N ÷ D';
  numeratorDescription: 'Sum of all MA application completion times';
  denominatorDescription: 'Number of new MA applications completed';
  currentYear: MAKPIValue;
  annualData: AnnualMAData[];
  timingRules: string[];
  notes: string[];
  harmonization: string[];
}

// KPI 8: Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines
export interface MAKPI8 {
  id: 'MA-KPI-8';
  title: 'Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines';
  definition: 'Measures transparency by tracking publication of PARs for approved medicines.';
  maturityLevel: 4;
  type: 'Output';
  unit: '%';
  reportingFrequency: 'Quarterly';
  formula: '(N ÷ D) × 100';
  numeratorDescription: 'PARs published within the specified timeline';
  denominatorDescription: 'Total MAs granted in the period';
  currentQuarter: MAKPIValue;
  quarterlyData: QuarterlyMAData[];
  timingRules: string[];
  specifiedTimelines: {
    efda: string;
    tmda: string;
    rwandaFDA: string;
    ugandaNDA: string;
  };
  harmonization: string[];
}

// Combined MA KPI Data
export interface MAKPIData {
  kpi1: MAKPI1;
  kpi2: MAKPI2;
  kpi3: MAKPI3;
  kpi4: MAKPI4;
  kpi5: MAKPI5;
  kpi6: MAKPI6;
  kpi7: MAKPI7;
  kpi8: MAKPI8;
}

