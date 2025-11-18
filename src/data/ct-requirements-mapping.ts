/**
 * Clinical Trial Requirements Mapping
 * Maps KPI IDs to their requirement numbers for the requirement matching feature
 */

import type { RequirementMapping } from '@/types/requirements';

export const ctRequirementsMapping: Record<string, RequirementMapping> = {
  // KPI 1: Percentage of new clinical trial applications evaluated within a specified timeline
  'ct-kpi-1': {
    kpiId: 'ct-kpi-1',
    requirementId: 'CT-KPI-1',
    category: 'Clinical Trials',
    description: '% of new clinical trial applications evaluated within a specified timeline'
  },
  'ct-kpi-1-num': {
    kpiId: 'ct-kpi-1-num',
    requirementId: 'CT-KPI-1-NUM',
    category: 'Clinical Trials',
    description: 'Number of new CT applications evaluated within timeline'
  },
  'ct-kpi-1-den': {
    kpiId: 'ct-kpi-1-den',
    requirementId: 'CT-KPI-1-DEN',
    category: 'Clinical Trials',
    description: 'Total number of new clinical trial applications received'
  },

  // KPI 2: Percentage of clinical trial amendments evaluated within specified timelines
  'ct-kpi-2': {
    kpiId: 'ct-kpi-2',
    requirementId: 'CT-KPI-2',
    category: 'Clinical Trials',
    description: '% of clinical trial amendments evaluated within specified timelines'
  },
  'ct-kpi-2-num': {
    kpiId: 'ct-kpi-2-num',
    requirementId: 'CT-KPI-2-NUM',
    category: 'Clinical Trials',
    description: 'Number of CT amendments evaluated within timeline'
  },
  'ct-kpi-2-den': {
    kpiId: 'ct-kpi-2-den',
    requirementId: 'CT-KPI-2-DEN',
    category: 'Clinical Trials',
    description: 'Total CT amendments received'
  },

  // KPI 3: Percentage of approved and ongoing clinical trials inspected as per the GCP plan
  'ct-kpi-3': {
    kpiId: 'ct-kpi-3',
    requirementId: 'CT-KPI-3',
    category: 'Clinical Trials',
    description: '% of approved and ongoing clinical trials inspected as per the GCP plan'
  },
  'ct-kpi-3-num': {
    kpiId: 'ct-kpi-3-num',
    requirementId: 'CT-KPI-3-NUM',
    category: 'Clinical Trials',
    description: 'Number of approved & ongoing CTs inspected'
  },
  'ct-kpi-3-den': {
    kpiId: 'ct-kpi-3-den',
    requirementId: 'CT-KPI-3-DEN',
    category: 'Clinical Trials',
    description: 'Total approved & ongoing CTs scheduled for GCP inspection'
  },

  // KPI 4: Percentage of field and safety reports assessed within a specified timeline
  'ct-kpi-4': {
    kpiId: 'ct-kpi-4',
    requirementId: 'CT-KPI-4',
    category: 'Clinical Trials',
    description: '% of field and safety reports assessed within a specified timeline'
  },
  'ct-kpi-4-num': {
    kpiId: 'ct-kpi-4-num',
    requirementId: 'CT-KPI-4-NUM',
    category: 'Clinical Trials',
    description: 'Number of field & safety reports assessed within timeline'
  },
  'ct-kpi-4-den': {
    kpiId: 'ct-kpi-4-den',
    requirementId: 'CT-KPI-4-DEN',
    category: 'Clinical Trials',
    description: 'Total field & safety reports received'
  },

  // KPI 5: Percentage of clinical trials compliant with GCP requirements
  'ct-kpi-5': {
    kpiId: 'ct-kpi-5',
    requirementId: 'CT-KPI-5',
    category: 'Clinical Trials',
    description: '% of clinical trials compliant with GCP requirements'
  },
  'ct-kpi-5-num': {
    kpiId: 'ct-kpi-5-num',
    requirementId: 'CT-KPI-5-NUM',
    category: 'Clinical Trials',
    description: 'Number of clinical trials compliant with GCP'
  },
  'ct-kpi-5-den': {
    kpiId: 'ct-kpi-5-den',
    requirementId: 'CT-KPI-5-DEN',
    category: 'Clinical Trials',
    description: 'Total number of CTs inspected'
  },

  // KPI 6: Percentage of approved clinical trials listed in national registry
  'ct-kpi-6': {
    kpiId: 'ct-kpi-6',
    requirementId: 'CT-KPI-6',
    category: 'Clinical Trials',
    description: '% of approved clinical trials listed in national registry'
  },
  'ct-kpi-6-num': {
    kpiId: 'ct-kpi-6-num',
    requirementId: 'CT-KPI-6-NUM',
    category: 'Clinical Trials',
    description: 'Number of approved CTs submitted for registry publication'
  },
  'ct-kpi-6-den': {
    kpiId: 'ct-kpi-6-den',
    requirementId: 'CT-KPI-6-DEN',
    category: 'Clinical Trials',
    description: 'Total approved CTs'
  },

  // KPI 7: Percentage of CAPA evaluated within specified timeline
  'ct-kpi-7': {
    kpiId: 'ct-kpi-7',
    requirementId: 'CT-KPI-7',
    category: 'Clinical Trials',
    description: '% of CAPA (Corrective and Preventive Actions) evaluated within specified timeline'
  },
  'ct-kpi-7-num': {
    kpiId: 'ct-kpi-7-num',
    requirementId: 'CT-KPI-7-NUM',
    category: 'Clinical Trials',
    description: 'Number of CAPA evaluated within timeline'
  },
  'ct-kpi-7-den': {
    kpiId: 'ct-kpi-7-den',
    requirementId: 'CT-KPI-7-DEN',
    category: 'Clinical Trials',
    description: 'Total CAPA received'
  },

  // KPI 8: Average turnaround time to complete evaluation of CT applications
  'ct-kpi-8': {
    kpiId: 'ct-kpi-8',
    requirementId: 'CT-KPI-8',
    category: 'Clinical Trials',
    description: 'Average turnaround time to complete evaluation of CT applications'
  },
  'ct-kpi-8-num': {
    kpiId: 'ct-kpi-8-num',
    requirementId: 'CT-KPI-8-NUM',
    category: 'Clinical Trials',
    description: 'Sum of evaluation times for each application'
  },
  'ct-kpi-8-den': {
    kpiId: 'ct-kpi-8-den',
    requirementId: 'CT-KPI-8-DEN',
    category: 'Clinical Trials',
    description: 'Total number of evaluated applications'
  },

  // Supplemental KPIs for Ethiopia FDA
  'ct-supp-2-1': {
    kpiId: 'ct-supp-2-1',
    requirementId: 'CT-SUPP-2.1',
    category: 'Clinical Trials',
    description: '% of received amendments of CTs evaluated'
  },
  'ct-supp-2-1-num': {
    kpiId: 'ct-supp-2-1-num',
    requirementId: 'CT-SUPP-2.1-NUM',
    category: 'Clinical Trials',
    description: 'Number of received amendments of CTs evaluated'
  },
  'ct-supp-2-1-den': {
    kpiId: 'ct-supp-2-1-den',
    requirementId: 'CT-SUPP-2.1-DEN',
    category: 'Clinical Trials',
    description: 'Total amendments received'
  },

  'ct-supp-3-1': {
    kpiId: 'ct-supp-3-1',
    requirementId: 'CT-SUPP-3.1',
    category: 'Clinical Trials',
    description: '% of regulatory measures taken due to GCP findings and safety concerns'
  },
  'ct-supp-3-1-num': {
    kpiId: 'ct-supp-3-1-num',
    requirementId: 'CT-SUPP-3.1-NUM',
    category: 'Clinical Trials',
    description: 'Number of regulatory measures taken'
  },
  'ct-supp-3-1-den': {
    kpiId: 'ct-supp-3-1-den',
    requirementId: 'CT-SUPP-3.1-DEN',
    category: 'Clinical Trials',
    description: 'Total clinical trials conducted'
  },

  'ct-supp-4-1': {
    kpiId: 'ct-supp-4-1',
    requirementId: 'CT-SUPP-4.1',
    category: 'Clinical Trials',
    description: '% of received safety reports assessed'
  },
  'ct-supp-4-1-num': {
    kpiId: 'ct-supp-4-1-num',
    requirementId: 'CT-SUPP-4.1-NUM',
    category: 'Clinical Trials',
    description: 'Number of received safety reports assessed'
  },
  'ct-supp-4-1-den': {
    kpiId: 'ct-supp-4-1-den',
    requirementId: 'CT-SUPP-4.1-DEN',
    category: 'Clinical Trials',
    description: 'Total received safety reports'
  }
};

// Helper function to get requirement by KPI ID
export function getCTRequirementByKpiId(kpiId: string): RequirementMapping | undefined {
  return ctRequirementsMapping[kpiId];
}
