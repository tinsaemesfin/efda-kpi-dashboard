/**
 * Marketing Authorization KPI Dummy Data
 * Realistic data for all 8 MA KPIs based on official requirements
 */

import type { MAKPIData } from '@/types/ma-kpi';

export const maKPIData: MAKPIData = {
  // KPI 1: Percentage of New MA Applications Completed Within a Specified Time Period
  kpi1: {
    id: 'MA-KPI-1',
    title: 'Percentage of New MA Applications Completed Within a Specified Time Period',
    definition: 'Measures how many new MA applications were completed within the official processing timeline.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Number of new MA applications completed within the specified timeline',
    denominatorDescription: 'Total number of new MA applications received in that period',
    currentQuarter: {
      numerator: 234,
      denominator: 285,
      percentage: 82.1
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 218, denominator: 268, percentage: 81.3 } },
      { quarter: 'Q2 2024', value: { numerator: 225, denominator: 275, percentage: 81.8 } },
      { quarter: 'Q3 2024', value: { numerator: 228, denominator: 280, percentage: 81.4 } },
      { quarter: 'Q4 2024', value: { numerator: 234, denominator: 285, percentage: 82.1 } }
    ],
    timingRules: [
      'Time counted from start of regulatory processing (screening/validation)',
      'Excludes time when application is paused waiting for applicant input',
      'Uses each NRA\'s official public SLA timeline'
    ],
    notes: [
      'UNDA uses target-based denominator (number of new MA applications planned for completion)'
    ],
    harmonization: ['Harmonized across TMDA, EFDA, Rwanda FDA', 'UNDA uses target-based denominator'],
    amrhExtensions: {
      kpi1_1: {
        title: 'Regional reliance positive outcomes within 90 working days',
        value: { numerator: 45, denominator: 52, percentage: 86.5 }
      },
      kpi1_2: {
        title: 'Continental reliance positive outcomes within 90 working days',
        value: { numerator: 38, denominator: 48, percentage: 79.2 }
      }
    }
  },

  // KPI 2: Percentage of Renewal MA Applications Completed Within a Specified Time Period
  kpi2: {
    id: 'MA-KPI-2',
    title: 'Percentage of Renewal MA Applications Completed Within a Specified Time Period',
    definition: 'Measures efficiency in completing renewal applications on time.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Renewal MA applications completed within timeline',
    denominatorDescription: 'Renewal MA applications received',
    currentQuarter: {
      numerator: 156,
      denominator: 178,
      percentage: 87.6
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 142, denominator: 165, percentage: 86.1 } },
      { quarter: 'Q2 2024', value: { numerator: 148, denominator: 170, percentage: 87.1 } },
      { quarter: 'Q3 2024', value: { numerator: 152, denominator: 174, percentage: 87.4 } },
      { quarter: 'Q4 2024', value: { numerator: 156, denominator: 178, percentage: 87.6 } }
    ],
    timingRules: [
      'Clock runs from screening/validation → final decision',
      'Excludes applicant waiting time'
    ],
    harmonization: ['Harmonized across TMDA, EFDA, Rwanda FDA', 'UNDA does not track this KPI (renewals not yet priority)']
  },

  // KPI 3: Percentage of Minor Variation MA Applications Completed Within a Specified Time Period
  kpi3: {
    id: 'MA-KPI-3',
    title: 'Percentage of Minor Variation MA Applications Completed Within a Specified Time Period',
    definition: 'Measures timeliness in evaluating minor variations.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Minor variation applications completed within timeline',
    denominatorDescription: 'Minor variations received',
    currentQuarter: {
      numerator: 312,
      denominator: 348,
      percentage: 89.7
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 285, denominator: 320, percentage: 89.1 } },
      { quarter: 'Q2 2024', value: { numerator: 295, denominator: 330, percentage: 89.4 } },
      { quarter: 'Q3 2024', value: { numerator: 305, denominator: 340, percentage: 89.7 } },
      { quarter: 'Q4 2024', value: { numerator: 312, denominator: 348, percentage: 89.7 } }
    ],
    timingRules: [
      'Start = screening/validation',
      'End = final decision',
      'Excludes hold time'
    ],
    harmonization: ['TMDA, EFDA, Rwanda FDA = fully harmonized', 'UNDA uses target-based denominator (minor variations planned for completion)']
  },

  // KPI 4: Percentage of Major Variation MA Applications Completed Within a Specified Time Period
  kpi4: {
    id: 'MA-KPI-4',
    title: 'Percentage of Major Variation MA Applications Completed Within a Specified Time Period',
    definition: 'Measures if major variations are completed within required timelines.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Major variations completed on time',
    denominatorDescription: 'Major variations received',
    currentQuarter: {
      numerator: 128,
      denominator: 156,
      percentage: 82.1
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 118, denominator: 145, percentage: 81.4 } },
      { quarter: 'Q2 2024', value: { numerator: 122, denominator: 150, percentage: 81.3 } },
      { quarter: 'Q3 2024', value: { numerator: 125, denominator: 153, percentage: 81.7 } },
      { quarter: 'Q4 2024', value: { numerator: 128, denominator: 156, percentage: 82.1 } }
    ],
    timingRules: [
      'Same as minor variations — measure only regulator processing times'
    ],
    harmonization: ['Harmonized across TMDA, EFDA, Rwanda FDA', 'UNDA uses planned denominator']
  },

  // KPI 5: Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period
  kpi5: {
    id: 'MA-KPI-5',
    title: 'Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period',
    definition: 'Tracks the efficiency of responding to queries, requests for additional information, and FIRs.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Queries / FIRs completed on time',
    denominatorDescription: 'Queries / FIRs received',
    currentQuarter: {
      numerator: 445,
      denominator: 512,
      percentage: 86.9
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 412, denominator: 478, percentage: 86.2 } },
      { quarter: 'Q2 2024', value: { numerator: 425, denominator: 492, percentage: 86.4 } },
      { quarter: 'Q3 2024', value: { numerator: 438, denominator: 505, percentage: 86.7 } },
      { quarter: 'Q4 2024', value: { numerator: 445, denominator: 512, percentage: 86.9 } }
    ],
    timingRules: [
      'Measured from date of applicant\'s response → date regulator marks the query/FIR as completed',
      'Applicant waiting time is excluded'
    ],
    harmonization: ['Harmonized across TMDA, EFDA, Rwanda FDA', 'UNDA uses planned denominator']
  },

  // KPI 6: Median Time Taken to Complete a New MA Application
  kpi6: {
    id: 'MA-KPI-6',
    title: 'Median Time Taken to Complete a New MA Application',
    definition: 'Measures the median number of days needed to complete new MA applications.',
    maturityLevel: 3,
    type: 'Process',
    unit: 'Days',
    reportingFrequency: 'Annually',
    formula: 'Arrange all completion times in ascending order; If odd number: median = middle value; If even: median = average of the two middle values',
    currentYear: {
      numerator: 0,
      denominator: 0,
      median: 156.0
    },
    annualData: [
      { year: '2021', value: { numerator: 0, denominator: 0, median: 172.0 } },
      { year: '2022', value: { numerator: 0, denominator: 0, median: 165.0 } },
      { year: '2023', value: { numerator: 0, denominator: 0, median: 160.0 } },
      { year: '2024', value: { numerator: 0, denominator: 0, median: 156.0 } }
    ],
    timingRules: [
      'Time measured from screening → final decision',
      'Excludes applicant hold time'
    ],
    notes: [
      'Median preferred because mean can be distorted by outliers',
      'Accepted as harmonized continental practice'
    ],
    harmonization: ['Harmonized across all four NRAs (TMDA, EFDA, Rwanda FDA, UNDA)'],
    amrhExtensions: {
      kpi6_1: {
        title: 'Median time for regional reliance pathway',
        value: { numerator: 0, denominator: 0, median: 78.0 }
      },
      kpi6_2: {
        title: 'Median time for continental reliance pathway',
        value: { numerator: 0, denominator: 0, median: 82.0 }
      }
    }
  },

  // KPI 7: Average Time Taken to Complete a New MA Application
  kpi7: {
    id: 'MA-KPI-7',
    title: 'Average Time Taken to Complete a New MA Application',
    definition: 'Measures the average time (mean) required to complete new MA applications.',
    maturityLevel: 3,
    type: 'Process',
    unit: 'Days',
    reportingFrequency: 'Annually',
    formula: 'N ÷ D',
    numeratorDescription: 'Sum of all MA application completion times',
    denominatorDescription: 'Number of new MA applications completed',
    currentYear: {
      numerator: 167520,
      denominator: 1020,
      average: 164.2
    },
    annualData: [
      { year: '2021', value: { numerator: 155400, denominator: 890, average: 174.6 } },
      { year: '2022', value: { numerator: 160200, denominator: 950, average: 168.6 } },
      { year: '2023', value: { numerator: 164500, denominator: 985, average: 167.0 } },
      { year: '2024', value: { numerator: 167520, denominator: 1020, average: 164.2 } }
    ],
    timingRules: [
      'Same as KPI 6 (screening → final decision, excluding hold time)'
    ],
    notes: [
      'NRAs comfortable using mean, but must check for outliers',
      'If too skewed, median should be preferred'
    ],
    harmonization: ['Harmonized across all four NRAs']
  },

  // KPI 8: Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines
  kpi8: {
    id: 'MA-KPI-8',
    title: 'Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines',
    definition: 'Measures transparency by tracking publication of PARs for approved medicines.',
    maturityLevel: 4,
    type: 'Output',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'PARs published within the specified timeline',
    denominatorDescription: 'Total MAs granted in the period',
    currentQuarter: {
      numerator: 178,
      denominator: 215,
      percentage: 82.8
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 165, denominator: 205, percentage: 80.5 } },
      { quarter: 'Q2 2024', value: { numerator: 170, denominator: 208, percentage: 81.7 } },
      { quarter: 'Q3 2024', value: { numerator: 174, denominator: 212, percentage: 82.1 } },
      { quarter: 'Q4 2024', value: { numerator: 178, denominator: 215, percentage: 82.8 } }
    ],
    timingRules: [
      'Time measured from final MA decision → publication date'
    ],
    specifiedTimelines: {
      efda: '60 days',
      tmda: '90 days',
      rwandaFDA: 'TBD',
      ugandaNDA: 'TBD'
    },
    harmonization: ['Harmonized across TMDA, EFDA, Rwanda FDA, UNDA', 'Rwanda & UNDA still implementing publication systems']
  }
};

