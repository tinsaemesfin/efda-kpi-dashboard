// Requirement mapping types
export interface RequirementMapping {
  kpiId: string;
  requirementId: string;  // Single requirement ID (e.g., 'CT-KPI-1', 'GMP-KPI-1', 'MA-KPI-1')
  category: string;
  description: string;
}

export type KpiCategory = 'CT' | 'GMP' | 'MA';

