import { RequirementMapping } from '@/types/requirements';

// Clinical Trial Requirements Mapping - Based on Official KPI Document
export const clinicalTrialRequirements: RequirementMapping[] = [
  {
    kpiId: 'ct-kpi-1',
    requirementNumbers: ['CT-KPI-1'],
    description: '% of new clinical trial applications evaluated within a specified timeline',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-2',
    requirementNumbers: ['CT-KPI-2'],
    description: '% of clinical trial amendments evaluated within specified timelines',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-3',
    requirementNumbers: ['CT-KPI-3'],
    description: '% of approved and ongoing clinical trials inspected as per the GCP plan',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-4',
    requirementNumbers: ['CT-KPI-4'],
    description: '% of field and safety reports assessed within a specified timeline',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-5',
    requirementNumbers: ['CT-KPI-5'],
    description: '% of clinical trials compliant with GCP requirements',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-6',
    requirementNumbers: ['CT-KPI-6'],
    description: '% of approved clinical trials listed in national registry',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-7',
    requirementNumbers: ['CT-KPI-7'],
    description: '% of CAPA (Corrective and Preventive Actions) evaluated within specified timeline',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-8',
    requirementNumbers: ['CT-KPI-8'],
    description: 'Average turnaround time to complete evaluation of CT applications',
    source: 'CT'
  },
  // Supplemental KPIs for Ethiopia FDA
  {
    kpiId: 'ct-kpi-2-1',
    requirementNumbers: ['CT-KPI-2.1'],
    description: '% of received amendments of CTs evaluated (EFDA Supplemental)',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-3-1',
    requirementNumbers: ['CT-KPI-3.1'],
    description: '% of regulatory measures taken due to GCP findings and safety concerns (EFDA Supplemental)',
    source: 'CT'
  },
  {
    kpiId: 'ct-kpi-4-1',
    requirementNumbers: ['CT-KPI-4.1'],
    description: '% of received safety reports assessed (EFDA Supplemental)',
    source: 'CT'
  }
];

// Helper function to get requirement by KPI ID
export function getCTRequirementByKpiId(kpiId: string): RequirementMapping | undefined {
  return clinicalTrialRequirements.find(req => req.kpiId === kpiId);
}

