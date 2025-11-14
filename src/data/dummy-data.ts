import {
  ClinicalTrialKPI,
  GMPInspectionKPI,
  MarketAuthorizationKPI,
  DashboardOverview,
  Activity,
  Deadline,
  TimeSeriesData,
  CategoryBreakdown
} from '@/types/kpi';

// Helper function to generate dates
const generateMonthlyDates = (months: number): string[] => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

// Clinical Trial Dummy Data
export const clinicalTrialData: ClinicalTrialKPI = {
  // Application Metrics
  totalApplications: 342,
  pendingApplications: 68,
  approvedApplications: 245,
  rejectedApplications: 29,
  
  // Timeline Metrics
  averageProcessingTime: 87, // days
  targetProcessingTime: 90, // days
  mediaanProcessingTime: 82,
  
  // Compliance Metrics
  complianceRate: 94.5, // percentage
  protocolDeviations: 23,
  adverseEventsReported: 156,
  
  // Phase Distribution
  phaseDistribution: [
    { name: 'Phase I', value: 45, percentage: 13.2, color: '#3b82f6' },
    { name: 'Phase II', value: 98, percentage: 28.7, color: '#8b5cf6' },
    { name: 'Phase III', value: 142, percentage: 41.5, color: '#ec4899' },
    { name: 'Phase IV', value: 57, percentage: 16.7, color: '#10b981' }
  ],
  
  // Trends (12 months)
  applicationTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 25 + Math.floor(Math.random() * 15),
    target: 30,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })),
  
  processingTimeTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 75 + Math.floor(Math.random() * 25),
    target: 90,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })),
  
  approvalRateTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 68 + Math.floor(Math.random() * 15),
    target: 75,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }))
};

// GMP Inspection Dummy Data
export const gmpInspectionData: GMPInspectionKPI = {
  // Inspection Metrics
  totalInspections: 287,
  plannedInspections: 320,
  completedInspections: 265,
  pendingInspections: 22,
  
  // Compliance Metrics
  compliantFacilities: 234,
  nonCompliantFacilities: 31,
  criticalFindings: 8,
  majorFindings: 45,
  minorFindings: 123,
  
  // Certificate Metrics
  certificatesIssued: 198,
  certificatesExpiring: 34,
  certificatesRevoked: 5,
  
  // Performance Metrics
  averageInspectionDuration: 5.8, // days
  reinspectionRate: 12.4, // percentage
  
  // Type Distribution
  inspectionTypeDistribution: [
    { name: 'Routine', value: 156, percentage: 54.4, color: '#3b82f6' },
    { name: 'Follow-up', value: 67, percentage: 23.3, color: '#f59e0b' },
    { name: 'Pre-approval', value: 42, percentage: 14.6, color: '#8b5cf6' },
    { name: 'For Cause', value: 22, percentage: 7.7, color: '#ef4444' }
  ],
  
  // Trends
  inspectionTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 20 + Math.floor(Math.random() * 12),
    target: 27,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })),
  
  complianceTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 82 + Math.floor(Math.random() * 12),
    target: 85,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })),
  
  findingsTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 10 + Math.floor(Math.random() * 20),
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }))
};

// Market Authorization Dummy Data
export const marketAuthorizationData: MarketAuthorizationKPI = {
  // Application Metrics
  totalApplications: 456,
  pendingApplications: 89,
  approvedApplications: 312,
  rejectedApplications: 43,
  withdrawnApplications: 12,
  
  // Timeline Metrics
  averageReviewTime: 278, // days
  targetReviewTime: 300, // days
  medianReviewTime: 265,
  
  // Product Types
  newDrugApplications: 178,
  genericApplications: 234,
  biosimilarApplications: 44,
  
  // Priority Metrics
  priorityReviews: 67,
  standardReviews: 389,
  orphanDrugDesignations: 34,
  
  // Performance Metrics
  firstCycleApprovalRate: 72.5, // percentage
  approvalRate: 68.4, // percentage
  
  // Distribution
  productTypeDistribution: [
    { name: 'New Drug', value: 178, percentage: 39.0, color: '#3b82f6' },
    { name: 'Generic', value: 234, percentage: 51.3, color: '#10b981' },
    { name: 'Biosimilar', value: 44, percentage: 9.6, color: '#8b5cf6' }
  ],
  
  therapeuticAreaDistribution: [
    { name: 'Oncology', value: 98, percentage: 21.5, color: '#ef4444' },
    { name: 'Cardiovascular', value: 87, percentage: 19.1, color: '#3b82f6' },
    { name: 'CNS', value: 76, percentage: 16.7, color: '#8b5cf6' },
    { name: 'Infectious Disease', value: 65, percentage: 14.3, color: '#10b981' },
    { name: 'Respiratory', value: 54, percentage: 11.8, color: '#f59e0b' },
    { name: 'Other', value: 76, percentage: 16.7, color: '#6b7280' }
  ],
  
  // Trends
  applicationTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 32 + Math.floor(Math.random() * 18),
    target: 40,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })),
  
  reviewTimeTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 250 + Math.floor(Math.random() * 60),
    target: 300,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })),
  
  approvalRateTrends: generateMonthlyDates(12).map((date, index) => ({
    date,
    value: 62 + Math.floor(Math.random() * 14),
    target: 70,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }))
};

// Recent Activities
const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'market_authorization',
    title: 'New Drug Application Approved',
    description: 'Oncology medication XYZ-123 approved for market',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'completed'
  },
  {
    id: '2',
    type: 'gmp_inspection',
    title: 'GMP Inspection Completed',
    description: 'Routine inspection at ABC Pharmaceuticals - Compliant',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'completed'
  },
  {
    id: '3',
    type: 'clinical_trial',
    title: 'Phase III Trial Initiated',
    description: 'Clinical trial CT-2024-456 approved and initiated',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress'
  },
  {
    id: '4',
    type: 'market_authorization',
    title: 'Generic Application Under Review',
    description: 'Generic version of cardiovascular drug under evaluation',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress'
  },
  {
    id: '5',
    type: 'gmp_inspection',
    title: 'Follow-up Inspection Scheduled',
    description: 'Follow-up at DEF Manufacturing scheduled for next week',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    status: 'pending'
  },
  {
    id: '6',
    type: 'clinical_trial',
    title: 'Adverse Event Reported',
    description: 'Minor adverse event in trial CT-2024-123, under review',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress'
  }
];

// Upcoming Deadlines
const upcomingDeadlines: Deadline[] = [
  {
    id: '1',
    type: 'market_authorization',
    title: 'MA Review Decision Due',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    daysRemaining: 3
  },
  {
    id: '2',
    type: 'gmp_inspection',
    title: 'Pre-approval Inspection',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    daysRemaining: 5
  },
  {
    id: '3',
    type: 'clinical_trial',
    title: 'Clinical Trial Progress Report',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    daysRemaining: 7
  },
  {
    id: '4',
    type: 'market_authorization',
    title: 'Biosimilar Assessment Completion',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    daysRemaining: 10
  },
  {
    id: '5',
    type: 'gmp_inspection',
    title: 'GMP Certificate Renewal',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    daysRemaining: 14
  },
  {
    id: '6',
    type: 'clinical_trial',
    title: 'Phase II Trial Milestone',
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    daysRemaining: 21
  }
];

// Dashboard Overview
export const dashboardOverview: DashboardOverview = {
  clinicalTrials: {
    totalActive: 342,
    newThisMonth: 28,
    averageProcessingDays: 87,
    complianceRate: 94.5
  },
  gmpInspections: {
    totalInspections: 287,
    completedThisMonth: 24,
    complianceRate: 88.3,
    criticalFindings: 8
  },
  marketAuthorizations: {
    totalApplications: 456,
    approvedThisMonth: 31,
    averageReviewDays: 278,
    approvalRate: 68.4
  },
  recentActivities,
  upcomingDeadlines
};

// Export all data
export const kpiData = {
  clinicalTrial: clinicalTrialData,
  gmpInspection: gmpInspectionData,
  marketAuthorization: marketAuthorizationData,
  overview: dashboardOverview
};

