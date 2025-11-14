import { RequirementMapping } from '@/types/requirements';

// Clinical Trial Requirements Mapping
export const clinicalTrialRequirements: RequirementMapping[] = [
  {
    kpiId: 'ct-total-applications',
    requirementNumbers: ['CT-KPI-01', 'CT-KPI-02'],
    description: 'Total number of clinical trial applications received',
    source: 'CT'
  },
  {
    kpiId: 'ct-pending-applications',
    requirementNumbers: ['CT-KPI-03'],
    description: 'Applications currently under review',
    source: 'CT'
  },
  {
    kpiId: 'ct-approved-applications',
    requirementNumbers: ['CT-KPI-04', 'CT-KPI-05'],
    description: 'Approved clinical trial applications and approval rate',
    source: 'CT'
  },
  {
    kpiId: 'ct-rejected-applications',
    requirementNumbers: ['CT-KPI-06'],
    description: 'Rejected applications and rejection rate',
    source: 'CT'
  },
  {
    kpiId: 'ct-avg-processing-time',
    requirementNumbers: ['CT-KPI-07', 'CT-KPI-08'],
    description: 'Average processing time for clinical trial applications',
    source: 'CT'
  },
  {
    kpiId: 'ct-median-processing-time',
    requirementNumbers: ['CT-KPI-09'],
    description: 'Median processing time (50th percentile)',
    source: 'CT'
  },
  {
    kpiId: 'ct-target-achievement',
    requirementNumbers: ['CT-KPI-10'],
    description: 'Performance against processing time targets',
    source: 'CT'
  },
  {
    kpiId: 'ct-compliance-rate',
    requirementNumbers: ['CT-KPI-11', 'CT-KPI-12'],
    description: 'Protocol compliance and adherence rate',
    source: 'CT'
  },
  {
    kpiId: 'ct-protocol-deviations',
    requirementNumbers: ['CT-KPI-13'],
    description: 'Number of protocol deviations reported',
    source: 'CT'
  },
  {
    kpiId: 'ct-adverse-events',
    requirementNumbers: ['CT-KPI-14', 'CT-KPI-15'],
    description: 'Adverse events reported and monitored',
    source: 'CT'
  }
];

// GMP Inspection Requirements Mapping
export const gmpInspectionRequirements: RequirementMapping[] = [
  {
    kpiId: 'gmp-total-inspections',
    requirementNumbers: ['GMP-KPI-01', 'GMP-KPI-02'],
    description: 'Total number of GMP inspections conducted',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-completed-inspections',
    requirementNumbers: ['GMP-KPI-03'],
    description: 'Completed inspections vs planned',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-pending-inspections',
    requirementNumbers: ['GMP-KPI-04'],
    description: 'Scheduled or in-progress inspections',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-planned-inspections',
    requirementNumbers: ['GMP-KPI-05'],
    description: 'Annual inspection targets',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-compliant-facilities',
    requirementNumbers: ['GMP-KPI-06', 'GMP-KPI-07'],
    description: 'Facilities meeting GMP standards',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-non-compliant-facilities',
    requirementNumbers: ['GMP-KPI-08'],
    description: 'Facilities requiring corrective action',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-critical-findings',
    requirementNumbers: ['GMP-KPI-09', 'GMP-KPI-10'],
    description: 'Critical findings requiring immediate action',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-reinspection-rate',
    requirementNumbers: ['GMP-KPI-11'],
    description: 'Rate of follow-up inspections',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-major-findings',
    requirementNumbers: ['GMP-KPI-12'],
    description: 'Major deviations identified',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-minor-findings',
    requirementNumbers: ['GMP-KPI-13'],
    description: 'Minor deviations identified',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-certificates-issued',
    requirementNumbers: ['GMP-KPI-14', 'GMP-KPI-15'],
    description: 'Valid GMP certificates issued',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-certificates-expiring',
    requirementNumbers: ['GMP-KPI-16'],
    description: 'Certificates expiring in next 90 days',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-certificates-revoked',
    requirementNumbers: ['GMP-KPI-17'],
    description: 'Certificates revoked due to non-compliance',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-avg-duration',
    requirementNumbers: ['GMP-KPI-18'],
    description: 'Average inspection duration',
    source: 'GMP'
  },
  {
    kpiId: 'gmp-compliance-rate',
    requirementNumbers: ['GMP-KPI-19', 'GMP-KPI-20'],
    description: 'Overall facility compliance rate',
    source: 'GMP'
  }
];

// Market Authorization Requirements Mapping
export const marketAuthorizationRequirements: RequirementMapping[] = [
  {
    kpiId: 'ma-total-applications',
    requirementNumbers: ['MA-KPI-01', 'MA-KPI-02'],
    description: 'Total market authorization applications',
    source: 'MA'
  },
  {
    kpiId: 'ma-pending-applications',
    requirementNumbers: ['MA-KPI-03'],
    description: 'Applications currently under review',
    source: 'MA'
  },
  {
    kpiId: 'ma-approved-applications',
    requirementNumbers: ['MA-KPI-04', 'MA-KPI-05'],
    description: 'Approved applications and approval rate',
    source: 'MA'
  },
  {
    kpiId: 'ma-rejected-applications',
    requirementNumbers: ['MA-KPI-06'],
    description: 'Rejected applications and rejection rate',
    source: 'MA'
  },
  {
    kpiId: 'ma-avg-review-time',
    requirementNumbers: ['MA-KPI-07', 'MA-KPI-08'],
    description: 'Average review time for applications',
    source: 'MA'
  },
  {
    kpiId: 'ma-median-review-time',
    requirementNumbers: ['MA-KPI-09'],
    description: 'Median review time (50th percentile)',
    source: 'MA'
  },
  {
    kpiId: 'ma-target-achievement',
    requirementNumbers: ['MA-KPI-10'],
    description: 'Performance against review time targets',
    source: 'MA'
  },
  {
    kpiId: 'ma-new-drug-applications',
    requirementNumbers: ['MA-KPI-11'],
    description: 'New drug applications received',
    source: 'MA'
  },
  {
    kpiId: 'ma-generic-applications',
    requirementNumbers: ['MA-KPI-12'],
    description: 'Generic drug applications',
    source: 'MA'
  },
  {
    kpiId: 'ma-biosimilar-applications',
    requirementNumbers: ['MA-KPI-13'],
    description: 'Biosimilar applications',
    source: 'MA'
  },
  {
    kpiId: 'ma-withdrawn-applications',
    requirementNumbers: ['MA-KPI-14'],
    description: 'Voluntarily withdrawn applications',
    source: 'MA'
  },
  {
    kpiId: 'ma-priority-reviews',
    requirementNumbers: ['MA-KPI-15'],
    description: 'Priority review track applications',
    source: 'MA'
  },
  {
    kpiId: 'ma-standard-reviews',
    requirementNumbers: ['MA-KPI-16'],
    description: 'Standard review process applications',
    source: 'MA'
  },
  {
    kpiId: 'ma-first-cycle-approval',
    requirementNumbers: ['MA-KPI-17', 'MA-KPI-18'],
    description: 'First cycle approval rate',
    source: 'MA'
  },
  {
    kpiId: 'ma-orphan-drug',
    requirementNumbers: ['MA-KPI-19'],
    description: 'Orphan drug designations for rare diseases',
    source: 'MA'
  }
];

// Helper function to get requirement by KPI ID
export function getRequirementByKpiId(kpiId: string, category: 'CT' | 'GMP' | 'MA'): RequirementMapping | undefined {
  const mappings = {
    CT: clinicalTrialRequirements,
    GMP: gmpInspectionRequirements,
    MA: marketAuthorizationRequirements
  };
  
  return mappings[category].find(req => req.kpiId === kpiId);
}

