// Requirement mapping types
export interface RequirementMapping {
  kpiId: string;
  requirementNumbers: string[];
  description: string;
  source: 'CT' | 'GMP' | 'MA'; // Clinical Trial, GMP, or Market Authorization
}

export interface RequirementCategory {
  category: string;
  mappings: RequirementMapping[];
}

