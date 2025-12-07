/**
 * Dummy drill-down data for MA KPIs
 * Based on plan.md structure
 */

import type { KPIDrillDownData, IndividualApplication, ProcessingStageDrillDown } from '@/types/ma-drilldown';

// Helper function to generate dummy applications
function generateDummyApplications(
  count: number,
  baseMaNumber: string,
  options?: {
    applicationTypes?: string[];
    internalPathways?: string[];
    reliancePathways?: string[];
    regulatoryOutcomes?: string[];
    applicationCategories?: string[];
    applicationSubTypes?: string[];
  }
): IndividualApplication[] {
  const applications: IndividualApplication[] = [];
  const assessors = [
    { prescreener: "John Doe", primary: "Jane Smith", secondary: "Bob Johnson" },
    { prescreener: "Alice Brown", primary: "Charlie Wilson", secondary: "Diana Lee" },
    { prescreener: "Mike Davis", primary: "Sarah Miller", secondary: "Tom Anderson" },
  ];
  const agents = ["ABC Pharmaceuticals", "XYZ Manufacturing", "Global Pharma Ltd", "MedCorp International"];
  const suppliers = ["Supplier A", "Supplier B", "Supplier C", "Supplier D"];
  const branches = ["Addis Ababa", "Dire Dawa", "Mekelle", "Hawassa"];

  for (let i = 0; i < count; i++) {
    const processingDays = 120 + Math.floor(Math.random() * 100);
    const targetDays = 180;
    const assessor = assessors[i % assessors.length];
    const submissionDate = new Date(2024, 0, 15 + i * 5);
    const decisionDate = new Date(submissionDate);
    decisionDate.setDate(decisionDate.getDate() + processingDays);

    const applicationType =
      options?.applicationTypes?.[i % options.applicationTypes.length] ?? "New Registration";
    const internalPathway =
      options?.internalPathways?.[i % options.internalPathways.length] ?? "Standard/regular";
    const reliancePathway =
      options?.reliancePathways?.[i % options.reliancePathways.length] ?? "SRA";
    const regulatoryOutcome =
      options?.regulatoryOutcomes?.[
        i % (options.regulatoryOutcomes ? options.regulatoryOutcomes.length : 1)
      ] ??
      (i % 3 === 0 ? "Approved" : i % 3 === 1 ? "Rejected" : "Pending");
    const applicationCategory =
      options?.applicationCategories?.[i % options.applicationCategories.length] ??
      ["Medicine", "Food", "Medical Device"][i % 3];
    const applicationSubType = options?.applicationSubTypes
      ? options.applicationSubTypes[i % options.applicationSubTypes.length]
      : undefined;

    applications.push({
      maNumber: `${baseMaNumber}-${String(i + 1).padStart(4, '0')}`,
      brandName: `Product ${String.fromCharCode(65 + (i % 26))}`,
      genericName: `Active Ingredient ${i + 1}`,
      applicationType,
      applicationSubType,
      applicationCategory,
      internalPathway,
      reliancePathway,
      status: regulatoryOutcome as IndividualApplication["status"],
      regulatoryOutcome,
      submissionDate: submissionDate.toISOString().split('T')[0],
      decisionDate: decisionDate.toISOString().split('T')[0],
      processingDays,
      targetDays,
      onTime: processingDays <= targetDays,
      timeline: [
        { stage: "Screening", days: 15 + Math.floor(Math.random() * 10), target: 14, onTime: true },
        { stage: "Assessment", days: 60 + Math.floor(Math.random() * 30), target: 100, onTime: true },
        { stage: "FIR Response", days: 20 + Math.floor(Math.random() * 10), target: 30, onTime: true },
        { stage: "Final Decision", days: 25 + Math.floor(Math.random() * 10), target: 36, onTime: true },
      ],
      assessors,
      agent: agents[i % agents.length],
      supplier: suppliers[i % suppliers.length],
      branchName: branches[i % branches.length],
    });
  }

  return applications;
}

const kpi1ApplicationTypes = [
  "New Chemical Entity",
  "Generics",
  "Biologics",
  "Vaccines",
  "Biosimilar",
  "Radiopharmaceuticals",
  "Traditional / Herbal",
  "Plasma Derived Medical Products",
];

const kpi1InternalPathways = ["Standard/regular", "Fast Track", "Emergency Use", "Conditional"];

const kpi1ReliancePathways = ["WHO PQ", "SRA", "Regional (IGAD MRH)", "Continental (AMA)", "Article 58"];

const kpi1Outcomes = [
  "Approved",
  "Rejected",
  "Cancelled",
  "Suspended",
  "Further information requested",
  "Withdrawn",
];

const kpi1Categories = ["Medicine", "Food", "Medical Device"];

export const maDrillDownData: Record<string, KPIDrillDownData> = {
  'MA-KPI-1': {
    kpiId: 'MA-KPI-1',
    kpiName: 'Percentage of New MA Applications Completed Within Timeline',
    currentValue: {
      value: 82.1,
      numerator: 234,
      denominator: 285,
      percentage: 82.1,
    },
    level1: {
      dimension: 'submodule_type',
      data: [
        { category: 'Medicine', value: 82.1, count: 120, total: 146, percentage: 82.1 },
        { category: 'Food', value: 75.0, count: 30, total: 40, percentage: 75.0 },
        { category: 'Medical Device', value: 50.0, count: 7, total: 14, percentage: 50.0 },
      ],
      drillable: true,
      nextLevel: 'approval_pathway',
    },
    dimensionViews: [
      {
        id: 'submodule_type',
        label: 'Submodule type',
        description: 'Medicine vs food vs medical device split',
        sourceField: 'applicationCategory',
        data: [
          { category: 'Medicine', value: 82.1, count: 120, total: 146, percentage: 82.1 },
          { category: 'Food', value: 75.0, count: 30, total: 40, percentage: 75.0 },
          { category: 'Medical Device', value: 50.0, count: 7, total: 14, percentage: 50.0 },
        ],
      },
      {
        id: 'application_type',
        label: 'Application type',
        description: 'Portfolio by product class',
        sourceField: 'applicationType',
        data: [
          { category: 'New Chemical Entity', value: 85.7, count: 60, total: 70, percentage: 85.7 },
          { category: 'Generics', value: 84.5, count: 120, total: 142, percentage: 84.5 },
          { category: 'Biologics', value: 78.6, count: 22, total: 28, percentage: 78.6 },
          { category: 'Vaccines', value: 85.7, count: 18, total: 21, percentage: 85.7 },
          { category: 'Biosimilar', value: 80.0, count: 12, total: 15, percentage: 80.0 },
          { category: 'Radiopharmaceuticals', value: 76.0, count: 19, total: 25, percentage: 76.0 },
          { category: 'Traditional / Herbal', value: 73.3, count: 11, total: 15, percentage: 73.3 },
          { category: 'Plasma Derived Medical Products', value: 82.4, count: 14, total: 17, percentage: 82.4 },
        ],
      },
      {
        id: 'internal_pathway',
        label: 'Internal regulatory pathway',
        description: 'Standard vs expedited pathways',
        sourceField: 'internalPathway',
        data: [
          { category: 'Standard/regular', value: 81.5, count: 142, total: 174, percentage: 81.5 },
          { category: 'Fast Track', value: 86.2, count: 69, total: 80, percentage: 86.2 },
          { category: 'Emergency Use', value: 78.8, count: 26, total: 33, percentage: 78.8 },
          { category: 'Conditional', value: 83.3, count: 15, total: 18, percentage: 83.3 },
        ],
      },
      {
        id: 'reliance_pathway',
        label: 'Reliance pathway',
        description: 'Reliance / collaborative review pathways',
        sourceField: 'reliancePathway',
        data: [
          { category: 'WHO PQ', value: 88.0, count: 44, total: 50, percentage: 88.0 },
          { category: 'SRA', value: 85.4, count: 41, total: 48, percentage: 85.4 },
          { category: 'Regional (IGAD MRH)', value: 80.0, count: 32, total: 40, percentage: 80.0 },
          { category: 'Continental (AMA)', value: 79.5, count: 31, total: 39, percentage: 79.5 },
          { category: 'Article 58', value: 77.8, count: 21, total: 27, percentage: 77.8 },
        ],
      },
      {
        id: 'regulatory_outcome',
        label: 'Regulatory outcome',
        description: 'Decision outcomes driving SLA',
        sourceField: 'regulatoryOutcome',
        data: [
          { category: 'Approved', value: 90.0, count: 230, total: 256, percentage: 90.0 },
          { category: 'Rejected', value: 40.0, count: 8, total: 20, percentage: 40.0 },
          { category: 'Cancelled', value: 55.6, count: 5, total: 9, percentage: 55.6 },
          { category: 'Suspended', value: 60.0, count: 3, total: 5, percentage: 60.0 },
          { category: 'Further information requested', value: 35.0, count: 7, total: 20, percentage: 35.0 },
          { category: 'Withdrawn', value: 70.0, count: 3, total: 4, percentage: 70.0 },
        ],
      },
    ],
    level2: {
      dimension: 'approval_pathway',
      parentCategory: 'Medicine',
      data: [
        { category: 'SRA', value: 88.5, count: 46, total: 52, percentage: 88.5 },
        { category: 'Regular', value: 80.2, count: 53, total: 66, percentage: 80.2 },
        { category: 'Accelerated', value: 75.0, count: 15, total: 20, percentage: 75.0 },
        { category: 'Abridged', value: 85.7, count: 6, total: 7, percentage: 85.7 },
        { category: 'Verification', value: 90.0, count: 9, total: 10, percentage: 90.0 },
      ],
      drillable: true,
      nextLevel: 'processing_stage',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'SRA',
      data: [
        { stage: 'Screening', days: 12, target: 14, onTime: true },
        { stage: 'Assessment', days: 85, target: 100, onTime: true },
        { stage: 'FIR Response', days: 18, target: 30, onTime: true },
        { stage: 'Final Decision', days: 28, target: 36, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'SRA',
      data: generateDummyApplications(42, 'MA-2024', {
        applicationTypes: kpi1ApplicationTypes,
        internalPathways: kpi1InternalPathways,
        reliancePathways: kpi1ReliancePathways,
        regulatoryOutcomes: kpi1Outcomes,
        applicationCategories: kpi1Categories,
      }),
      drillable: false,
    },
    rootCauseAnalysis: [
      {
        dimension: 'By Branch',
        items: [
          { category: 'Addis Ababa', value: 85.2, count: 120, total: 141, percentage: 85.2 },
          { category: 'Dire Dawa', value: 78.5, count: 55, total: 70, percentage: 78.5 },
          { category: 'Mekelle', value: 75.0, count: 36, total: 48, percentage: 75.0 },
          { category: 'Hawassa', value: 80.0, count: 23, total: 26, percentage: 80.0 },
        ],
      },
      {
        dimension: 'By Agent',
        items: [
          { category: 'ABC Pharmaceuticals', value: 88.5, count: 77, total: 87, percentage: 88.5 },
          { category: 'XYZ Manufacturing', value: 80.0, count: 64, total: 80, percentage: 80.0 },
          { category: 'Global Pharma Ltd', value: 75.5, count: 60, total: 79, percentage: 75.5 },
          { category: 'MedCorp International', value: 78.3, count: 33, total: 39, percentage: 78.3 },
        ],
      },
    ],
  },
  'MA-KPI-2': {
    kpiId: 'MA-KPI-2',
    kpiName: 'Percentage of Renewal MA Applications Completed Within Timeline',
    currentValue: {
      value: 87.6,
      numerator: 156,
      denominator: 178,
      percentage: 87.6,
    },
    level1: {
      dimension: 'submodule_type',
      data: [
        { category: 'Medicine', value: 88.5, count: 108, total: 122, percentage: 88.5 },
        { category: 'Food', value: 85.0, count: 34, total: 40, percentage: 85.0 },
        { category: 'Medical Device', value: 87.5, count: 14, total: 16, percentage: 87.5 },
      ],
      drillable: true,
      nextLevel: 'renewal_status',
    },
    level2: {
      dimension: 'renewal_status',
      parentCategory: 'Medicine',
      data: [
        { category: 'On-Time Renewals', value: 92.3, count: 84, total: 91, percentage: 92.3 },
        { category: 'Late Renewals', value: 77.4, count: 24, total: 31, percentage: 77.4 },
        { category: 'Near-Expiry', value: 0, count: 0, total: 0, percentage: 0 },
      ],
      drillable: true,
      nextLevel: 'processing_stage',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'On-Time Renewals',
      data: [
        { stage: 'Screening', days: 10, target: 12, onTime: true },
        { stage: 'Assessment', days: 45, target: 60, onTime: true },
        { stage: 'Final Decision', days: 20, target: 25, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'On-Time Renewals',
      data: generateDummyApplications(8, 'REN-2024'),
      drillable: false,
    },
  },
  'MA-KPI-3': {
    kpiId: 'MA-KPI-3',
    kpiName: 'Percentage of Minor Variation Applications Completed Within Timeline',
    currentValue: {
      value: 89.7,
      numerator: 312,
      denominator: 348,
      percentage: 89.7,
    },
    level1: {
      dimension: 'variation_reason',
      data: [
        { category: 'Manufacturing Site Change', value: 92.5, count: 74, total: 80, percentage: 92.5 },
        { category: 'Formulation', value: 88.0, count: 88, total: 100, percentage: 88.0 },
        { category: 'Labeling', value: 90.0, count: 90, total: 100, percentage: 90.0 },
        { category: 'Packaging', value: 87.5, count: 35, total: 40, percentage: 87.5 },
        { category: 'Other', value: 85.7, count: 25, total: 28, percentage: 85.7 },
      ],
      drillable: true,
      nextLevel: 'submodule_type',
    },
    level2: {
      dimension: 'submodule_type',
      parentCategory: 'Manufacturing Site Change',
      data: [
        { category: 'Medicine', value: 93.3, count: 42, total: 45, percentage: 93.3 },
        { category: 'Food', value: 91.7, count: 22, total: 24, percentage: 91.7 },
        { category: 'Medical Device', value: 90.9, count: 10, total: 11, percentage: 90.9 },
      ],
      drillable: true,
      nextLevel: 'processing_stage',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'Medicine',
      data: [
        { stage: 'Screening', days: 8, target: 10, onTime: true },
        { stage: 'Assessment', days: 25, target: 30, onTime: true },
        { stage: 'Final Decision', days: 12, target: 15, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'Medicine',
      data: generateDummyApplications(6, 'MIJV-2024'),
      drillable: false,
    },
  },
  'MA-KPI-4': {
    kpiId: 'MA-KPI-4',
    kpiName: 'Percentage of Major Variation Applications Completed Within Timeline',
    currentValue: {
      value: 82.1,
      numerator: 128,
      denominator: 156,
      percentage: 82.1,
    },
    level1: {
      dimension: 'variation_complexity',
      data: [
        { category: 'Low Complexity', value: 90.0, count: 45, total: 50, percentage: 90.0 },
        { category: 'Medium Complexity', value: 82.5, count: 66, total: 80, percentage: 82.5 },
        { category: 'High Complexity', value: 65.4, count: 17, total: 26, percentage: 65.4 },
      ],
      drillable: true,
      nextLevel: 'review_complexity',
    },
    level2: {
      dimension: 'review_complexity',
      parentCategory: 'High Complexity',
      data: [
        { category: 'Single FIR', value: 75.0, count: 9, total: 12, percentage: 75.0, firCount: 1, assessmentCycles: 1 },
        { category: 'Multiple FIRs', value: 57.1, count: 8, total: 14, percentage: 57.1, firCount: 3, assessmentCycles: 2 },
      ],
      drillable: true,
      nextLevel: 'processing_stage',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'Multiple FIRs',
      data: [
        { stage: 'Screening', days: 15, target: 14, onTime: false },
        { stage: 'Assessment', days: 120, target: 100, onTime: false },
        { stage: 'FIR Response', days: 45, target: 30, onTime: false },
        { stage: 'Team Leader Review', days: 20, target: 15, onTime: false },
        { stage: 'Final Decision', days: 40, target: 36, onTime: false },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'Multiple FIRs',
      data: generateDummyApplications(5, 'MAJV-2024'),
      drillable: false,
    },
  },
  'MA-KPI-5': {
    kpiId: 'MA-KPI-5',
    kpiName: 'Percentage of Queries/FIRs Completed Within Timeline',
    currentValue: {
      value: 86.9,
      numerator: 445,
      denominator: 512,
      percentage: 86.9,
    },
    level1: {
      dimension: 'fir_type',
      data: [
        { category: 'Screening FIR', value: 88.5, count: 185, total: 209, percentage: 88.5 },
        { category: 'Assessment FIR', value: 85.8, count: 260, total: 303, percentage: 85.8 },
      ],
      drillable: true,
      nextLevel: 'application_type',
    },
    level2: {
      dimension: 'application_type',
      parentCategory: 'Assessment FIR',
      data: [
        { category: 'New', value: 85.0, count: 102, total: 120, percentage: 85.0 },
        { category: 'Renewal', value: 87.5, count: 70, total: 80, percentage: 87.5 },
        { category: 'Minor Variation', value: 86.2, count: 50, total: 58, percentage: 86.2 },
        { category: 'Major Variation', value: 84.4, count: 38, total: 45, percentage: 84.4 },
      ],
      drillable: true,
      nextLevel: 'query_category',
    },
    level3: {
      dimension: 'query_category',
      parentCategory: 'New',
      data: [
        { stage: 'Documentation', days: 12, target: 15, onTime: true },
        { stage: 'Data Integrity', days: 18, target: 15, onTime: false },
        { stage: 'Technical', days: 10, target: 15, onTime: true },
        { stage: 'Regulatory', days: 14, target: 15, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_firs',
    },
    level4: {
      dimension: 'individual_firs',
      parentCategory: 'New',
      data: generateDummyApplications(8, 'FIR-2024'),
      drillable: false,
    },
  },
  'MA-KPI-6': {
    kpiId: 'MA-KPI-6',
    kpiName: 'Median Time to Complete New MA Application',
    currentValue: {
      value: 156,
      numerator: 0,
      denominator: 0,
      median: 156,
    },
    level1: {
      dimension: 'distribution_analysis',
      data: [
        { category: 'P25', value: 120, count: 0, total: 0 },
        { category: 'P50 (Median)', value: 156, count: 0, total: 0 },
        { category: 'P75', value: 185, count: 0, total: 0 },
        { category: 'P90', value: 220, count: 0, total: 0 },
      ],
      drillable: true,
      nextLevel: 'category',
    },
    level2: {
      dimension: 'category',
      parentCategory: 'P50 (Median)',
      data: [
        { category: 'Medicine', value: 150, count: 0, total: 0, percentage: 0 },
        { category: 'Food', value: 165, count: 0, total: 0, percentage: 0 },
        { category: 'Medical Device', value: 180, count: 0, total: 0, percentage: 0 },
      ],
      drillable: true,
      nextLevel: 'stage_breakdown',
    },
    level3: {
      dimension: 'stage_breakdown',
      parentCategory: 'Medicine',
      data: [
        { stage: 'Screening', days: 12, target: 14, onTime: true },
        { stage: 'Assessment', days: 90, target: 100, onTime: true },
        { stage: 'Team Leader', days: 25, target: 30, onTime: true },
        { stage: 'Final Decision', days: 30, target: 36, onTime: true },
      ],
      drillable: true,
      nextLevel: 'outlier_analysis',
    },
    level4: {
      dimension: 'outlier_analysis',
      parentCategory: 'Medicine',
      data: generateDummyApplications(5, 'OUT-2024'),
      drillable: false,
    },
  },
  'MA-KPI-7': {
    kpiId: 'MA-KPI-7',
    kpiName: 'Average Time to Complete New MA Application',
    currentValue: {
      value: 164.2,
      numerator: 167520,
      denominator: 1020,
      average: 164.2,
    },
    level1: {
      dimension: 'time_component',
      data: [
        { category: 'Screener Assignment', value: 3, count: 0, total: 0, percentage: 0 },
        { category: 'Screening', value: 12, count: 0, total: 0, percentage: 0 },
        { category: 'Applicant Response (Screening)', value: 18, count: 0, total: 0, percentage: 0 },
        { category: 'Assessor Assignment', value: 5, count: 0, total: 0, percentage: 0 },
        { category: 'Assessment', value: 85, count: 0, total: 0, percentage: 0 },
        { category: 'Team Leader Decision', value: 25, count: 0, total: 0, percentage: 0 },
        { category: 'Applicant Response (FIR)', value: 21, count: 0, total: 0, percentage: 0 },
        { category: 'Final Decision', value: 30, count: 0, total: 0, percentage: 0 },
      ],
      drillable: true,
      nextLevel: 'regulatory_vs_applicant',
    },
    level2: {
      dimension: 'regulatory_vs_applicant',
      parentCategory: 'Average',
      data: [
        { category: 'Regulatory Time', value: 160, count: 0, total: 0, percentage: 0 },
        { category: 'Applicant Time', value: 39, count: 0, total: 0, percentage: 0 },
      ],
      drillable: true,
      nextLevel: 'performance_comparison',
    },
    level3: {
      dimension: 'performance_comparison',
      parentCategory: 'Regulatory Time',
      data: [
        { stage: 'By Assessor', days: 85, target: 100, onTime: true },
        { stage: 'By Team', days: 82, target: 100, onTime: true },
        { stage: 'By Period', days: 80, target: 100, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'By Assessor',
      data: generateDummyApplications(10, 'AVG-2024'),
      drillable: false,
    },
  },
  'MA-KPI-8': {
    kpiId: 'MA-KPI-8',
    kpiName: 'Percentage of PARs Published Within Timeline',
    currentValue: {
      value: 82.8,
      numerator: 178,
      denominator: 215,
      percentage: 82.8,
    },
    level1: {
      dimension: 'application_type',
      data: [
        { category: 'New Registration', value: 83.5, count: 142, total: 170, percentage: 83.5 },
        { category: 'Major Variation', value: 80.0, count: 36, total: 45, percentage: 80.0 },
      ],
      drillable: true,
      nextLevel: 'publication_status',
    },
    level2: {
      dimension: 'publication_status',
      parentCategory: 'New Registration',
      data: [
        { category: 'Published On-Time', value: 83.5, count: 142, total: 170, percentage: 83.5 },
        { category: 'Published Late', value: 0, count: 18, total: 18, percentage: 0 },
        { category: 'Pending', value: 0, count: 10, total: 10, percentage: 0 },
      ],
      drillable: true,
      nextLevel: 'product_category',
    },
    level3: {
      dimension: 'product_category',
      parentCategory: 'Published On-Time',
      data: [
        { stage: 'Medicine', days: 55, target: 60, onTime: true },
        { stage: 'Food', days: 58, target: 60, onTime: true },
        { stage: 'Medical Device', days: 52, target: 60, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_pars',
    },
    level4: {
      dimension: 'individual_pars',
      parentCategory: 'Medicine',
      data: generateDummyApplications(7, 'PAR-2024'),
      drillable: false,
    },
  },
};

