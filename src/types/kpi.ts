// Common KPI Types
export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  category: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  target?: number;
  label?: string;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

// Clinical Trial KPIs
export interface ClinicalTrialKPI {
  // Application Metrics
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  
  // Timeline Metrics
  averageProcessingTime: number; // in days
  targetProcessingTime: number; // in days
  mediaanProcessingTime: number;
  
  // Compliance Metrics
  complianceRate: number; // percentage
  protocolDeviations: number;
  adverseEventsReported: number;
  
  // Phase Distribution
  phaseDistribution: CategoryBreakdown[];
  
  // Trends
  applicationTrends: TimeSeriesData[];
  processingTimeTrends: TimeSeriesData[];
  approvalRateTrends: TimeSeriesData[];
}

// GMP (Good Manufacturing Practice) KPIs
export interface GMPInspectionKPI {
  // Inspection Metrics
  totalInspections: number;
  plannedInspections: number;
  completedInspections: number;
  pendingInspections: number;
  
  // Compliance Metrics
  compliantFacilities: number;
  nonCompliantFacilities: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  
  // Certificate Metrics
  certificatesIssued: number;
  certificatesExpiring: number; // in next 90 days
  certificatesRevoked: number;
  
  // Performance Metrics
  averageInspectionDuration: number; // in days
  reinspectionRate: number; // percentage
  
  // Type Distribution
  inspectionTypeDistribution: CategoryBreakdown[];
  
  // Trends
  inspectionTrends: TimeSeriesData[];
  complianceTrends: TimeSeriesData[];
  findingsTrends: TimeSeriesData[];
}

// Market Authorization KPIs
export interface MarketAuthorizationKPI {
  // Application Metrics
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  withdrawnApplications: number;
  
  // Timeline Metrics
  averageReviewTime: number; // in days
  targetReviewTime: number; // in days
  medianReviewTime: number;
  
  // Product Types
  newDrugApplications: number;
  genericApplications: number;
  biosimilarApplications: number;
  
  // Priority Metrics
  priorityReviews: number;
  standardReviews: number;
  orphanDrugDesignations: number;
  
  // Performance Metrics
  firstCycleApprovalRate: number; // percentage
  approvalRate: number; // percentage
  
  // Distribution
  productTypeDistribution: CategoryBreakdown[];
  therapeuticAreaDistribution: CategoryBreakdown[];
  
  // Trends
  applicationTrends: TimeSeriesData[];
  reviewTimeTrends: TimeSeriesData[];
  approvalRateTrends: TimeSeriesData[];
}

// Dashboard Overview
export interface DashboardOverview {
  clinicalTrials: {
    totalActive: number;
    newThisMonth: number;
    averageProcessingDays: number;
    complianceRate: number;
  };
  gmpInspections: {
    totalInspections: number;
    completedThisMonth: number;
    complianceRate: number;
    criticalFindings: number;
  };
  marketAuthorizations: {
    totalApplications: number;
    approvedThisMonth: number;
    averageReviewDays: number;
    approvalRate: number;
  };
  recentActivities: Activity[];
  upcomingDeadlines: Deadline[];
}

export interface Activity {
  id: string;
  type: 'clinical_trial' | 'gmp_inspection' | 'market_authorization';
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'in_progress';
}

export interface Deadline {
  id: string;
  type: 'clinical_trial' | 'gmp_inspection' | 'market_authorization';
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  daysRemaining: number;
}

