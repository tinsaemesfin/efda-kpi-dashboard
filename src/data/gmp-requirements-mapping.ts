/**
 * GMP Requirements Mapping
 * Maps KPI IDs to their requirement numbers for the requirement matching feature
 */

import type { RequirementMapping } from '@/types/requirements';

export const gmpRequirementsMapping: Record<string, RequirementMapping> = {
  // KPI 1: Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan
  'gmp-facilities-inspected': {
    kpiId: 'gmp-facilities-inspected',
    requirementId: 'GMP-KPI-1',
    category: 'GMP Inspections',
    description: 'Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan'
  },

  // KPI 2: Percentage of complaint-triggered GMP inspections conducted
  'gmp-complaint-inspections': {
    kpiId: 'gmp-complaint-inspections',
    requirementId: 'GMP-KPI-2',
    category: 'GMP Inspections',
    description: 'Percentage of complaint-triggered GMP inspections conducted'
  },

  // KPI 3: Percentage of GMP on-site inspections waived
  'gmp-inspections-waived': {
    kpiId: 'gmp-inspections-waived',
    requirementId: 'GMP-KPI-3',
    category: 'GMP Inspections',
    description: 'Percentage of GMP on-site inspections waived'
  },

  // KPI 4: Percentage of facilities compliant with GMP requirements
  'gmp-facilities-compliant': {
    kpiId: 'gmp-facilities-compliant',
    requirementId: 'GMP-KPI-4',
    category: 'GMP Inspections',
    description: 'Percentage of facilities compliant with GMP requirements'
  },

  // KPI 5: Percentage of final CAPA decisions issued within a specified timeline
  'gmp-capa-decisions': {
    kpiId: 'gmp-capa-decisions',
    requirementId: 'GMP-KPI-5',
    category: 'GMP Inspections',
    description: 'Percentage of final CAPA decisions issued within a specified timeline'
  },

  // KPI 6: Percentage of GMP inspection applications completed within the set timeline
  'gmp-applications-timeline': {
    kpiId: 'gmp-applications-timeline',
    requirementId: 'GMP-KPI-6',
    category: 'GMP Inspections',
    description: 'Percentage of GMP inspection applications completed within the set timeline'
  },

  // KPI 7: Average turnaround time to complete GMP applications
  'gmp-average-turnaround': {
    kpiId: 'gmp-average-turnaround',
    requirementId: 'GMP-KPI-7',
    category: 'GMP Inspections',
    description: 'Average turnaround time to complete GMP applications'
  },

  // KPI 8: Median turnaround time to complete GMP inspection applications
  'gmp-median-turnaround': {
    kpiId: 'gmp-median-turnaround',
    requirementId: 'GMP-KPI-8',
    category: 'GMP Inspections',
    description: 'Median turnaround time to complete GMP inspection applications'
  },

  // KPI 9: Percentage of GMP inspection reports published within a specified timeline
  'gmp-reports-published': {
    kpiId: 'gmp-reports-published',
    requirementId: 'GMP-KPI-9',
    category: 'GMP Inspections',
    description: 'Percentage of GMP inspection reports published within a specified timeline'
  }
};

// Helper function to get requirement by KPI ID
export function getGMPRequirementByKpiId(kpiId: string): RequirementMapping | undefined {
  return gmpRequirementsMapping[kpiId];
}

