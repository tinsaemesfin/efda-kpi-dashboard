/**
 * GMP Drilldown Dummy Data
 * Comprehensive data for all 9 GMP KPIs based on backend specification
 */

import type {
  GMPKPIDrillDownData,
  GMPInspection,

} from '@/types/gmp-drilldown';

// Helper function to generate dummy inspections
function generateGMPInspections(
  count: number,
  baseInspectionNumber: string,
  options?: {
    inspectionTypes?: string[];
    inspectionModes?: string[];
    complianceStatuses?: string[];
    facilityTypes?: string[];
    locations?: ('domestic' | 'foreign')[];
    productTypes?: string[];
  }
): GMPInspection[] {
  const inspections: GMPInspection[] = [];
  const inspectors = [
    'John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown',
    'Charlie Wilson', 'Diana Lee', 'Mike Davis', 'Sarah Miller'
  ];
  const facilities = [
    'PharmaCorp Manufacturing', 'GlobalMed Industries', 'BioTech Solutions',
    'MedSupply Co', 'QualityPharm Ltd', 'Ethiopian Pharma Factory',
    'Addis Manufacturing', 'East Africa Pharmaceuticals'
  ];

  const inspectionTypes = options?.inspectionTypes ?? ['NLGI', 'LGRI', 'NACI', 'ACRI'];
  const inspectionModes = options?.inspectionModes ?? ['onsiteDomestic', 'onsiteForeign', 'jointOnsiteForeign'];
  const complianceStatuses = options?.complianceStatuses ?? ['ALEG', 'PALG', 'NCLG'];
  const facilityTypes = options?.facilityTypes ?? ['Manufacturing', 'Packaging', 'Testing'];
  const locations = options?.locations ?? ['domestic', 'foreign'];
  const productTypes = options?.productTypes ?? ['Human Medicines', 'Veterinary Medicines', 'Medical Devices'];

  for (let i = 0; i < count; i++) {
    const startDate = new Date(2024, Math.floor(i / 15), (i % 15) + 1);
    const processingDays = 45 + Math.floor(Math.random() * 60);
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + processingDays);
    const targetDays = 90;

    inspections.push({
      inspectionNumber: `${baseInspectionNumber}-${String(i + 1).padStart(4, '0')}`,
      facilityName: facilities[i % facilities.length],
      inspectionType: inspectionTypes[i % inspectionTypes.length],
      inspectionTypeCode: inspectionTypes[i % inspectionTypes.length],
      status: complianceStatuses[i % complianceStatuses.length],
      assignedUser: inspectors[i % inspectors.length],
      inspector: inspectors[i % inspectors.length],
      startDate: startDate.toISOString().split('T')[0],
      completionDate: completionDate.toISOString().split('T')[0],
      decisionDate: completionDate.toISOString().split('T')[0],
      isCompliant: complianceStatuses[i % complianceStatuses.length] === 'ALEG',
      complianceStatus: complianceStatuses[i % complianceStatuses.length],
      facilityType: facilityTypes[i % facilityTypes.length],
      location: locations[i % locations.length],
      inspectionMode: inspectionModes[i % inspectionModes.length] as any,
      productType: productTypes[i % productTypes.length],
      processingDays,
      targetDays,
      onTime: processingDays <= targetDays,
      certificateNumber: `CERT-${2024}-${String(i + 1).padStart(4, '0')}`,
      expiryDate: new Date(completionDate.getFullYear() + 3, completionDate.getMonth(), completionDate.getDate()).toISOString().split('T')[0],
      deficiencyCount: Math.floor(Math.random() * 5),
      stageBreakdown: {
        screening: 5 + Math.floor(Math.random() * 10),
        assignment: 8 + Math.floor(Math.random() * 12),
        assessment: 20 + Math.floor(Math.random() * 25),
        review: 5 + Math.floor(Math.random() * 10),
        decision: 7 + Math.floor(Math.random() * 10),
      },
    });
  }

  return inspections;
}

// KPI 1: Facilities Inspected as per Plan
const kpi1Inspections = generateGMPInspections(50, 'INS-2024', {
  inspectionTypes: ['NLGI', 'LGRI', 'NACI', 'ACRI'],
  inspectionModes: ['onsiteDomestic', 'onsiteForeign', 'jointOnsiteForeign'],
});

// KPI 2: Complaint-Triggered Inspections
function generateComplaintInspections(count: number): GMPInspection[] {
  const inspections: GMPInspection[] = [];
  const investigationTypes = ['Product Quality', 'Adverse Events', 'Manufacturing Defects', 'Other'];
  const statuses = ['Pending', 'In Progress', 'Completed', 'Closed'];
  const facilities = [
    'PharmaCorp Manufacturing', 'GlobalMed Industries', 'BioTech Solutions',
    'MedSupply Co', 'QualityPharm Ltd'
  ];

  for (let i = 0; i < count; i++) {
    const dateReceived = new Date(2024, Math.floor(i / 10), (i % 10) + 1);
    const responseDays = 5 + Math.floor(Math.random() * 20);
    const inspectionDate = new Date(dateReceived);
    inspectionDate.setDate(inspectionDate.getDate() + responseDays);

    inspections.push({
      inspectionNumber: `INVI-2024-${String(i + 1).padStart(4, '0')}`,
      facilityName: facilities[i % facilities.length],
      inspectionType: 'INVI',
      inspectionTypeCode: 'INVI',
      investigationType: investigationTypes[i % investigationTypes.length],
      status: statuses[i % statuses.length],
      startDate: dateReceived.toISOString().split('T')[0],
      dateReceived: dateReceived.toISOString().split('T')[0],
      inspectionDate: inspectionDate.toISOString().split('T')[0],
      responseDays,
      outcome: i % 3 === 0 ? 'Compliant' : i % 3 === 1 ? 'Non-Compliant' : 'Under Review',
      inspector: `Inspector ${String.fromCharCode(65 + (i % 8))}`,
      location: i % 2 === 0 ? 'domestic' : 'foreign',
    });
  }

  return inspections;
}

// KPI 3: Waived Inspections
function generateWaiverInspections(count: number): GMPInspection[] {
  const inspections: GMPInspection[] = [];
  const waiverTypes = ['NACIW', 'ACIWR'];
  const referenceAuthorities = ['WHO PQ', 'US FDA', 'EMA', 'TGA Australia', 'Health Canada', 'PIC/S'];
  const countries = ['USA', 'Germany', 'Australia', 'Canada', 'Switzerland', 'Netherlands'];
  const statuses = ['Under Review', 'Approved', 'Rejected', 'Completed'];

  for (let i = 0; i < count; i++) {
    const applicationDate = new Date(2024, Math.floor(i / 12), (i % 12) + 1);
    const processingDays = 20 + Math.floor(Math.random() * 40);
    const decisionDate = new Date(applicationDate);
    decisionDate.setDate(decisionDate.getDate() + processingDays);

    inspections.push({
      inspectionNumber: `${waiverTypes[i % waiverTypes.length]}-2024-${String(i + 1).padStart(4, '0')}`,
      facilityName: `Manufacturer ${String.fromCharCode(65 + (i % 8))}`,
      inspectionType: waiverTypes[i % waiverTypes.length],
      inspectionTypeCode: waiverTypes[i % waiverTypes.length],
      waiverType: waiverTypes[i % waiverTypes.length] === 'NACIW' ? 'New Waiver' : 'Renewal Waiver',
      referenceCountry: countries[i % countries.length],
      referenceAuthority: referenceAuthorities[i % referenceAuthorities.length],
      previousGMPCertificateNumber: `CERT-${2023 - (i % 3)}-${String(i + 1).padStart(4, '0')}`,
      status: statuses[i % statuses.length],
      startDate: applicationDate.toISOString().split('T')[0],
      applicationDate: applicationDate.toISOString().split('T')[0],
      decisionDate: decisionDate.toISOString().split('T')[0],
      processingDays,
      location: 'foreign',
      inspectionMode: 'remoteDeskBased',
    });
  }

  return inspections;
}

// KPI 5: CAPA Cases
function generateCAPACases(count: number): GMPInspection[] {
  const inspections: GMPInspection[] = [];
  const capaStatuses = ['CAPREQ', 'CAPS', 'CAPREJ', 'IMRREQ', 'IMRS', 'IMRREJ'];
  const facilities = [
    'PharmaCorp Manufacturing', 'GlobalMed Industries', 'BioTech Solutions',
    'MedSupply Co', 'QualityPharm Ltd'
  ];

  for (let i = 0; i < count; i++) {
    const capaRequestedDate = new Date(2024, Math.floor(i / 12), (i % 12) + 1);
    const capaDueDate = new Date(capaRequestedDate);
    capaDueDate.setDate(capaDueDate.getDate() + 30);
    const capaSubmittedDate = new Date(capaRequestedDate);
    capaSubmittedDate.setDate(capaSubmittedDate.getDate() + 20 + Math.floor(Math.random() * 15));
    const decisionDate = new Date(capaSubmittedDate);
    decisionDate.setDate(decisionDate.getDate() + 5 + Math.floor(Math.random() * 10));
    const processingDays = Math.floor((decisionDate.getTime() - capaRequestedDate.getTime()) / (1000 * 60 * 60 * 24));
    const delayDays = Math.max(0, processingDays - 30);

    inspections.push({
      inspectionNumber: `CAPA-2024-${String(i + 1).padStart(4, '0')}`,
      facilityName: facilities[i % facilities.length],
      inspectionType: 'CAPA',
      status: capaStatuses[i % capaStatuses.length],
      capaStatus: capaStatuses[i % capaStatuses.length],
      currentStatus: capaStatuses[i % capaStatuses.length],
      startDate: capaRequestedDate.toISOString().split('T')[0],
      capaRequestedDate: capaRequestedDate.toISOString().split('T')[0],
      capaDueDate: capaDueDate.toISOString().split('T')[0],
      capaSubmittedDate: capaSubmittedDate.toISOString().split('T')[0],
      decisionDate: decisionDate.toISOString().split('T')[0],
      processingDays,
      delayDays,
      onTime: processingDays <= 30,
    });
  }

  return inspections;
}

// KPI 6 & 7: Applications with processing stages
function generateApplicationsWithStages(count: number): GMPInspection[] {
  const inspections: GMPInspection[] = [];
  const applicantTypes = ['Domestic', 'Foreign Direct', 'Foreign Reliance'];
  const facilities = [
    'PharmaCorp Manufacturing', 'GlobalMed Industries', 'BioTech Solutions',
    'MedSupply Co', 'QualityPharm Ltd', 'Ethiopian Pharma Factory'
  ];

  for (let i = 0; i < count; i++) {
    const paymentDate = new Date(2024, Math.floor(i / 15), (i % 15) + 1);
    const screeningDays = 5 + Math.floor(Math.random() * 10);
    const assignmentDays = 8 + Math.floor(Math.random() * 12);
    const assessmentDays = 20 + Math.floor(Math.random() * 30);
    const reviewDays = 5 + Math.floor(Math.random() * 10);
    const capaDays = i % 3 === 0 ? 10 + Math.floor(Math.random() * 15) : 0;
    const decisionDays = 7 + Math.floor(Math.random() * 10);
    const totalDays = screeningDays + assignmentDays + assessmentDays + reviewDays + capaDays + decisionDays;
    const applicantWaitDays = 5 + Math.floor(Math.random() * 15);
    const nraProcessingDays = totalDays - applicantWaitDays;
    const targetDays = applicantTypes[i % applicantTypes.length] === 'Domestic' ? 90 : 120;
    const decisionDate = new Date(paymentDate);
    decisionDate.setDate(decisionDate.getDate() + totalDays);

    inspections.push({
      inspectionNumber: `APP-2024-${String(i + 1).padStart(4, '0')}`,
      facilityName: facilities[i % facilities.length],
      inspectionType: 'Application',
      status: 'Completed',
      startDate: paymentDate.toISOString().split('T')[0],
      paymentDate: paymentDate.toISOString().split('T')[0],
      decisionDate: decisionDate.toISOString().split('T')[0],
      applicantWaitDays,
      nraProcessingDays,
      targetDays,
      processingDays: totalDays,
      onTime: nraProcessingDays <= targetDays,
      stageBreakdown: {
        screening: screeningDays,
        assignment: assignmentDays,
        assessment: assessmentDays,
        review: reviewDays,
        capa: capaDays,
        decision: decisionDays,
      },
    });
  }

  return inspections;
}

// KPI 9: Reports
function generateReports(count: number): GMPInspection[] {
  const inspections: GMPInspection[] = [];
  const reportTypes = ['Approval Certificate', 'Non-Compliance Letter', 'Partial Approval Letter', 'CAPA Request Letter'];
  const facilities = [
    'PharmaCorp Manufacturing', 'GlobalMed Industries', 'BioTech Solutions',
    'MedSupply Co', 'QualityPharm Ltd'
  ];

  for (let i = 0; i < count; i++) {
    const decisionDate = new Date(2024, Math.floor(i / 12), (i % 12) + 1);
    const daysToPublish = 15 + Math.floor(Math.random() * 20);
    const publicationDate = new Date(decisionDate);
    publicationDate.setDate(publicationDate.getDate() + daysToPublish);
    const targetDays = 30;

    inspections.push({
      inspectionNumber: `RPT-2024-${String(i + 1).padStart(4, '0')}`,
      facilityName: facilities[i % facilities.length],
      inspectionType: 'Report',
      status: daysToPublish <= targetDays ? 'Published On Time' : 'Published Late',
      startDate: decisionDate.toISOString().split('T')[0],
      decisionDate: decisionDate.toISOString().split('T')[0],
      publicationDate: publicationDate.toISOString().split('T')[0],
      daysToPublish,
      isOnTime: daysToPublish <= targetDays,
      reportType: reportTypes[i % reportTypes.length],
      letterNumber: `LTR-${2024}-${String(i + 1).padStart(4, '0')}`,
      documentLink: `/documents/report-${i + 1}.pdf`,
    });
  }

  return inspections;
}

export const gmpDrillDownData: Record<string, GMPKPIDrillDownData> = {
  'GMP-KPI-1': {
    kpiId: 'GMP-KPI-1',
    kpiName: 'Percentage of pharmaceutical manufacturing facilities inspected for GMP as per plan',
    currentValue: {
      value: 86.7,
      numerator: 156,
      denominator: 180,
      percentage: 86.7,
    },
    level1: {
      dimension: 'inspection_mode',
      data: [
        { category: 'On-site Domestic', value: 82.1, count: 128, total: 156, percentage: 82.1 },
        { category: 'On-site Foreign', value: 11.5, count: 18, total: 156, percentage: 11.5 },
        { category: 'Joint On-site Foreign', value: 6.4, count: 10, total: 156, percentage: 6.4 },
      ],
      drillable: true,
      nextLevel: 'time_period',
    },
    dimensionViews: [
      {
        id: 'inspection_mode',
        label: 'Inspection Mode',
        description: 'Breakdown by inspection mode',
        sourceField: 'inspectionMode',
        data: [
          { category: 'On-site Domestic', value: 82.1, count: 128, total: 156, percentage: 82.1 },
          { category: 'On-site Foreign', value: 11.5, count: 18, total: 156, percentage: 11.5 },
          { category: 'Joint On-site Foreign', value: 6.4, count: 10, total: 156, percentage: 6.4 },
        ],
      },
      {
        id: 'time_period',
        label: 'Time Period',
        description: 'Quarterly breakdown',
        data: [
          { category: 'Q1 2024', value: 86.1, count: 142, total: 165, percentage: 86.1 },
          { category: 'Q2 2024', value: 87.1, count: 148, total: 170, percentage: 87.1 },
          { category: 'Q3 2024', value: 87.4, count: 153, total: 175, percentage: 87.4 },
          { category: 'Q4 2024', value: 86.7, count: 156, total: 180, percentage: 86.7 },
        ],
      },
    ],
    level2: {
      dimension: 'time_period',
      parentCategory: 'On-site Domestic',
      data: [
        { category: 'Q1 2024', value: 85.2, count: 115, total: 135, percentage: 85.2 },
        { category: 'Q2 2024', value: 86.5, count: 120, total: 139, percentage: 86.5 },
        { category: 'Q3 2024', value: 87.0, count: 125, total: 144, percentage: 87.0 },
        { category: 'Q4 2024', value: 86.3, count: 128, total: 148, percentage: 86.3 },
      ],
      drillable: true,
      nextLevel: 'individual_inspections',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'Q4 2024',
      data: [
        { stage: 'Planning', days: 5, target: 7, onTime: true },
        { stage: 'Assignment', days: 8, target: 10, onTime: true },
        { stage: 'Inspection', days: 25, target: 30, onTime: true },
        { stage: 'Report Writing', days: 12, target: 15, onTime: true },
        { stage: 'Decision', days: 10, target: 12, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_inspections',
    },
    level4: {
      dimension: 'individual_inspections',
      parentCategory: 'Q4 2024',
      data: kpi1Inspections.slice(0, 20),
      drillable: false,
    },
    rootCauseAnalysis: [
      {
        dimension: 'By Facility Type',
        items: [
          { category: 'Manufacturing', value: 88.5, count: 77, total: 87, percentage: 88.5 },
          { category: 'Packaging', value: 85.0, count: 51, total: 60, percentage: 85.0 },
          { category: 'Testing', value: 82.1, count: 28, total: 34, percentage: 82.1 },
        ],
      },
    ],
  },

  'GMP-KPI-2': {
    kpiId: 'GMP-KPI-2',
    kpiName: 'Percentage of complaint-triggered GMP inspections conducted',
    currentValue: {
      value: 81.0,
      numerator: 34,
      denominator: 42,
      percentage: 81.0,
    },
    level1: {
      dimension: 'location',
      data: [
        { category: 'Domestic', value: 85.3, count: 29, total: 34, percentage: 85.3 },
        { category: 'Foreign', value: 14.7, count: 5, total: 34, percentage: 14.7 },
      ],
      drillable: true,
      nextLevel: 'investigation_type',
    },
    dimensionViews: [
      {
        id: 'location',
        label: 'Location',
        description: 'Domestic vs Foreign inspections',
        sourceField: 'location',
        data: [
          { category: 'Domestic', value: 85.3, count: 29, total: 34, percentage: 85.3 },
          { category: 'Foreign', value: 14.7, count: 5, total: 34, percentage: 14.7 },
        ],
      },
      {
        id: 'investigation_type',
        label: 'Investigation Type',
        description: 'Type of complaint',
        sourceField: 'investigationType',
        data: [
          { category: 'Product Quality', value: 35.3, count: 12, total: 34, percentage: 35.3 },
          { category: 'Adverse Events', value: 29.4, count: 10, total: 34, percentage: 29.4 },
          { category: 'Manufacturing Defects', value: 26.5, count: 9, total: 34, percentage: 26.5 },
          { category: 'Other', value: 8.8, count: 3, total: 34, percentage: 8.8 },
        ],
      },
      {
        id: 'status',
        label: 'Status',
        description: 'Inspection status',
        sourceField: 'status',
        data: [
          { category: 'Pending', value: 11.8, count: 4, total: 34, percentage: 11.8 },
          { category: 'In Progress', value: 17.6, count: 6, total: 34, percentage: 17.6 },
          { category: 'Completed', value: 58.8, count: 20, total: 34, percentage: 58.8 },
          { category: 'Closed', value: 11.8, count: 4, total: 34, percentage: 11.8 },
        ],
      },
    ],
    level2: {
      dimension: 'investigation_type',
      parentCategory: 'Domestic',
      data: [
        { category: 'Product Quality', value: 37.9, count: 11, total: 29, percentage: 37.9 },
        { category: 'Adverse Events', value: 31.0, count: 9, total: 29, percentage: 31.0 },
        { category: 'Manufacturing Defects', value: 24.1, count: 7, total: 29, percentage: 24.1 },
        { category: 'Other', value: 6.9, count: 2, total: 29, percentage: 6.9 },
      ],
      drillable: true,
      nextLevel: 'status',
    },
    level3: {
      dimension: 'status',
      parentCategory: 'Product Quality',
      data: [
        { stage: 'Complaint Received', days: 0, target: 0, onTime: true },
        { stage: 'Investigation Initiated', days: 2, target: 3, onTime: true },
        { stage: 'Inspection Conducted', days: 8, target: 10, onTime: true },
        { stage: 'Report Completed', days: 5, target: 7, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_complaints',
    },
    level4: {
      dimension: 'individual_complaints',
      parentCategory: 'Product Quality',
      data: generateComplaintInspections(40).slice(0, 15),
      drillable: false,
    },
  },

  'GMP-KPI-3': {
    kpiId: 'GMP-KPI-3',
    kpiName: 'Percentage of GMP on-site inspections waived',
    currentValue: {
      value: 22.7,
      numerator: 45,
      denominator: 198,
      percentage: 22.7,
    },
    level1: {
      dimension: 'waiver_type',
      data: [
        { category: 'New Waiver (NACIW)', value: 55.6, count: 25, total: 45, percentage: 55.6 },
        { category: 'Renewal Waiver (ACIWR)', value: 44.4, count: 20, total: 45, percentage: 44.4 },
      ],
      drillable: true,
      nextLevel: 'reference_authority',
    },
    dimensionViews: [
      {
        id: 'waiver_type',
        label: 'Waiver Type',
        description: 'New vs Renewal waivers',
        sourceField: 'waiverType',
        data: [
          { category: 'New Waiver (NACIW)', value: 55.6, count: 25, total: 45, percentage: 55.6 },
          { category: 'Renewal Waiver (ACIWR)', value: 44.4, count: 20, total: 45, percentage: 44.4 },
        ],
      },
      {
        id: 'reference_authority',
        label: 'Reference Authority',
        description: 'Country/authority providing reference certificate',
        sourceField: 'referenceAuthority',
        data: [
          { category: 'WHO PQ', value: 31.1, count: 14, total: 45, percentage: 31.1 },
          { category: 'US FDA', value: 24.4, count: 11, total: 45, percentage: 24.4 },
          { category: 'EMA', value: 20.0, count: 9, total: 45, percentage: 20.0 },
          { category: 'TGA Australia', value: 13.3, count: 6, total: 45, percentage: 13.3 },
          { category: 'Health Canada', value: 6.7, count: 3, total: 45, percentage: 6.7 },
          { category: 'PIC/S', value: 4.4, count: 2, total: 45, percentage: 4.4 },
        ],
      },
      {
        id: 'status',
        label: 'Status',
        description: 'Waiver decision status',
        sourceField: 'status',
        data: [
          { category: 'Under Review', value: 13.3, count: 6, total: 45, percentage: 13.3 },
          { category: 'Approved', value: 71.1, count: 32, total: 45, percentage: 71.1 },
          { category: 'Rejected', value: 8.9, count: 4, total: 45, percentage: 8.9 },
          { category: 'Completed', value: 6.7, count: 3, total: 45, percentage: 6.7 },
        ],
      },
    ],
    level2: {
      dimension: 'reference_authority',
      parentCategory: 'New Waiver (NACIW)',
      data: [
        { category: 'WHO PQ', value: 36.0, count: 9, total: 25, percentage: 36.0 },
        { category: 'US FDA', value: 28.0, count: 7, total: 25, percentage: 28.0 },
        { category: 'EMA', value: 24.0, count: 6, total: 25, percentage: 24.0 },
        { category: 'TGA Australia', value: 8.0, count: 2, total: 25, percentage: 8.0 },
        { category: 'Health Canada', value: 4.0, count: 1, total: 25, percentage: 4.0 },
      ],
      drillable: true,
      nextLevel: 'status',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'WHO PQ',
      data: [
        { stage: 'Application Received', days: 0, target: 0, onTime: true },
        { stage: 'Document Review', days: 8, target: 10, onTime: true },
        { stage: 'Reference Verification', days: 5, target: 7, onTime: true },
        { stage: 'Decision', days: 7, target: 10, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_waivers',
    },
    level4: {
      dimension: 'individual_waivers',
      parentCategory: 'WHO PQ',
      data: generateWaiverInspections(45).slice(0, 15),
      drillable: false,
    },
  },

  'GMP-KPI-4': {
    kpiId: 'GMP-KPI-4',
    kpiName: 'Percentage of facilities compliant with GMP requirements',
    currentValue: {
      value: 87.7,
      numerator: 542,
      denominator: 618,
      percentage: 87.7,
    },
    level1: {
      dimension: 'inspection_mode',
      data: [
        { category: 'On-site Domestic', value: 82.1, count: 445, total: 542, percentage: 82.1 },
        { category: 'On-site Foreign', value: 11.4, count: 62, total: 542, percentage: 11.4 },
        { category: 'Joint On-site', value: 3.5, count: 19, total: 542, percentage: 3.5 },
        { category: 'Remote/Desk-based', value: 3.0, count: 16, total: 542, percentage: 3.0 },
      ],
      drillable: true,
      nextLevel: 'compliance_outcome',
    },
    dimensionViews: [
      {
        id: 'inspection_mode',
        label: 'Inspection Mode',
        description: 'Mode of inspection',
        sourceField: 'inspectionMode',
        data: [
          { category: 'On-site Domestic', value: 82.1, count: 445, total: 542, percentage: 82.1 },
          { category: 'On-site Foreign', value: 11.4, count: 62, total: 542, percentage: 11.4 },
          { category: 'Joint On-site', value: 3.5, count: 19, total: 542, percentage: 3.5 },
          { category: 'Remote/Desk-based', value: 3.0, count: 16, total: 542, percentage: 3.0 },
        ],
      },
      {
        id: 'compliance_outcome',
        label: 'Compliance Outcome',
        description: 'Compliance status',
        sourceField: 'complianceStatus',
        data: [
          { category: 'Fully Compliant (ALEG)', value: 75.5, count: 409, total: 542, percentage: 75.5 },
          { category: 'Partially Compliant (PALG)', value: 12.2, count: 66, total: 542, percentage: 12.2 },
          { category: 'Non-Compliant (NCLG)', value: 8.1, count: 44, total: 542, percentage: 8.1 },
          { category: 'CAPA Required', value: 2.6, count: 14, total: 542, percentage: 2.6 },
          { category: 'Under Review', value: 1.5, count: 8, total: 542, percentage: 1.5 },
        ],
      },
      {
        id: 'product_type',
        label: 'Product Type',
        description: 'Type of products manufactured',
        sourceField: 'productType',
        data: [
          { category: 'Human Medicines', value: 68.5, count: 371, total: 542, percentage: 68.5 },
          { category: 'Veterinary Medicines', value: 18.1, count: 98, total: 542, percentage: 18.1 },
          { category: 'Medical Devices', value: 9.6, count: 52, total: 542, percentage: 9.6 },
          { category: 'Cosmetics', value: 3.9, count: 21, total: 542, percentage: 3.9 },
        ],
      },
    ],
    level2: {
      dimension: 'compliance_outcome',
      parentCategory: 'On-site Domestic',
      data: [
        { category: 'Fully Compliant (ALEG)', value: 76.2, count: 339, total: 445, percentage: 76.2 },
        { category: 'Partially Compliant (PALG)', value: 12.6, count: 56, total: 445, percentage: 12.6 },
        { category: 'Non-Compliant (NCLG)', value: 7.9, count: 35, total: 445, percentage: 7.9 },
        { category: 'CAPA Required', value: 2.5, count: 11, total: 445, percentage: 2.5 },
        { category: 'Under Review', value: 0.9, count: 4, total: 445, percentage: 0.9 },
      ],
      drillable: true,
      nextLevel: 'product_type',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'Fully Compliant (ALEG)',
      data: [
        { stage: 'Inspection', days: 25, target: 30, onTime: true },
        { stage: 'Report Writing', days: 12, target: 15, onTime: true },
        { stage: 'Review', days: 8, target: 10, onTime: true },
        { stage: 'Decision', days: 10, target: 12, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_facilities',
    },
    level4: {
      dimension: 'individual_facilities',
      parentCategory: 'Fully Compliant (ALEG)',
      data: generateGMPInspections(60, 'FAC-2024', {
        complianceStatuses: ['ALEG'],
      }).slice(0, 20),
      drillable: false,
    },
  },

  'GMP-KPI-5': {
    kpiId: 'GMP-KPI-5',
    kpiName: 'Percentage of final CAPA decisions issued within a specified timeline',
    currentValue: {
      value: 85.6,
      numerator: 89,
      denominator: 104,
      percentage: 85.6,
    },
    level1: {
      dimension: 'inspection_category',
      data: [
        { category: 'Direct Inspections', value: 85.4, count: 76, total: 89, percentage: 85.4 },
        { category: 'Joint Inspections', value: 14.6, count: 13, total: 89, percentage: 14.6 },
      ],
      drillable: true,
      nextLevel: 'capa_status',
    },
    dimensionViews: [
      {
        id: 'inspection_category',
        label: 'Inspection Category',
        description: 'Direct vs Joint inspections',
        data: [
          { category: 'Direct Inspections', value: 85.4, count: 76, total: 89, percentage: 85.4 },
          { category: 'Joint Inspections', value: 14.6, count: 13, total: 89, percentage: 14.6 },
        ],
      },
      {
        id: 'capa_status',
        label: 'CAPA Status',
        description: 'Current CAPA status',
        sourceField: 'capaStatus',
        data: [
          { category: 'Requested (CAPREQ)', value: 8.7, count: 9, total: 104, percentage: 8.7 },
          { category: 'Submitted (CAPS)', value: 75.0, count: 78, total: 104, percentage: 75.0 },
          { category: 'Rejected (CAPREJ)', value: 4.8, count: 5, total: 104, percentage: 4.8 },
          { category: 'Implementation Requested', value: 6.7, count: 7, total: 104, percentage: 6.7 },
          { category: 'Implementation Submitted', value: 3.8, count: 4, total: 104, percentage: 3.8 },
          { category: 'Completed', value: 0.96, count: 1, total: 104, percentage: 0.96 },
        ],
      },
      {
        id: 'timeline_performance',
        label: 'Timeline Performance',
        description: 'On-time vs delayed decisions',
        data: [
          { category: 'Within Timeline', value: 85.6, count: 89, total: 104, percentage: 85.6 },
          { category: 'Exceeded Timeline', value: 12.5, count: 13, total: 104, percentage: 12.5 },
          { category: 'Pending', value: 1.9, count: 2, total: 104, percentage: 1.9 },
        ],
      },
    ],
    level2: {
      dimension: 'capa_status',
      parentCategory: 'Direct Inspections',
      data: [
        { category: 'Requested (CAPREQ)', value: 9.2, count: 7, total: 76, percentage: 9.2 },
        { category: 'Submitted (CAPS)', value: 76.3, count: 58, total: 76, percentage: 76.3 },
        { category: 'Rejected (CAPREJ)', value: 5.3, count: 4, total: 76, percentage: 5.3 },
        { category: 'Implementation Requested', value: 6.6, count: 5, total: 76, percentage: 6.6 },
        { category: 'Completed', value: 2.6, count: 2, total: 76, percentage: 2.6 },
      ],
      drillable: true,
      nextLevel: 'timeline_performance',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'Submitted (CAPS)',
      data: [
        { stage: 'CAPA Requested', days: 0, target: 0, onTime: true },
        { stage: 'CAPA Submitted', days: 22, target: 30, onTime: true },
        { stage: 'CAPA Review', days: 5, target: 7, onTime: true },
        { stage: 'Decision Issued', days: 3, target: 5, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_capa',
    },
    level4: {
      dimension: 'individual_capa',
      parentCategory: 'Submitted (CAPS)',
      data: generateCAPACases(50).slice(0, 20),
      drillable: false,
    },
  },

  'GMP-KPI-6': {
    kpiId: 'GMP-KPI-6',
    kpiName: 'Percentage of GMP inspection applications completed within the set timeline',
    currentValue: {
      value: 86.2,
      numerator: 168,
      denominator: 195,
      percentage: 86.2,
    },
    level1: {
      dimension: 'applicant_type',
      data: [
        { category: 'Domestic Applicants', value: 82.1, count: 138, total: 168, percentage: 82.1 },
        { category: 'Foreign Direct', value: 11.9, count: 20, total: 168, percentage: 11.9 },
        { category: 'Foreign Reliance', value: 6.0, count: 10, total: 168, percentage: 6.0 },
      ],
      drillable: true,
      nextLevel: 'processing_stage',
    },
    dimensionViews: [
      {
        id: 'applicant_type',
        label: 'Applicant Type',
        description: 'Domestic vs Foreign applicants',
        data: [
          { category: 'Domestic Applicants', value: 82.1, count: 138, total: 168, percentage: 82.1 },
          { category: 'Foreign Direct', value: 11.9, count: 20, total: 168, percentage: 11.9 },
          { category: 'Foreign Reliance', value: 6.0, count: 10, total: 168, percentage: 6.0 },
        ],
      },
      {
        id: 'processing_stage',
        label: 'Processing Stage',
        description: 'Stage-by-stage breakdown',
        data: [
          { category: 'Screening', value: 8.5, count: 0, total: 0, percentage: 8.5 },
          { category: 'Assignment', value: 10.2, count: 0, total: 0, percentage: 10.2 },
          { category: 'Assessment', value: 45.8, count: 0, total: 0, percentage: 45.8 },
          { category: 'Review', value: 12.5, count: 0, total: 0, percentage: 12.5 },
          { category: 'CAPA Processing', value: 8.3, count: 0, total: 0, percentage: 8.3 },
          { category: 'Decision', value: 14.7, count: 0, total: 0, percentage: 14.7 },
        ],
      },
      {
        id: 'timeline_performance',
        label: 'Timeline Performance',
        description: 'Performance vs target',
        data: [
          { category: 'Well Within (<80%)', value: 25.0, count: 42, total: 168, percentage: 25.0 },
          { category: 'Within Timeline', value: 61.2, count: 103, total: 168, percentage: 61.2 },
          { category: 'Slightly Exceeded', value: 10.7, count: 18, total: 168, percentage: 10.7 },
          { category: 'Significantly Exceeded', value: 3.0, count: 5, total: 168, percentage: 3.0 },
        ],
      },
    ],
    level2: {
      dimension: 'processing_stage',
      parentCategory: 'Domestic Applicants',
      data: [
        { category: 'Screening', value: 8.2, count: 0, total: 0, percentage: 8.2 },
        { category: 'Assignment', value: 9.8, count: 0, total: 0, percentage: 9.8 },
        { category: 'Assessment', value: 46.5, count: 0, total: 0, percentage: 46.5 },
        { category: 'Review', value: 13.0, count: 0, total: 0, percentage: 13.0 },
        { category: 'Decision', value: 22.5, count: 0, total: 0, percentage: 22.5 },
      ],
      drillable: true,
      nextLevel: 'timeline_performance',
    },
    level3: {
      dimension: 'stage_breakdown',
      parentCategory: 'Screening',
      data: [
        { stage: 'Screening', days: 8, target: 10, onTime: true },
        { stage: 'Assignment', days: 9, target: 12, onTime: true },
        { stage: 'Assessment', days: 42, target: 50, onTime: true },
        { stage: 'Review', days: 12, target: 15, onTime: true },
        { stage: 'Decision', days: 19, target: 20, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'Domestic Applicants',
      data: generateApplicationsWithStages(55).slice(0, 20),
      drillable: false,
    },
  },

  'GMP-KPI-7': {
    kpiId: 'GMP-KPI-7',
    kpiName: 'Average turnaround time to complete GMP applications',
    currentValue: {
      value: 64.7,
      numerator: 10875,
      denominator: 168,
      average: 64.7,
    },
    level1: {
      dimension: 'inspection_mode',
      data: [
        { category: 'On-site Domestic', value: 62.5, count: 0, total: 0, percentage: 0 },
        { category: 'On-site Foreign', value: 71.3, count: 0, total: 0, percentage: 0 },
        { category: 'Joint On-site Foreign', value: 68.9, count: 0, total: 0, percentage: 0 },
      ],
      drillable: true,
      nextLevel: 'processing_stage',
    },
    dimensionViews: [
      {
        id: 'inspection_mode',
        label: 'Inspection Mode',
        description: 'Average by inspection mode',
        data: [
          { category: 'On-site Domestic', value: 62.5, count: 0, total: 0, percentage: 0 },
          { category: 'On-site Foreign', value: 71.3, count: 0, total: 0, percentage: 0 },
          { category: 'Joint On-site Foreign', value: 68.9, count: 0, total: 0, percentage: 0 },
        ],
      },
      {
        id: 'processing_stage',
        label: 'Processing Stage',
        description: 'Average contribution by stage',
        data: [
          { category: 'Screening', value: 8.5, count: 0, total: 0, percentage: 13.1 },
          { category: 'Assignment', value: 10.2, count: 0, total: 0, percentage: 15.8 },
          { category: 'Assessment', value: 29.6, count: 0, total: 0, percentage: 45.7 },
          { category: 'Review', value: 8.1, count: 0, total: 0, percentage: 12.5 },
          { category: 'CAPA Processing', value: 3.2, count: 0, total: 0, percentage: 4.9 },
          { category: 'Decision', value: 5.1, count: 0, total: 0, percentage: 7.9 },
        ],
      },
      {
        id: 'quarter',
        label: 'Quarter',
        description: 'Quarterly trend',
        data: [
          { category: 'Q1 2024', value: 69.0, count: 0, total: 0, percentage: 0 },
          { category: 'Q2 2024', value: 67.0, count: 0, total: 0, percentage: 0 },
          { category: 'Q3 2024', value: 66.0, count: 0, total: 0, percentage: 0 },
          { category: 'Q4 2024', value: 64.7, count: 0, total: 0, percentage: 0 },
        ],
      },
    ],
    level2: {
      dimension: 'processing_stage',
      parentCategory: 'On-site Domestic',
      data: [
        { category: 'Screening', value: 8.0, count: 0, total: 0, percentage: 12.8 },
        { category: 'Assignment', value: 9.5, count: 0, total: 0, percentage: 15.2 },
        { category: 'Assessment', value: 28.5, count: 0, total: 0, percentage: 45.6 },
        { category: 'Review', value: 8.0, count: 0, total: 0, percentage: 12.8 },
        { category: 'Decision', value: 8.5, count: 0, total: 0, percentage: 13.6 },
      ],
      drillable: true,
      nextLevel: 'quarter',
    },
    level3: {
      dimension: 'stage_breakdown',
      parentCategory: 'Screening',
      data: [
        { stage: 'Screening', days: 8, target: 10, onTime: true },
        { stage: 'Assignment', days: 9, target: 12, onTime: true },
        { stage: 'Assessment', days: 28, target: 50, onTime: true },
        { stage: 'Review', days: 8, target: 15, onTime: true },
        { stage: 'Decision', days: 9, target: 20, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'On-site Domestic',
      data: generateApplicationsWithStages(60).slice(0, 20),
      drillable: false,
    },
  },

  'GMP-KPI-8': {
    kpiId: 'GMP-KPI-8',
    kpiName: 'Median turnaround time to complete GMP inspection applications',
    currentValue: {
      value: 58.0,
      numerator: 0,
      denominator: 0,
      median: 58.0,
    },
    level1: {
      dimension: 'distribution',
      data: [
        { category: '< 30 days', value: 12.5, count: 21, total: 168, percentage: 12.5 },
        { category: '30-60 days', value: 45.2, count: 76, total: 168, percentage: 45.2 },
        { category: '60-90 days', value: 28.6, count: 48, total: 168, percentage: 28.6 },
        { category: '90-120 days', value: 10.7, count: 18, total: 168, percentage: 10.7 },
        { category: '> 120 days', value: 3.0, count: 5, total: 168, percentage: 3.0 },
      ],
      drillable: true,
      nextLevel: 'percentiles',
    },
    dimensionViews: [
      {
        id: 'distribution',
        label: 'Distribution',
        description: 'Processing time distribution',
        data: [
          { category: '< 30 days', value: 12.5, count: 21, total: 168, percentage: 12.5 },
          { category: '30-60 days', value: 45.2, count: 76, total: 168, percentage: 45.2 },
          { category: '60-90 days', value: 28.6, count: 48, total: 168, percentage: 28.6 },
          { category: '90-120 days', value: 10.7, count: 18, total: 168, percentage: 10.7 },
          { category: '> 120 days', value: 3.0, count: 5, total: 168, percentage: 3.0 },
        ],
      },
      {
        id: 'percentiles',
        label: 'Percentiles',
        description: 'Percentile breakdown',
        data: [
          { category: 'P25', value: 45, count: 0, total: 0, percentage: 0 },
          { category: 'P50 (Median)', value: 58, count: 0, total: 0, percentage: 0 },
          { category: 'P75', value: 72, count: 0, total: 0, percentage: 0 },
          { category: 'P90', value: 88, count: 0, total: 0, percentage: 0 },
          { category: 'P95', value: 105, count: 0, total: 0, percentage: 0 },
        ],
      },
      {
        id: 'inspection_type',
        label: 'Inspection Type',
        description: 'Median by inspection type',
        data: [
          { category: 'NLGI', value: 55, count: 0, total: 0, percentage: 0 },
          { category: 'LGRI', value: 58, count: 0, total: 0, percentage: 0 },
          { category: 'NACI', value: 68, count: 0, total: 0, percentage: 0 },
          { category: 'ACRI', value: 65, count: 0, total: 0, percentage: 0 },
        ],
      },
    ],
    level2: {
      dimension: 'percentiles',
      parentCategory: '30-60 days',
      data: [
        { category: 'P25', value: 45, count: 0, total: 0, percentage: 0 },
        { category: 'P50 (Median)', value: 58, count: 0, total: 0, percentage: 0 },
        { category: 'P75', value: 72, count: 0, total: 0, percentage: 0 },
        { category: 'P90', value: 88, count: 0, total: 0, percentage: 0 },
      ],
      drillable: true,
      nextLevel: 'inspection_type',
    },
    level3: {
      dimension: 'outlier_analysis',
      parentCategory: 'P50 (Median)',
      data: [
        { stage: 'Fastest Applications (<P10)', days: 25, target: 58, onTime: true },
        { stage: 'Median Applications (P50)', days: 58, target: 58, onTime: true },
        { stage: 'Slowest Applications (>P90)', days: 95, target: 58, onTime: false },
      ],
      drillable: true,
      nextLevel: 'individual_applications',
    },
    level4: {
      dimension: 'individual_applications',
      parentCategory: 'P50 (Median)',
      data: generateApplicationsWithStages(50).slice(0, 20),
      drillable: false,
    },
  },

  'GMP-KPI-9': {
    kpiId: 'GMP-KPI-9',
    kpiName: 'Percentage of GMP inspection reports published within a specified timeline',
    currentValue: {
      value: 82.8,
      numerator: 512,
      denominator: 618,
      percentage: 82.8,
    },
    level1: {
      dimension: 'inspection_mode',
      data: [
        { category: 'On-site Domestic', value: 83.0, count: 425, total: 512, percentage: 83.0 },
        { category: 'On-site Foreign', value: 10.2, count: 52, total: 512, percentage: 10.2 },
        { category: 'Joint Inspections', value: 4.1, count: 21, total: 512, percentage: 4.1 },
        { category: 'Remote/Desk-based', value: 2.7, count: 14, total: 512, percentage: 2.7 },
      ],
      drillable: true,
      nextLevel: 'publication_status',
    },
    dimensionViews: [
      {
        id: 'inspection_mode',
        label: 'Inspection Mode',
        description: 'Mode of inspection',
        sourceField: 'inspectionMode',
        data: [
          { category: 'On-site Domestic', value: 83.0, count: 425, total: 512, percentage: 83.0 },
          { category: 'On-site Foreign', value: 10.2, count: 52, total: 512, percentage: 10.2 },
          { category: 'Joint Inspections', value: 4.1, count: 21, total: 512, percentage: 4.1 },
          { category: 'Remote/Desk-based', value: 2.7, count: 14, total: 512, percentage: 2.7 },
        ],
      },
      {
        id: 'publication_status',
        label: 'Publication Status',
        description: 'On-time vs late publication',
        sourceField: 'status',
        data: [
          { category: 'Published On Time', value: 82.8, count: 512, total: 618, percentage: 82.8 },
          { category: 'Published Late', value: 14.2, count: 88, total: 618, percentage: 14.2 },
          { category: 'Pending Publication', value: 2.9, count: 18, total: 618, percentage: 2.9 },
        ],
      },
      {
        id: 'report_type',
        label: 'Report Type',
        description: 'Type of report published',
        sourceField: 'reportType',
        data: [
          { category: 'Approval Certificates', value: 65.2, count: 334, total: 512, percentage: 65.2 },
          { category: 'Non-Compliance Letters', value: 18.0, count: 92, total: 512, percentage: 18.0 },
          { category: 'Partial Approval Letters', value: 12.5, count: 64, total: 512, percentage: 12.5 },
          { category: 'CAPA Request Letters', value: 4.3, count: 22, total: 512, percentage: 4.3 },
        ],
      },
    ],
    level2: {
      dimension: 'publication_status',
      parentCategory: 'On-site Domestic',
      data: [
        { category: 'Published On Time', value: 83.5, count: 354, total: 425, percentage: 83.5 },
        { category: 'Published Late', value: 14.1, count: 60, total: 425, percentage: 14.1 },
        { category: 'Pending Publication', value: 2.4, count: 10, total: 425, percentage: 2.4 },
      ],
      drillable: true,
      nextLevel: 'report_type',
    },
    level3: {
      dimension: 'processing_stage',
      parentCategory: 'Published On Time',
      data: [
        { stage: 'Decision Made', days: 0, target: 0, onTime: true },
        { stage: 'Report Preparation', days: 12, target: 15, onTime: true },
        { stage: 'Review & Approval', days: 8, target: 10, onTime: true },
        { stage: 'Publication', days: 5, target: 5, onTime: true },
      ],
      drillable: true,
      nextLevel: 'individual_reports',
    },
    level4: {
      dimension: 'individual_reports',
      parentCategory: 'Published On Time',
      data: generateReports(50).slice(0, 20),
      drillable: false,
    },
  },
};

