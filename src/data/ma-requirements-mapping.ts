/**
 * Marketing Authorization Requirements Mapping
 * Maps KPI IDs to their requirement numbers for the requirement matching feature
 */

import type { RequirementMapping } from '@/types/requirements';

export const maRequirementsMapping: Record<string, RequirementMapping> = {
  // KPI 1: Percentage of New MA Applications Completed Within a Specified Time Period
  'ma-new-applications': {
    kpiId: 'ma-new-applications',
    requirementId: 'MA-KPI-1',
    category: 'Market Authorizations',
    description: 'Percentage of New MA Applications Completed Within a Specified Time Period'
  },
  'ma-new-applications-num': {
    kpiId: 'ma-new-applications-num',
    requirementId: 'MA-KPI-1-NUM',
    category: 'Market Authorizations',
    description: 'Number of new MA applications completed within the specified timeline'
  },
  'ma-new-applications-den': {
    kpiId: 'ma-new-applications-den',
    requirementId: 'MA-KPI-1-DEN',
    category: 'Market Authorizations',
    description: 'Total number of new MA applications received'
  },

  // KPI 1.1 & 1.2 (AMRH Extensions)
  'ma-regional-reliance': {
    kpiId: 'ma-regional-reliance',
    requirementId: 'MA-KPI-1.1',
    category: 'Market Authorizations',
    description: 'Regional reliance positive outcomes within 90 working days'
  },
  'ma-continental-reliance': {
    kpiId: 'ma-continental-reliance',
    requirementId: 'MA-KPI-1.2',
    category: 'Market Authorizations',
    description: 'Continental reliance positive outcomes within 90 working days'
  },

  // KPI 2: Percentage of Renewal MA Applications Completed Within a Specified Time Period
  'ma-renewal-applications': {
    kpiId: 'ma-renewal-applications',
    requirementId: 'MA-KPI-2',
    category: 'Market Authorizations',
    description: 'Percentage of Renewal MA Applications Completed Within a Specified Time Period'
  },
  'ma-renewal-applications-num': {
    kpiId: 'ma-renewal-applications-num',
    requirementId: 'MA-KPI-2-NUM',
    category: 'Market Authorizations',
    description: 'Renewal MA applications completed within timeline'
  },
  'ma-renewal-applications-den': {
    kpiId: 'ma-renewal-applications-den',
    requirementId: 'MA-KPI-2-DEN',
    category: 'Market Authorizations',
    description: 'Renewal MA applications received'
  },

  // KPI 3: Percentage of Minor Variation MA Applications Completed Within a Specified Time Period
  'ma-minor-variations': {
    kpiId: 'ma-minor-variations',
    requirementId: 'MA-KPI-3',
    category: 'Market Authorizations',
    description: 'Percentage of Minor Variation MA Applications Completed Within a Specified Time Period'
  },
  'ma-minor-variations-num': {
    kpiId: 'ma-minor-variations-num',
    requirementId: 'MA-KPI-3-NUM',
    category: 'Market Authorizations',
    description: 'Minor variation applications completed within timeline'
  },
  'ma-minor-variations-den': {
    kpiId: 'ma-minor-variations-den',
    requirementId: 'MA-KPI-3-DEN',
    category: 'Market Authorizations',
    description: 'Minor variations received'
  },

  // KPI 4: Percentage of Major Variation MA Applications Completed Within a Specified Time Period
  'ma-major-variations': {
    kpiId: 'ma-major-variations',
    requirementId: 'MA-KPI-4',
    category: 'Market Authorizations',
    description: 'Percentage of Major Variation MA Applications Completed Within a Specified Time Period'
  },
  'ma-major-variations-num': {
    kpiId: 'ma-major-variations-num',
    requirementId: 'MA-KPI-4-NUM',
    category: 'Market Authorizations',
    description: 'Major variations completed on time'
  },
  'ma-major-variations-den': {
    kpiId: 'ma-major-variations-den',
    requirementId: 'MA-KPI-4-DEN',
    category: 'Market Authorizations',
    description: 'Major variations received'
  },

  // KPI 5: Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period
  'ma-queries-firs': {
    kpiId: 'ma-queries-firs',
    requirementId: 'MA-KPI-5',
    category: 'Market Authorizations',
    description: 'Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period'
  },
  'ma-queries-firs-num': {
    kpiId: 'ma-queries-firs-num',
    requirementId: 'MA-KPI-5-NUM',
    category: 'Market Authorizations',
    description: 'Queries / FIRs completed on time'
  },
  'ma-queries-firs-den': {
    kpiId: 'ma-queries-firs-den',
    requirementId: 'MA-KPI-5-DEN',
    category: 'Market Authorizations',
    description: 'Queries / FIRs received'
  },

  // KPI 6: Median Time Taken to Complete a New MA Application
  'ma-median-time': {
    kpiId: 'ma-median-time',
    requirementId: 'MA-KPI-6',
    category: 'Market Authorizations',
    description: 'Median Time Taken to Complete a New MA Application'
  },

  // KPI 6.1 & 6.2 (AMRH Extensions)
  'ma-median-regional': {
    kpiId: 'ma-median-regional',
    requirementId: 'MA-KPI-6.1',
    category: 'Market Authorizations',
    description: 'Median time for regional reliance pathway'
  },
  'ma-median-continental': {
    kpiId: 'ma-median-continental',
    requirementId: 'MA-KPI-6.2',
    category: 'Market Authorizations',
    description: 'Median time for continental reliance pathway'
  },

  // KPI 7: Average Time Taken to Complete a New MA Application
  'ma-average-time': {
    kpiId: 'ma-average-time',
    requirementId: 'MA-KPI-7',
    category: 'Market Authorizations',
    description: 'Average Time Taken to Complete a New MA Application'
  },
  'ma-average-time-num': {
    kpiId: 'ma-average-time-num',
    requirementId: 'MA-KPI-7-NUM',
    category: 'Market Authorizations',
    description: 'Sum of all MA application completion times'
  },
  'ma-average-time-den': {
    kpiId: 'ma-average-time-den',
    requirementId: 'MA-KPI-7-DEN',
    category: 'Market Authorizations',
    description: 'Number of new MA applications completed'
  },

  // KPI 8: Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines
  'ma-pars-published': {
    kpiId: 'ma-pars-published',
    requirementId: 'MA-KPI-8',
    category: 'Market Authorizations',
    description: 'Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines'
  },
  'ma-pars-published-num': {
    kpiId: 'ma-pars-published-num',
    requirementId: 'MA-KPI-8-NUM',
    category: 'Market Authorizations',
    description: 'PARs published within the specified timeline'
  },
  'ma-pars-published-den': {
    kpiId: 'ma-pars-published-den',
    requirementId: 'MA-KPI-8-DEN',
    category: 'Market Authorizations',
    description: 'Total MAs granted in the period'
  }
};

// Helper function to get requirement by KPI ID
export function getMARequirementByKpiId(kpiId: string): RequirementMapping | undefined {
  return maRequirementsMapping[kpiId];
}

