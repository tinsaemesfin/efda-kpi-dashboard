import { ClinicalTrialKPI, CTKPIMetadata, QuarterlyData, AnnualData, QuarterlyTurnaroundData } from '@/types/clinical-trial-kpi';

// Helper to generate quarterly data
const generateQuarterlyData = (baseNumerator: number, baseDenominator: number, quarters: number = 4): QuarterlyData[] => {
  const data: QuarterlyData[] = [];
  const currentYear = 2024;
  
  for (let i = 0; i < quarters; i++) {
    const quarterNumber = 4 - i; // Most recent quarter first
    const year = currentYear;
    const numerator = Math.floor(baseNumerator + (Math.random() * 10 - 5));
    const denominator = Math.floor(baseDenominator + (Math.random() * 8 - 4));
    const percentage = denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
    
    data.unshift({
      quarter: `Q${quarterNumber} ${year}`,
      year,
      quarterNumber,
      numerator,
      denominator,
      percentage,
      target: 85 // Common target for percentage KPIs
    });
  }
  
  return data;
};

// Clinical Trial KPI Data
export const clinicalTrialKPIData: ClinicalTrialKPI = {
  // KPI 1: % of new CT applications evaluated within timeline
  kpi1: {
    numerator: 127, // New CT apps evaluated within timeline
    denominator: 145, // Total new CT apps received
    percentage: 87.6, // (127 ÷ 145) × 100
    maturityLevel: 3,
    indicatorType: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    quarterlyData: generateQuarterlyData(32, 36, 4)
  },

  // KPI 2: % of CT amendments evaluated within timelines
  kpi2: {
    numerator: 203, // CT amendments evaluated within timeline
    denominator: 228, // Total CT amendments received
    percentage: 89.0,
    maturityLevel: 3,
    indicatorType: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    quarterlyData: generateQuarterlyData(51, 57, 4)
  },

  // KPI 3: % of approved & ongoing CTs inspected as per GCP plan
  kpi3: {
    numerator: 78, // Approved & ongoing CTs inspected
    denominator: 92, // Total approved & ongoing CTs scheduled for GCP inspection
    percentage: 84.8,
    maturityLevel: 3,
    indicatorType: 'Output',
    unit: '%',
    reportingFrequency: 'Annual',
    annualData: [
      { year: 2022, numerator: 65, denominator: 80, percentage: 81.3, target: 80 },
      { year: 2023, numerator: 72, denominator: 88, percentage: 81.8, target: 80 },
      { year: 2024, numerator: 78, denominator: 92, percentage: 84.8, target: 85 }
    ]
  },

  // KPI 4: % of field & safety reports assessed within timeline
  kpi4: {
    numerator: 412, // Field & safety reports assessed within timeline
    denominator: 456, // Total field & safety reports received
    percentage: 90.4,
    maturityLevel: 3,
    indicatorType: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    quarterlyData: generateQuarterlyData(103, 114, 4)
  },

  // KPI 5: % of CTs compliant with GCP requirements
  kpi5: {
    numerator: 68, // CTs compliant with GCP
    denominator: 78, // Total CTs inspected
    percentage: 87.2,
    maturityLevel: 3,
    indicatorType: 'Outcome',
    unit: '%',
    reportingFrequency: 'Quarterly',
    quarterlyData: generateQuarterlyData(17, 20, 4)
  },

  // KPI 6: % of approved CTs listed in national registry
  kpi6: {
    numerator: 89, // Approved CTs submitted for registry publication
    denominator: 94, // Total approved CTs
    percentage: 94.7,
    maturityLevel: 4,
    indicatorType: 'Output',
    unit: '%',
    reportingFrequency: 'Quarterly',
    quarterlyData: generateQuarterlyData(22, 24, 4)
  },

  // KPI 7: % of CAPA evaluated within timeline
  kpi7: {
    numerator: 45, // CAPA evaluated within timeline
    denominator: 52, // Total CAPA received
    percentage: 86.5,
    maturityLevel: 3,
    indicatorType: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    quarterlyData: generateQuarterlyData(11, 13, 4)
  },

  // KPI 8: Average turnaround time to complete CT evaluation
  kpi8: {
    numerator: 6890, // Sum of evaluation times (in days)
    denominator: 127, // Total number of evaluated applications
    averageDays: 54.3, // 6890 ÷ 127
    maturityLevel: 3,
    indicatorType: 'Process',
    unit: 'Days',
    reportingFrequency: 'Quarterly',
    quarterlyData: [
      { quarter: 'Q1 2024', year: 2024, quarterNumber: 1, totalDays: 1720, totalApplications: 32, averageDays: 53.8, target: 60 },
      { quarter: 'Q2 2024', year: 2024, quarterNumber: 2, totalDays: 1680, totalApplications: 31, averageDays: 54.2, target: 60 },
      { quarter: 'Q3 2024', year: 2024, quarterNumber: 3, totalDays: 1750, totalApplications: 33, averageDays: 53.0, target: 60 },
      { quarter: 'Q4 2024', year: 2024, quarterNumber: 4, totalDays: 1740, totalApplications: 31, averageDays: 56.1, target: 60 }
    ]
  },

  // Supplemental KPIs for Ethiopia FDA
  supplemental: {
    kpi2_1: {
      numerator: 218, // Evaluated amendments
      denominator: 228, // Amendments received
      percentage: 95.6,
      indicatorType: 'Output',
      unit: '%',
      reportingFrequency: 'Quarterly'
    },
    kpi3_1: {
      numerator: 12, // Regulatory measures taken
      denominator: 145, // CTs conducted
      percentage: 8.3,
      indicatorType: 'Outcome',
      unit: '%',
      reportingFrequency: 'Quarterly'
    },
    kpi4_1: {
      numerator: 434, // Safety reports assessed
      denominator: 456, // Received safety reports
      percentage: 95.2,
      indicatorType: 'Output',
      unit: '%',
      reportingFrequency: 'Quarterly'
    }
  }
};

// KPI Metadata for reference and display
export const ctKPIMetadata: CTKPIMetadata[] = [
  {
    kpiNumber: 'KPI 1',
    title: 'Percentage of new clinical trial applications evaluated within a specified timeline',
    definition: 'Measures how many new CT applications are evaluated within a predefined evaluation period.',
    maturityLevel: 3,
    indicatorType: 'Process',
    numeratorDescription: 'Number of new clinical trial applications evaluated within the specified timeline',
    denominatorDescription: 'Total number of new clinical trial applications received',
    formula: '(N ÷ D) × 100',
    unit: '%',
    reportingFrequency: 'Quarterly',
    notes: ['Fully harmonized across all four NRAs (TMDA, EFDA, RFDA, UNDA)'],
    harmonizationStatus: 'Fully Harmonized'
  },
  {
    kpiNumber: 'KPI 2',
    title: 'Percentage of clinical trial amendments evaluated within specified timelines',
    definition: 'Tracks timeliness of reviewing protocol amendments.',
    maturityLevel: 3,
    indicatorType: 'Process',
    numeratorDescription: 'Number of CT amendments evaluated within timeline',
    denominatorDescription: 'Total CT amendments received',
    formula: '(N ÷ D) × 100',
    unit: '%',
    reportingFrequency: 'Quarterly',
    notes: ['Fully harmonized for all four NRAs'],
    harmonizationStatus: 'Fully Harmonized'
  },
  {
    kpiNumber: 'KPI 3',
    title: 'Percentage of approved and ongoing clinical trials inspected as per the GCP plan',
    definition: 'Measures how many scheduled GCP inspections were completed.',
    maturityLevel: 3,
    indicatorType: 'Output',
    numeratorDescription: 'Number of approved & ongoing CTs inspected',
    denominatorDescription: 'Total approved & ongoing CTs scheduled for GCP inspection',
    formula: '(N ÷ D) × 100',
    unit: '%',
    reportingFrequency: 'Annual',
    notes: [
      'Harmonized for TMDA, EFDA, RFDA',
      'Uganda NDA uses a modified definition (measured for CTs in a specific time period)'
    ],
    harmonizationStatus: 'Partially Harmonized'
  },
  {
    kpiNumber: 'KPI 4',
    title: 'Percentage of field and safety reports assessed within a specified timeline',
    definition: 'Measures timeliness of evaluating safety and field reports.',
    maturityLevel: 3,
    indicatorType: 'Process',
    numeratorDescription: 'Number of field & safety reports assessed within timeline',
    denominatorDescription: 'Total field & safety reports received',
    formula: '(N ÷ D) × 100',
    unit: '%',
    reportingFrequency: 'Quarterly',
    notes: [
      'Ethiopia FDA: counts safety reports only',
      'Rwanda FDA: counts all reports',
      'Uganda NDA: safety reports only + denominator tied to specific time period'
    ],
    harmonizationStatus: 'Partially Harmonized'
  },
  {
    kpiNumber: 'KPI 5',
    title: 'Percentage of clinical trials compliant with GCP requirements',
    definition: 'Tracks compliance with GCP based on inspection results.',
    maturityLevel: 3,
    indicatorType: 'Outcome',
    numeratorDescription: 'Number of clinical trials compliant with GCP',
    denominatorDescription: 'Total number of CTs inspected',
    formula: '(N ÷ D) × 100',
    unit: '%',
    reportingFrequency: 'Quarterly',
    notes: [
      'Harmonized for EFDA & UNDA',
      'TMDA includes GCP + GCLP compliance',
      'Rwanda FDA does not track as KPI (GCP is prerequisite for application)'
    ],
    harmonizationStatus: 'Partially Harmonized'
  },
  {
    kpiNumber: 'KPI 6',
    title: 'Percentage of approved clinical trials listed in national registry',
    definition: 'Measures publication of approved CTs to national registry.',
    maturityLevel: 4,
    indicatorType: 'Output',
    numeratorDescription: 'Number of approved CTs submitted for registry publication',
    denominatorDescription: 'Total approved CTs',
    formula: '(N ÷ D) × 100',
    unit: '%',
    reportingFrequency: 'Quarterly',
    notes: [
      'TMDA, EFDA, UNDA harmonized',
      'UNDA registry automatically publishes → always 100%',
      'RFDA: automatic publication → not tracked'
    ],
    harmonizationStatus: 'Mostly Harmonized'
  },
  {
    kpiNumber: 'KPI 7',
    title: 'Percentage of CAPA (Corrective and Preventive Actions) evaluated within specified timeline',
    definition: 'Measures timeliness of CAPA evaluation following GCP inspections.',
    maturityLevel: 3,
    indicatorType: 'Process',
    numeratorDescription: 'Number of CAPA evaluated within timeline',
    denominatorDescription: 'Total CAPA received',
    formula: '(N ÷ D) × 100',
    unit: '%',
    reportingFrequency: 'Quarterly',
    notes: [
      'EFDA & UNDA harmonized',
      'TMDA reports annually',
      'Rwanda FDA tracks "technically" but not institutionally'
    ],
    harmonizationStatus: 'Partially Harmonized'
  },
  {
    kpiNumber: 'KPI 8',
    title: 'Average turnaround time to complete evaluation of CT applications',
    definition: 'Measures how long it takes to evaluate CT applications (in days).',
    maturityLevel: 3,
    indicatorType: 'Process',
    numeratorDescription: 'Sum of evaluation times for each application',
    denominatorDescription: 'Total number of evaluated applications',
    formula: 'N ÷ D',
    unit: 'Days',
    reportingFrequency: 'Quarterly',
    notes: [
      'Rwanda FDA, TMDA, Uganda NDA harmonized',
      'EFDA reports semi-annually',
      'This KPI supports KPI #1 (helps define timeline rules)'
    ],
    harmonizationStatus: 'Mostly Harmonized'
  }
];

