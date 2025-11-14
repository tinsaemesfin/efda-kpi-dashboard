/**
 * GMP KPI Dummy Data
 * Realistic data for all 9 GMP KPIs based on official requirements
 */

import type { GMPKPIData } from '@/types/gmp-kpi';

export const gmpKPIData: GMPKPIData = {
  // KPI 1: Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan
  kpi1: {
    id: 'GMP-KPI-1',
    title: 'Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan',
    definition: 'Measures how well the regulator executes its annual/quarterly GMP inspection plan.',
    maturityLevel: 3,
    type: 'Output',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Number of pharmaceutical manufacturing facilities inspected as per the plan',
    denominatorDescription: 'Total number of facilities planned for inspection',
    currentQuarter: {
      numerator: 156,
      denominator: 180,
      percentage: 86.7
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 142, denominator: 165, percentage: 86.1 } },
      { quarter: 'Q2 2024', value: { numerator: 148, denominator: 170, percentage: 87.1 } },
      { quarter: 'Q3 2024', value: { numerator: 153, denominator: 175, percentage: 87.4 } },
      { quarter: 'Q4 2024', value: { numerator: 156, denominator: 180, percentage: 86.7 } }
    ],
    disaggregations: {
      onsiteDomestic: { label: 'On-site domestic inspections', value: 128, percentage: 82.1 },
      onsiteForeign: { label: 'On-site foreign inspections', value: 18, percentage: 11.5 },
      jointOnsiteForeign: { label: 'Joint on-site foreign inspections', value: 10, percentage: 6.4 }
    },
    notes: [
      'Remote/desk-based reviews are not counted here (they fall under KPI 3)',
      'EFDA and TMDA plan to inspect all domestic facilities annually'
    ],
    harmonization: ['Harmonized for TMDA, EFDA, Rwanda FDA', 'Uganda NDA IRIMS does not support planning yet (future inclusion)']
  },

  // KPI 2: Percentage of complaint-triggered GMP inspections conducted
  kpi2: {
    id: 'GMP-KPI-2',
    title: 'Percentage of complaint-triggered GMP inspections conducted',
    definition: 'Measures responsiveness to complaints requiring GMP investigations.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Number of complaint-triggered GMP inspections conducted',
    denominatorDescription: 'Total number of complaints requiring GMP inspection',
    currentQuarter: {
      numerator: 34,
      denominator: 42,
      percentage: 81.0
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 28, denominator: 35, percentage: 80.0 } },
      { quarter: 'Q2 2024', value: { numerator: 31, denominator: 38, percentage: 81.6 } },
      { quarter: 'Q3 2024', value: { numerator: 32, denominator: 40, percentage: 80.0 } },
      { quarter: 'Q4 2024', value: { numerator: 34, denominator: 42, percentage: 81.0 } }
    ],
    disaggregations: {
      domestic: { label: 'Domestic inspections', value: 29, percentage: 85.3 },
      foreign: { label: 'Foreign inspections (any mode)', value: 5, percentage: 14.7 }
    },
    notes: [
      'Ad-hoc indicator; cannot be planned in advance',
      'Important for public confidence'
    ],
    harmonization: ['TMDA, EFDA, Rwanda FDA — aligned', 'Uganda NDA — will not report']
  },

  // KPI 3: Percentage of GMP on-site inspections waived
  kpi3: {
    id: 'GMP-KPI-3',
    title: 'Percentage of GMP on-site inspections waived',
    definition: 'Measures the use of risk-based and reliance mechanisms to waive on-site inspections.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Facilities where on-site inspection was waived (remote/desk review done instead)',
    denominatorDescription: 'Total GMP inspections completed (physical or remote)',
    currentQuarter: {
      numerator: 45,
      denominator: 198,
      percentage: 22.7
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 38, denominator: 185, percentage: 20.5 } },
      { quarter: 'Q2 2024', value: { numerator: 41, denominator: 190, percentage: 21.6 } },
      { quarter: 'Q3 2024', value: { numerator: 43, denominator: 195, percentage: 22.1 } },
      { quarter: 'Q4 2024', value: { numerator: 45, denominator: 198, percentage: 22.7 } }
    ],
    notes: [
      'An inspection is "completed" when an official decision is communicated',
      'Only remote/desk inspections are counted in numerator'
    ],
    harmonization: ['Fully harmonized across TMDA, EFDA, Rwanda FDA, Uganda NDA']
  },

  // KPI 4: Percentage of facilities compliant with GMP requirements
  kpi4: {
    id: 'GMP-KPI-4',
    title: 'Percentage of facilities compliant with GMP requirements',
    definition: 'Measures extent of GMP compliance across inspected facilities.',
    maturityLevel: 3,
    type: 'Outcome',
    unit: '%',
    reportingFrequency: 'Annual',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Number of facilities compliant with GMP requirements',
    denominatorDescription: 'Total number of facilities inspected',
    currentYear: {
      numerator: 542,
      denominator: 618,
      percentage: 87.7
    },
    annualData: [
      { year: '2021', value: { numerator: 478, denominator: 562, percentage: 85.1 } },
      { year: '2022', value: { numerator: 512, denominator: 589, percentage: 86.9 } },
      { year: '2023', value: { numerator: 528, denominator: 605, percentage: 87.3 } },
      { year: '2024', value: { numerator: 542, denominator: 618, percentage: 87.7 } }
    ],
    disaggregations: {
      onsiteDomestic: { label: 'On-site domestic', value: 445, percentage: 82.1 },
      onsiteForeign: { label: 'On-site foreign', value: 62, percentage: 11.4 },
      jointOnsiteForeign: { label: 'Joint on-site foreign', value: 19, percentage: 3.5 },
      remoteDeskBased: { label: 'Remote/desk-based inspections', value: 16, percentage: 3.0 }
    },
    harmonization: ['Harmonized across TMDA, EFDA, Rwanda FDA, Uganda NDA']
  },

  // KPI 5: Percentage of final CAPA decisions issued within a specified timeline
  kpi5: {
    id: 'GMP-KPI-5',
    title: 'Percentage of final CAPA decisions issued within a specified timeline',
    definition: 'Measures efficiency in evaluating and concluding CAPA responses from manufacturers.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Final CAPA decisions issued within timeline',
    denominatorDescription: 'Total CAPA responses received',
    currentQuarter: {
      numerator: 89,
      denominator: 104,
      percentage: 85.6
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 78, denominator: 95, percentage: 82.1 } },
      { quarter: 'Q2 2024', value: { numerator: 82, denominator: 98, percentage: 83.7 } },
      { quarter: 'Q3 2024', value: { numerator: 86, denominator: 101, percentage: 85.1 } },
      { quarter: 'Q4 2024', value: { numerator: 89, denominator: 104, percentage: 85.6 } }
    ],
    disaggregations: {
      directInspections: { label: 'Direct inspections (domestic + foreign)', value: 76, percentage: 85.4 },
      jointInspections: { label: 'Joint inspections (reliance, REC-led)', value: 13, percentage: 14.6 }
    },
    notes: [
      '"Waiting time" for applicants is excluded',
      'Requires integration with EAC systems for reliance reporting'
    ],
    harmonization: ['Fully harmonized across all four NRAs']
  },

  // KPI 6: Percentage of GMP inspection applications completed within the set timeline
  kpi6: {
    id: 'GMP-KPI-6',
    title: 'Percentage of GMP inspection applications completed within the set timeline',
    definition: 'Measures efficiency of processing GMP applications end-to-end.',
    maturityLevel: 3,
    type: 'Process',
    unit: '%',
    reportingFrequency: 'Quarterly',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Applications completed within NRA SLA timeline',
    denominatorDescription: 'Total GMP inspection applications received',
    currentQuarter: {
      numerator: 168,
      denominator: 195,
      percentage: 86.2
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 155, denominator: 182, percentage: 85.2 } },
      { quarter: 'Q2 2024', value: { numerator: 160, denominator: 187, percentage: 85.6 } },
      { quarter: 'Q3 2024', value: { numerator: 164, denominator: 191, percentage: 85.9 } },
      { quarter: 'Q4 2024', value: { numerator: 168, denominator: 195, percentage: 86.2 } }
    ],
    disaggregations: {
      domestic: { label: 'Domestic applicants', value: 138, percentage: 82.1 },
      foreignDirect: { label: 'Foreign (direct review)', value: 20, percentage: 11.9 },
      foreignReliance: { label: 'Foreign (reliance-based review)', value: 10, percentage: 6.0 }
    },
    stopClockRules: [
      'Clock starts after payment',
      'TMDA, EFDA, UNDA: payment after screening',
      'Rwanda FDA: payment before screening',
      'Clock stops when final decision issued'
    ],
    harmonization: ['Harmonized across all NRAs']
  },

  // KPI 7: Average turnaround time to complete GMP applications
  kpi7: {
    id: 'GMP-KPI-7',
    title: 'Average turnaround time to complete GMP applications',
    definition: 'Average number of days NRAs take to complete GMP inspection applications.',
    maturityLevel: 3,
    type: 'Process',
    unit: 'Days',
    reportingFrequency: 'Quarterly',
    formula: 'N ÷ D',
    numeratorDescription: 'Sum of processing days for all applications completed',
    denominatorDescription: 'Number of applications completed',
    currentQuarter: {
      numerator: 10875,
      denominator: 168,
      average: 64.7
    },
    quarterlyData: [
      { quarter: 'Q1 2024', value: { numerator: 10695, denominator: 155, average: 69.0 } },
      { quarter: 'Q2 2024', value: { numerator: 10720, denominator: 160, average: 67.0 } },
      { quarter: 'Q3 2024', value: { numerator: 10824, denominator: 164, average: 66.0 } },
      { quarter: 'Q4 2024', value: { numerator: 10875, denominator: 168, average: 64.7 } }
    ],
    disaggregations: {
      onsiteDomestic: { label: 'On-site domestic', value: 62.5 },
      onsiteForeign: { label: 'On-site foreign', value: 71.3 },
      jointOnsiteForeign: { label: 'Joint on-site foreign', value: 68.9 }
    },
    notes: [
      'Applicant waiting time is excluded',
      '"First decision" counts (compliant / non-compliant / CAPA required)',
      'EFDA additionally measures document review for reference authority waivers'
    ],
    harmonization: ['Harmonized across TMDA, EFDA, Rwanda FDA, Uganda NDA']
  },

  // KPI 8: Median turnaround time to complete GMP inspection applications
  kpi8: {
    id: 'GMP-KPI-8',
    title: 'Median turnaround time to complete GMP inspection applications',
    definition: 'Median number of days required to process GMP inspections.',
    maturityLevel: 3,
    type: 'Process',
    unit: 'Days',
    reportingFrequency: 'Annual',
    formula: 'Arrange all completion times in order; If odd: median is middle value; If even: median is average of two middle values',
    currentYear: {
      numerator: 0,
      denominator: 0,
      median: 58.0
    },
    annualData: [
      { year: '2021', value: { numerator: 0, denominator: 0, median: 65.0 } },
      { year: '2022', value: { numerator: 0, denominator: 0, median: 62.0 } },
      { year: '2023', value: { numerator: 0, denominator: 0, median: 60.0 } },
      { year: '2024', value: { numerator: 0, denominator: 0, median: 58.0 } }
    ],
    notes: [
      'Measured from payment to first decision (excluding applicant time)',
      'Can be reported manually until systems improve'
    ],
    harmonization: ['Harmonized for TMDA, Rwanda FDA', 'EFDA and UNDA will adopt later']
  },

  // KPI 9: Percentage of GMP inspection reports published within a specified timeline
  kpi9: {
    id: 'GMP-KPI-9',
    title: 'Percentage of GMP inspection reports published within a specified timeline',
    definition: 'Tracks transparency and timely publication of GMP inspection outcomes.',
    maturityLevel: 4,
    type: 'Output',
    unit: '%',
    reportingFrequency: 'Annual',
    formula: '(N ÷ D) × 100',
    numeratorDescription: 'Inspection reports published within timeline',
    denominatorDescription: 'Total inspections completed',
    currentYear: {
      numerator: 512,
      denominator: 618,
      percentage: 82.8
    },
    annualData: [
      { year: '2021', value: { numerator: 445, denominator: 562, percentage: 79.2 } },
      { year: '2022', value: { numerator: 472, denominator: 589, percentage: 80.1 } },
      { year: '2023', value: { numerator: 495, denominator: 605, percentage: 81.8 } },
      { year: '2024', value: { numerator: 512, denominator: 618, percentage: 82.8 } }
    ],
    disaggregations: {
      onsiteDomestic: { label: 'On-site domestic', value: 425, percentage: 83.0 },
      onsiteForeign: { label: 'On-site foreign', value: 52, percentage: 10.2 },
      jointInspections: { label: 'Joint inspections', value: 21, percentage: 4.1 },
      remoteDeskBased: { label: 'Remote/desk-based', value: 14, percentage: 2.7 }
    },
    notes: [
      'TMDA publishes only reports deemed "public interest" according to internal criteria',
      'UNDA requires SOP development to manage confidentiality and publication',
      'EFDA also includes document review results for reliance-based waivers'
    ],
    harmonization: ['Harmonized for TMDA, EFDA, Rwanda FDA', 'Uganda NDA — future adoption']
  }
};

