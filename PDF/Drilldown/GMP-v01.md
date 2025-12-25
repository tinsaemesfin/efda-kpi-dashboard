# 📊 GMP KPIs Drilldown Analysis - Backend Data Mapping

Based on comprehensive analysis of the backend codebase, here's a detailed breakdown of available data and drilldown mechanisms for each GMP KPI.

---

## 🗂️ Core Data Model Summary

### Primary Entities Available:

| Entity | Schema | Key Purpose |
|--------|--------|-------------|
| `Inspection` | `inspection.inspection` | Main GMP inspection record |
| `InspectionType` | `common.inspection_type` | Classification (NLGI, LGRI, NACI, etc.) |
| `InspectionStatus` | `common.inspection_status` | Workflow status (RQST, ALEG, etc.) |
| `InspectionFacility` | `inspection.inspection_facility` | Links to domestic facilities |
| `InspectionAbroadFacility` | `inspection.inspection_abroad_facility` | Links to foreign manufacturers |
| `InspectionCapa` | `inspection.inspection_capa` | CAPA tracking |
| `InspectionAssignment` | `inspection.inspection_assignment` | Assignment timeline |
| `InspectionLetter` | `inspection.inspection_letter` | Letter/Certificate generation |
| `InspectionPayment` | `inspection.inspection_payment` | Payment tracking |
| `StatusLog` | `logging.license_application_status_log` | Complete status history |
| `vwInspectionProcessingTime` | `inspection.vw_inspection_processing_time` | Processing time breakdown |
| `vwInspectionLog` | `logging.vw_inspection_log` | Status change history |

### Inspection Types (from `InspectionTypes.cs`):

```csharp
NewLocalGMPInspection = "NLGI"         // On-site domestic
LocalGMPRenewalInspection = "LGRI"     // On-site domestic renewal
NewAbroadCGMPInspection = "NACI"       // On-site foreign
AbroadCGMPRenewalInspection = "ACRI"   // On-site foreign renewal
NewAbroadCGMPInspectionWaiver = "NACIW"    // Remote/desk-based waiver
AbroadCGMPInspectionWaiverRenewal = "ACIWR" // Waiver renewal
InvestigationInspection = "INVI"        // Complaint-triggered
AbroadCGMPLineAdditionInspection = "ACLAI"  // Line addition
```

---

## 🎯 KPI 1: Percentage of Pharmaceutical Manufacturing Facilities Inspected for GMP as per Plan

### Backend Data Available:

**Tables/Views:**
- `inspection.inspection` - Main inspection records
- `inspection.inspection_assignment` - Contains `StartDate`, `DueDate`, `ActualStartDate`, `ActualDueDate`
- `inspection.inspection_facility` - Links to domestic facilities
- `inspection.inspection_abroad_facility` - Links to foreign manufacturers
- `common.inspection_type` - Inspection type classification

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Numerator: Inspections completed per plan
├── Denominator: Total planned inspections
└── Performance: 86.7%

Level 2: By Inspection Mode
├── On-site Domestic (NLGI, LGRI)
│   └── Filter: InspectionTypeCode IN ('NLGI', 'LGRI') AND InspectionFacility != null
├── On-site Foreign (NACI, ACRI)
│   └── Filter: InspectionTypeCode IN ('NACI', 'ACRI') AND InspectionAbroadFacility != null
└── Joint On-site Foreign
    └── Filter: InspectionAssignments.Count > 1 (multiple assignees) AND foreign type

Level 3: By Time Period (Quarterly)
├── Q1 (Jan-Mar): Filter by CreatedDate
├── Q2 (Apr-Jun)
├── Q3 (Jul-Sep)
└── Q4 (Oct-Dec)

Level 4: Individual Inspections
└── Fields: InspectionNumber, FacilityName, InspectionTypeName, 
    Status, AssignedUser, DueDate, CompletionDate
```

### Backend Query Logic:

```sql
-- Numerator: Completed per plan
SELECT COUNT(*) FROM inspection.inspection i
JOIN common.inspection_type it ON i.type_id = it.id
WHERE it.inspection_type_code IN ('NLGI', 'LGRI', 'NACI', 'ACRI')
  AND i.status_id IN (SELECT id FROM common.inspection_status 
                      WHERE inspection_status_code IN ('ALEG', 'PALG', 'NCLG'))
  AND EXTRACT(QUARTER FROM i.created_date) = @quarter
  AND EXTRACT(YEAR FROM i.created_date) = @year

-- Disaggregation by inspection mode
-- Domestic
SELECT COUNT(*) FROM inspection.inspection i
JOIN inspection.inspection_facility if ON i.id = if.inspection_id
WHERE ... (same conditions)

-- Foreign
SELECT COUNT(*) FROM inspection.inspection i
JOIN inspection.inspection_abroad_facility iaf ON i.id = iaf.inspection_id
WHERE ... (same conditions)
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI1DrilldownData {
  summary: {
    numerator: number;
    denominator: number;
    percentage: number;
    period: string;
  };
  byInspectionMode: {
    onsiteDomestic: { count: number; percentage: number };
    onsiteForeign: { count: number; percentage: number };
    jointOnsiteForeign: { count: number; percentage: number };
  };
  byQuarter: Array<{
    quarter: string;
    planned: number;
    completed: number;
    percentage: number;
  }>;
  facilityList: Array<{
    inspectionNumber: string;
    facilityName: string;
    inspectionType: string;
    status: string;
    assignedUser: string;
    startDate: Date;
    completionDate: Date;
    isCompliant: boolean;
  }>;
}
```

---

## 🎯 KPI 2: Percentage of Complaint-Triggered GMP Inspections Conducted

### Backend Data Available:

**Tables/Views:**
- `inspection.inspection` with `InvestigationTypeID` - Links to investigation type
- `common.investigation_type` - Type of investigation (complaint types)
- `inspection_type_code = 'INVI'` - Investigation Inspection type

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Numerator: Complaint-triggered inspections conducted
├── Denominator: Total complaints requiring inspection
└── Performance: 81.0%

Level 2: By Inspection Location
├── Domestic Inspections
│   └── Filter: INVI type + InspectionFacility present
└── Foreign Inspections (any mode)
    └── Filter: INVI type + InspectionAbroadFacility present

Level 3: By Investigation Type
├── Product Quality Complaints
├── Adverse Events
├── Manufacturing Defects
└── Other (from investigation_type lookup)

Level 4: By Status
├── Requested (pending)
├── In Progress
├── Completed
└── Closed

Level 5: Individual Complaints
└── Fields: InspectionNumber, ComplaintType, FacilityName, 
    ReportedDate, InspectionDate, Outcome, Inspector
```

### Backend Query Logic:

```sql
-- All complaint-triggered inspections
SELECT * FROM inspection.inspection i
JOIN common.inspection_type it ON i.type_id = it.id
LEFT JOIN common.investigation_type invt ON i.investigation_type_id = invt.id
WHERE it.inspection_type_code = 'INVI'

-- Status tracking
SELECT 
    CASE WHEN i.status_id IN (completed_statuses) THEN 'Completed'
         WHEN i.status_id IN (in_progress_statuses) THEN 'In Progress'
         ELSE 'Pending' END as status,
    COUNT(*) as count
FROM inspection.inspection i
WHERE i.type_id = (SELECT id FROM common.inspection_type WHERE inspection_type_code = 'INVI')
GROUP BY ...
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI2DrilldownData {
  summary: {
    complaintsReceived: number;
    inspectionsConducted: number;
    percentage: number;
    period: string;
  };
  byLocation: {
    domestic: { count: number; percentage: number };
    foreign: { count: number; percentage: number };
  };
  byInvestigationType: Array<{
    type: string;
    typeCode: string;
    count: number;
    percentage: number;
  }>;
  byStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    closed: number;
  };
  complaintList: Array<{
    inspectionNumber: string;
    investigationType: string;
    facilityName: string;
    dateReceived: Date;
    inspectionDate: Date;
    status: string;
    outcome: string;
    inspector: string;
    responseDays: number;
  }>;
}
```

---

## 🎯 KPI 3: Percentage of GMP On-site Inspections Waived

### Backend Data Available:

**Tables/Views:**
- Waiver inspection types: `NACIW` (New Abroad CGMP Inspection Waiver), `ACIWR` (Abroad CGMP Inspection Waiver Renewal)
- `inspection.inspection.previous_gmp_certificate_number` - Reference authority certificate
- `inspection.inspection.previous_gmp_issuing_country_id` - Issuing country
- `common.country` - Country lookup

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Numerator: Waived inspections (remote/desk-based)
├── Denominator: Total GMP inspection decisions
└── Performance: 22.7%

Level 2: By Waiver Type
├── New Waiver Applications (NACIW)
│   └── First-time reliance on reference authority
└── Renewal Waivers (ACIWR)
    └── Subsequent renewals based on prior waiver

Level 3: By Reference Authority Country
├── WHO Prequalified
├── US FDA
├── EMA
├── TGA Australia
├── Health Canada
├── PIC/S Members
└── Other (from previous_gmp_issuing_country_id)

Level 4: By Status
├── Under Review
├── Waiver Approved
├── Waiver Rejected (required on-site)
└── Completed

Level 5: Individual Waivers
└── Fields: InspectionNumber, ManufacturerName, Country, 
    ReferenceAuthority, CertificateNumber, DecisionDate
```

### Backend Query Logic:

```sql
-- Waiver inspections
SELECT 
    i.id,
    i.inspection_number,
    m.name as manufacturer_name,
    c.name as reference_country,
    i.previous_gmp_certificate_number,
    ist.inspection_status_code,
    i.created_date,
    i.modified_date
FROM inspection.inspection i
JOIN common.inspection_type it ON i.type_id = it.id
LEFT JOIN common.country c ON i.previous_gmp_issuing_country_id = c.id
LEFT JOIN inspection.inspection_abroad_facility iaf ON i.id = iaf.inspection_id
LEFT JOIN inspection.abroad_facility af ON iaf.abroad_facility_id = af.id
LEFT JOIN inspection.manufacturer m ON af.manufacturer_id = m.id
JOIN common.inspection_status ist ON i.status_id = ist.id
WHERE it.inspection_type_code IN ('NACIW', 'ACIWR')

-- Waiver rate calculation
SELECT 
    COUNT(*) FILTER (WHERE it.inspection_type_code IN ('NACIW', 'ACIWR')) as waived,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE it.inspection_type_code IN ('NACIW', 'ACIWR')) * 100.0 / COUNT(*) as waiver_rate
FROM inspection.inspection i
JOIN common.inspection_type it ON i.type_id = it.id
WHERE it.inspection_type_code IN ('NLGI', 'LGRI', 'NACI', 'ACRI', 'NACIW', 'ACIWR')
  AND i.status_id IN (completed_status_ids)
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI3DrilldownData {
  summary: {
    waivedInspections: number;
    totalDecisions: number;
    waiverPercentage: number;
    period: string;
  };
  byWaiverType: {
    newWaiver: { count: number; percentage: number };
    renewalWaiver: { count: number; percentage: number };
  };
  byReferenceAuthority: Array<{
    country: string;
    countryCode: string;
    count: number;
    percentage: number;
  }>;
  byStatus: {
    underReview: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  waiverList: Array<{
    inspectionNumber: string;
    manufacturerName: string;
    referenceCountry: string;
    certificateNumber: string;
    waiverType: string;
    applicationDate: Date;
    decisionDate: Date;
    status: string;
    processingDays: number;
  }>;
}
```

---

## 🎯 KPI 4: Percentage of Facilities Compliant with GMP Requirements

### Backend Data Available:

**Tables/Views:**
- `inspection.inspection_status` - Status codes: `ALEG` (Approval Letter Generated), `PALG` (Partial Approval), `NCLG` (Non-Compliance)
- `vwInspection` - Aggregated inspection view with status
- `inspection.inspection_letter` - Generated letters with dates
- All inspection types for disaggregation

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Numerator: Compliant facilities
├── Denominator: Total inspected facilities
└── Performance: 87.7%

Level 2: By Inspection Mode
├── On-site Domestic: (NLGI, LGRI) with ALEG status
├── On-site Foreign: (NACI, ACRI) with ALEG status
├── Joint On-site Foreign: Multiple assignees + foreign
└── Remote/Desk-based: (NACIW, ACIWR) with ALEG status

Level 3: By Compliance Outcome
├── Fully Compliant (ALEG)
├── Partially Compliant (PALG)
├── Non-Compliant (NCLG)
├── CAPA Required (CAPS, CAPREQ)
└── Under Review

Level 4: By Product Type
├── Human Medicines
├── Veterinary Medicines
├── Medical Devices
├── Cosmetics
└── (from product_type_id through facility)

Level 5: Individual Facilities
└── Fields: FacilityName, InspectionNumber, ComplianceStatus,
    InspectionDate, CertificateNumber, ExpiryDate, Deficiencies
```

### Backend Query Logic:

```sql
-- Compliance summary
SELECT 
    ist.inspection_status_code,
    ist.name as status_name,
    COUNT(*) as count
FROM inspection.inspection i
JOIN common.inspection_type it ON i.type_id = it.id
JOIN common.inspection_status ist ON i.status_id = ist.id
WHERE it.inspection_type_code IN ('NLGI', 'LGRI', 'NACI', 'ACRI', 'NACIW', 'ACIWR')
  AND ist.inspection_status_code IN ('ALEG', 'PALG', 'NCLG', 'CAPS', 'REJ')
GROUP BY ist.inspection_status_code, ist.name

-- Compliant facilities (ALEG = Approval Letter Generated)
SELECT COUNT(*) FROM inspection.inspection i
JOIN common.inspection_type it ON i.type_id = it.id
JOIN common.inspection_status ist ON i.status_id = ist.id
WHERE it.inspection_type_code IN ('NLGI', 'LGRI', 'NACI', 'ACRI', 'NACIW', 'ACIWR')
  AND ist.inspection_status_code = 'ALEG'
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI4DrilldownData {
  summary: {
    compliantFacilities: number;
    totalInspected: number;
    complianceRate: number;
    reportingYear: number;
  };
  byInspectionMode: {
    onsiteDomestic: { total: number; compliant: number; rate: number };
    onsiteForeign: { total: number; compliant: number; rate: number };
    jointOnsite: { total: number; compliant: number; rate: number };
    remoteDeskBased: { total: number; compliant: number; rate: number };
  };
  byComplianceOutcome: {
    fullyCompliant: { count: number; percentage: number };
    partiallyCompliant: { count: number; percentage: number };
    nonCompliant: { count: number; percentage: number };
    capaRequired: { count: number; percentage: number };
    underReview: { count: number; percentage: number };
  };
  byProductType: Array<{
    productType: string;
    total: number;
    compliant: number;
    rate: number;
  }>;
  facilityList: Array<{
    facilityName: string;
    inspectionNumber: string;
    inspectionType: string;
    complianceStatus: string;
    inspectionDate: Date;
    certificateNumber: string;
    expiryDate: Date;
    deficiencyCount: number;
    capaStatus: string;
  }>;
}
```

---

## 🎯 KPI 5: Percentage of Final CAPA Decisions Issued Within Specified Timeline

### Backend Data Available:

**Tables/Views:**
- `inspection.inspection_capa` - CAPA tracking with:
  - `capa_due_date` - CAPA submission deadline
  - `capa_doc_id` - CAPA document submitted
  - `implementation_report_due_date` - Implementation report deadline
  - `implementation_report_doc_id` - Implementation report document
- `logging.license_application_status_log` - Status change timestamps for timeline calculation
- Status codes: `CAPREQ`, `CAPS`, `CAPREJ`, `IMRREQ`, `IMRS`, `IMRREJ`

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Numerator: CAPA decisions within timeline
├── Denominator: Total CAPA responses received
└── Performance: 85.6%

Level 2: By Inspection Category
├── Direct Inspections (Domestic + Foreign)
│   └── CAPA from own inspections
└── Joint Inspections (Reliance, REC-led)
    └── CAPA from collaborative inspections

Level 3: By CAPA Status
├── CAPA Plan Requested (CAPREQ)
├── CAPA Plan Submitted (CAPS)
├── CAPA Plan Rejected (CAPREJ)
├── Implementation Report Requested (IMRREQ)
├── Implementation Report Submitted (IMRS)
└── Implementation Report Rejected (IMRREJ)

Level 4: By Timeline Performance
├── Within Timeline (on-time decisions)
├── Exceeded Timeline (late decisions)
└── Pending (awaiting decision)

Level 5: Individual CAPA Cases
└── Fields: InspectionNumber, FacilityName, CapaDueDate,
    SubmissionDate, DecisionDate, ProcessingDays, OnTime
```

### Backend Query Logic:

```sql
-- CAPA timeline tracking (using status log)
WITH capa_timeline AS (
    SELECT 
        ic.inspection_id,
        ic.capa_due_date,
        ic.created_date as capa_requested_date,
        -- Find when CAPA was submitted
        (SELECT MIN(sl.created_date) 
         FROM logging.license_application_status_log sl 
         WHERE sl.entity_id = ic.inspection_id 
           AND sl.entity_type = 'Inspection'
           AND sl.new_value IN (SELECT id::text FROM common.inspection_status 
                                WHERE inspection_status_code = 'CAPS')) as capa_submitted_date,
        -- Find when decision was made
        (SELECT MIN(sl.created_date) 
         FROM logging.license_application_status_log sl 
         WHERE sl.entity_id = ic.inspection_id 
           AND sl.entity_type = 'Inspection'
           AND sl.new_value IN (SELECT id::text FROM common.inspection_status 
                                WHERE inspection_status_code IN ('ALEG', 'NCLG', 'FFI'))) as decision_date
    FROM inspection.inspection_capa ic
)
SELECT 
    *,
    EXTRACT(DAY FROM (decision_date - capa_submitted_date)) as processing_days,
    CASE WHEN decision_date <= capa_due_date THEN true ELSE false END as within_timeline
FROM capa_timeline
WHERE decision_date IS NOT NULL
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI5DrilldownData {
  summary: {
    withinTimeline: number;
    totalCapaResponses: number;
    percentage: number;
    period: string;
    targetDays: number;
  };
  byInspectionCategory: {
    directInspections: { 
      domestic: { count: number; withinTimeline: number; rate: number };
      foreign: { count: number; withinTimeline: number; rate: number };
    };
    jointInspections: { count: number; withinTimeline: number; rate: number };
  };
  byCapaStatus: {
    requested: number;
    submitted: number;
    rejected: number;
    implementationRequested: number;
    implementationSubmitted: number;
    implementationRejected: number;
    completed: number;
  };
  byTimelinePerformance: {
    withinTimeline: { count: number; avgDays: number };
    exceededTimeline: { count: number; avgDays: number; avgDelayDays: number };
    pending: number;
  };
  capaList: Array<{
    inspectionNumber: string;
    facilityName: string;
    capaRequestedDate: Date;
    capaDueDate: Date;
    capaSubmittedDate: Date;
    decisionDate: Date;
    processingDays: number;
    isWithinTimeline: boolean;
    delayDays: number;
    currentStatus: string;
  }>;
}
```

---

## 🎯 KPI 6: Percentage of GMP Inspection Applications Completed Within Set Timeline

### Backend Data Available:

**Tables/Views:**
- `vw_inspection_processing_time` - Comprehensive processing time breakdown:
  - `screener_assignment_days`
  - `screening_time_days`
  - `inspector_assignment_prep_days`
  - `gmp_inspector_assessment_days`
  - `taskforce_review_days`
  - `capa_assignment_days`
  - `capa_gmp_assessment_days`
  - `daskhead_decision_days`
  - `leo_decision_days`
  - `total_applicant_response_days` (excluded from NRA time)
  - `total_processing_days`
- `inspection.inspection_payment` - Payment timestamp (clock start)
- `inspection.inspection_letter` - Decision timestamp (clock end)

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Numerator: Applications completed within timeline
├── Denominator: Total completed applications
└── Performance: 86.2%

Level 2: By Applicant Type
├── Domestic Applicants (NLGI, LGRI)
├── Foreign - Direct Review (NACI, ACRI)
└── Foreign - Reliance-based (NACIW, ACIWR)

Level 3: By Processing Stage
├── Screening Phase
│   └── Time: screener_assignment_days + screening_time_days
├── Inspector Assignment
│   └── Time: inspector_assignment_prep_days
├── GMP Assessment
│   └── Time: gmp_inspector_assessment_days
├── Task Force Review
│   └── Time: taskforce_review_days
├── CAPA Processing (if applicable)
│   └── Time: capa_assignment_days + capa_gmp_assessment_days
└── Decision Phase
    └── Time: daskhead_decision_days + leo_decision_days

Level 4: By Timeline Performance
├── Well Within Timeline (< 80% of target)
├── Within Timeline (< 100% of target)
├── Slightly Exceeded (100-120% of target)
└── Significantly Exceeded (> 120% of target)

Level 5: Individual Applications
└── Fields: InspectionNumber, FacilityName, PaymentDate,
    DecisionDate, TotalDays, TargetDays, StageBreakdown
```

### Backend Query Logic:

```sql
-- From vw_inspection_processing_time
SELECT 
    ipt.id,
    ipt.inspection_number,
    ipt.total_processing_days,
    ipt.total_applicant_lag_time as applicant_wait_time,
    (ipt.total_processing_days - ipt.total_applicant_lag_time) as nra_processing_days,
    -- Stage breakdown
    ipt.screener_assignment_days + ipt.screening_time_days as screening_phase,
    ipt.inspector_assignment_prep_days as assignment_phase,
    ipt.gmp_inspector_assessment_days as assessment_phase,
    ipt.taskforce_review_days as review_phase,
    ipt.capa_assignment_days + ipt.capa_gmp_assessment_days as capa_phase,
    ipt.daskhead_decision_days + ipt.leo_decision_days as decision_phase
FROM inspection.vw_inspection_processing_time ipt
JOIN inspection.inspection i ON ipt.id = i.id
JOIN common.inspection_type it ON i.type_id = it.id
WHERE it.inspection_type_code IN ('NLGI', 'LGRI', 'NACI', 'ACRI', 'NACIW', 'ACIWR')

-- Timeline calculation with target
SELECT 
    ipt.*,
    CASE 
        WHEN it.inspection_type_code IN ('NLGI', 'LGRI') THEN 90  -- domestic target
        WHEN it.inspection_type_code IN ('NACI', 'ACRI') THEN 120  -- foreign target
        ELSE 60  -- waiver target
    END as target_days,
    CASE 
        WHEN (ipt.total_processing_days - ipt.total_applicant_lag_time) <= target_days 
        THEN 'Within Timeline' 
        ELSE 'Exceeded' 
    END as timeline_status
FROM ...
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI6DrilldownData {
  summary: {
    withinTimeline: number;
    totalCompleted: number;
    percentage: number;
    period: string;
  };
  byApplicantType: {
    domesticApplicants: { 
      count: number; 
      withinTimeline: number; 
      percentage: number;
      targetDays: number;
    };
    foreignDirect: { 
      count: number; 
      withinTimeline: number; 
      percentage: number;
      targetDays: number;
    };
    foreignReliance: { 
      count: number; 
      withinTimeline: number; 
      percentage: number;
      targetDays: number;
    };
  };
  byProcessingStage: {
    screening: { avgDays: number; targetDays: number };
    assignment: { avgDays: number; targetDays: number };
    assessment: { avgDays: number; targetDays: number };
    taskForceReview: { avgDays: number; targetDays: number };
    capaProcessing: { avgDays: number; targetDays: number };
    decision: { avgDays: number; targetDays: number };
  };
  byTimelinePerformance: {
    wellWithin: { count: number; percentage: number };
    within: { count: number; percentage: number };
    slightlyExceeded: { count: number; percentage: number };
    significantlyExceeded: { count: number; percentage: number };
  };
  applicationList: Array<{
    inspectionNumber: string;
    facilityName: string;
    applicationType: string;
    paymentDate: Date;
    decisionDate: Date;
    totalDays: number;
    applicantWaitDays: number;
    nraProcessingDays: number;
    targetDays: number;
    isWithinTimeline: boolean;
    stageBreakdown: {
      screening: number;
      assignment: number;
      assessment: number;
      review: number;
      capa: number;
      decision: number;
    };
  }>;
}
```

---

## 🎯 KPI 7: Average Turnaround Time to Complete GMP Applications

### Backend Data Available:

**Same as KPI 6**, but with different aggregation:
- `vw_inspection_processing_time.total_processing_days`
- `vw_inspection_processing_time.total_applicant_lag_time`
- Calculation: `N = Sum of processing days`, `D = Count of applications`

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Total Days: Sum of all processing days
├── Total Applications: Count of completed applications
└── Average: 64.7 days

Level 2: By Inspection Mode
├── On-site Domestic: Avg 62.5 days
├── On-site Foreign: Avg 71.3 days
└── Joint On-site Foreign: Avg 68.9 days

Level 3: By Processing Stage (Average contribution)
├── Screening: X days (Y%)
├── Inspector Assignment: X days (Y%)
├── Assessment: X days (Y%)
├── Task Force Review: X days (Y%)
├── CAPA Processing: X days (Y%)
└── Decision: X days (Y%)

Level 4: By Quarter
├── Q1: Avg days, Min, Max, StdDev
├── Q2: Avg days, Min, Max, StdDev
├── Q3: Avg days, Min, Max, StdDev
└── Q4: Avg days, Min, Max, StdDev

Level 5: Individual Applications
└── Fields: InspectionNumber, FacilityName, TotalDays,
    NRADays, ApplicantDays, StageBreakdown
```

### Backend Query Logic:

```sql
-- Average turnaround time
SELECT 
    it.inspection_type_code,
    it.name as inspection_type,
    COUNT(*) as application_count,
    SUM(ipt.total_processing_days - ipt.total_applicant_lag_time) as total_nra_days,
    AVG(ipt.total_processing_days - ipt.total_applicant_lag_time) as avg_days,
    MIN(ipt.total_processing_days - ipt.total_applicant_lag_time) as min_days,
    MAX(ipt.total_processing_days - ipt.total_applicant_lag_time) as max_days,
    STDDEV(ipt.total_processing_days - ipt.total_applicant_lag_time) as stddev_days
FROM inspection.vw_inspection_processing_time ipt
JOIN inspection.inspection i ON ipt.id = i.id
JOIN common.inspection_type it ON i.type_id = it.id
JOIN common.inspection_status ist ON i.status_id = ist.id
WHERE it.inspection_type_code IN ('NLGI', 'LGRI', 'NACI', 'ACRI', 'NACIW', 'ACIWR')
  AND ist.inspection_status_code IN ('ALEG', 'PALG', 'NCLG')
GROUP BY it.inspection_type_code, it.name

-- Stage breakdown averages
SELECT 
    AVG(screener_assignment_days + screening_time_days) as avg_screening,
    AVG(inspector_assignment_prep_days) as avg_assignment,
    AVG(gmp_inspector_assessment_days) as avg_assessment,
    AVG(taskforce_review_days) as avg_review,
    AVG(capa_assignment_days + capa_gmp_assessment_days) as avg_capa,
    AVG(daskhead_decision_days + leo_decision_days) as avg_decision
FROM inspection.vw_inspection_processing_time ipt
...
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI7DrilldownData {
  summary: {
    totalDays: number;
    totalApplications: number;
    averageDays: number;
    period: string;
    targetDays: number;
  };
  byInspectionMode: Array<{
    mode: string;
    modeCode: string;
    count: number;
    totalDays: number;
    averageDays: number;
    minDays: number;
    maxDays: number;
    stdDevDays: number;
  }>;
  byProcessingStage: {
    screening: { totalDays: number; avgDays: number; percentageOfTotal: number };
    assignment: { totalDays: number; avgDays: number; percentageOfTotal: number };
    assessment: { totalDays: number; avgDays: number; percentageOfTotal: number };
    taskForceReview: { totalDays: number; avgDays: number; percentageOfTotal: number };
    capaProcessing: { totalDays: number; avgDays: number; percentageOfTotal: number };
    decision: { totalDays: number; avgDays: number; percentageOfTotal: number };
  };
  byQuarter: Array<{
    quarter: string;
    count: number;
    avgDays: number;
    minDays: number;
    maxDays: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  trendData: Array<{
    month: string;
    avgDays: number;
    count: number;
  }>;
  applicationList: Array<{
    inspectionNumber: string;
    facilityName: string;
    inspectionType: string;
    startDate: Date;
    completionDate: Date;
    totalDays: number;
    nraDays: number;
    applicantDays: number;
    performanceVsAvg: number; // percentage diff from average
  }>;
}
```

---

## 🎯 KPI 8: Median Turnaround Time to Complete GMP Inspection Applications

### Backend Data Available:

**Same as KPI 7**, but requires median calculation:
- PostgreSQL: `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_days)`

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Median Days: 58.0 days
├── Mean Days: 64.7 days (from KPI 7)
├── Mode Days: Most common processing time
└── Distribution skew analysis

Level 2: Distribution Analysis
├── < 30 days: X applications (Y%)
├── 30-60 days: X applications (Y%)
├── 60-90 days: X applications (Y%)
├── 90-120 days: X applications (Y%)
└── > 120 days: X applications (Y%)

Level 3: Percentile Breakdown
├── P25 (25th percentile): X days
├── P50 (Median): 58.0 days
├── P75 (75th percentile): X days
├── P90 (90th percentile): X days
└── P95 (95th percentile): X days

Level 4: By Inspection Type
├── NLGI Median: X days
├── LGRI Median: X days
├── NACI Median: X days
├── ACRI Median: X days
├── NACIW Median: X days
└── ACIWR Median: X days

Level 5: Outlier Analysis
├── Fastest Applications (< P10)
├── Slowest Applications (> P90)
└── Root cause analysis for outliers
```

### Backend Query Logic:

```sql
-- Median and percentile calculation
SELECT 
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_processing_days - total_applicant_lag_time) as p25,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_processing_days - total_applicant_lag_time) as median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_processing_days - total_applicant_lag_time) as p75,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_processing_days - total_applicant_lag_time) as p90,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_processing_days - total_applicant_lag_time) as p95
FROM inspection.vw_inspection_processing_time ipt
JOIN inspection.inspection i ON ipt.id = i.id
WHERE ...

-- Distribution buckets
SELECT 
    CASE 
        WHEN (total_processing_days - total_applicant_lag_time) < 30 THEN '< 30 days'
        WHEN (total_processing_days - total_applicant_lag_time) < 60 THEN '30-60 days'
        WHEN (total_processing_days - total_applicant_lag_time) < 90 THEN '60-90 days'
        WHEN (total_processing_days - total_applicant_lag_time) < 120 THEN '90-120 days'
        ELSE '> 120 days'
    END as bucket,
    COUNT(*) as count
FROM ...
GROUP BY bucket
ORDER BY ...
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI8DrilldownData {
  summary: {
    medianDays: number;
    meanDays: number;
    modeDays: number;
    reportingYear: number;
    sampleSize: number;
  };
  distribution: Array<{
    bucket: string;
    minDays: number;
    maxDays: number;
    count: number;
    percentage: number;
    cumulative: number;
  }>;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  byInspectionType: Array<{
    type: string;
    typeCode: string;
    median: number;
    mean: number;
    count: number;
    p25: number;
    p75: number;
  }>;
  outlierAnalysis: {
    fastestApplications: Array<{
      inspectionNumber: string;
      facilityName: string;
      processingDays: number;
      percentile: number;
    }>;
    slowestApplications: Array<{
      inspectionNumber: string;
      facilityName: string;
      processingDays: number;
      percentile: number;
      delayReasons: string[];
    }>;
  };
  histogramData: Array<{
    daysRange: string;
    count: number;
    cumulative: number;
  }>;
}
```

---

## 🎯 KPI 9: Percentage of GMP Inspection Reports Published Within Specified Timeline

### Backend Data Available:

**Tables/Views:**
- `inspection.inspection_letter` - Contains `letter_generation_date`, `letter_number`
- `inspection.inspection_document` - Documents with `reference_id` for document type
- Status transitions for decision date calculation
- `inspection.inspection_result` - Inspection results with documents

### Drilldown Hierarchy:

```
Level 1: KPI Summary
├── Numerator: Reports published within timeline
├── Denominator: Total reports to be published
└── Performance: 82.8%

Level 2: By Inspection Mode
├── On-site Domestic: 425 (83.0%)
├── On-site Foreign: 52 (10.2%)
├── Joint Inspections: 21 (4.1%)
└── Remote/Desk-based: 14 (2.7%)

Level 3: By Publication Status
├── Published On Time
├── Published Late
├── Pending Publication
└── Not Applicable (confidential)

Level 4: By Report Type
├── Approval Certificates (ALEG documents)
├── Non-Compliance Letters (NCLG documents)
├── Partial Approval Letters (PALG documents)
└── CAPA Request Letters

Level 5: Individual Reports
└── Fields: InspectionNumber, FacilityName, DecisionDate,
    PublicationDate, DaysToPublish, ReportType, LetterNumber
```

### Backend Query Logic:

```sql
-- Report publication timeline
SELECT 
    i.id,
    vi.inspection_number,
    vi.facility_name,
    vi.inspection_type_code,
    ist.inspection_status_code as decision_status,
    -- Decision date from status log
    (SELECT MIN(sl.created_date) 
     FROM logging.license_application_status_log sl 
     WHERE sl.entity_id = i.id 
       AND sl.entity_type = 'Inspection'
       AND sl.new_value::int = i.status_id) as decision_date,
    -- Publication date from letter
    il.letter_generation_date as publication_date,
    il.letter_number,
    -- Calculate days to publish
    EXTRACT(DAY FROM (il.letter_generation_date - decision_date)) as days_to_publish,
    -- Target timeline (e.g., 30 days)
    CASE WHEN EXTRACT(DAY FROM (il.letter_generation_date - decision_date)) <= 30 
         THEN 'On Time' ELSE 'Late' END as publication_status
FROM inspection.inspection i
JOIN inspection.vwinspection vi ON i.id = vi.id
JOIN common.inspection_status ist ON i.status_id = ist.id
LEFT JOIN inspection.inspection_letter il ON i.id = il.inspection_id
WHERE ist.inspection_status_code IN ('ALEG', 'PALG', 'NCLG')

-- Summary by mode
SELECT 
    CASE 
        WHEN it.inspection_type_code IN ('NLGI', 'LGRI') THEN 'On-site Domestic'
        WHEN it.inspection_type_code IN ('NACI', 'ACRI') THEN 'On-site Foreign'
        WHEN it.inspection_type_code IN ('NACIW', 'ACIWR') THEN 'Remote/Desk-based'
    END as inspection_mode,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE days_to_publish <= 30) as on_time,
    COUNT(*) FILTER (WHERE days_to_publish <= 30) * 100.0 / COUNT(*) as percentage
FROM ...
GROUP BY inspection_mode
```

### Frontend Drilldown Data Structure:

```typescript
interface KPI9DrilldownData {
  summary: {
    publishedOnTime: number;
    totalReports: number;
    percentage: number;
    reportingYear: number;
    targetDays: number;
  };
  byInspectionMode: {
    onsiteDomestic: { total: number; onTime: number; percentage: number };
    onsiteForeign: { total: number; onTime: number; percentage: number };
    jointInspections: { total: number; onTime: number; percentage: number };
    remoteDeskBased: { total: number; onTime: number; percentage: number };
  };
  byPublicationStatus: {
    publishedOnTime: { count: number; percentage: number; avgDays: number };
    publishedLate: { count: number; percentage: number; avgDays: number };
    pendingPublication: { count: number; avgPendingDays: number };
    notApplicable: number;
  };
  byReportType: {
    approvalCertificates: { total: number; onTime: number; percentage: number };
    nonComplianceLetters: { total: number; onTime: number; percentage: number };
    partialApprovalLetters: { total: number; onTime: number; percentage: number };
    capaRequestLetters: { total: number; onTime: number; percentage: number };
  };
  trendByMonth: Array<{
    month: string;
    total: number;
    onTime: number;
    percentage: number;
  }>;
  reportList: Array<{
    inspectionNumber: string;
    facilityName: string;
    inspectionType: string;
    decisionDate: Date;
    publicationDate: Date;
    daysToPublish: number;
    isOnTime: boolean;
    reportType: string;
    letterNumber: string;
    documentLink: string;
  }>;
}
```

---

## 📋 Summary: Data Availability Matrix

| KPI | Primary Data Source | Key Entities | Drilldown Levels | Data Completeness |
|-----|---------------------|--------------|------------------|-------------------|
| **KPI 1** | `vwInspection`, `InspectionAssignment` | Inspection, InspectionType, InspectionFacility, InspectionAbroadFacility | 5 | ✅ Complete |
| **KPI 2** | `Inspection` with `InvestigationType` | Inspection, InvestigationType | 5 | ✅ Complete |
| **KPI 3** | Inspection (NACIW, ACIWR types) | Inspection, Country (reference authority) | 5 | ✅ Complete |
| **KPI 4** | `InspectionStatus` (ALEG, PALG, NCLG) | Inspection, InspectionStatus | 5 | ✅ Complete |
| **KPI 5** | `InspectionCapa`, `StatusLog` | InspectionCapa, StatusLog | 5 | ✅ Complete |
| **KPI 6** | `vwInspectionProcessingTime` | ProcessingTime view, InspectionPayment | 5 | ✅ Complete |
| **KPI 7** | `vwInspectionProcessingTime` | ProcessingTime view | 5 | ✅ Complete |
| **KPI 8** | `vwInspectionProcessingTime` | ProcessingTime view | 5 | ✅ Complete |
| **KPI 9** | `InspectionLetter`, `StatusLog` | InspectionLetter, InspectionDocument | 5 | ✅ Complete |

---

## 🔧 Recommended API Endpoints

Based on the analysis, I recommend creating these API endpoints:

```csharp
// GMP KPI Controller
[Route("api/kpi/gmp")]
public class GmpKpiController : BaseController
{
    // KPI 1
    [HttpGet("planned-inspections")]
    Task<KPI1DrilldownData> GetPlannedInspectionsKpi(int year, int? quarter);
    
    // KPI 2
    [HttpGet("complaint-inspections")]
    Task<KPI2DrilldownData> GetComplaintInspectionsKpi(int year, int? quarter);
    
    // KPI 3
    [HttpGet("waived-inspections")]
    Task<KPI3DrilldownData> GetWaivedInspectionsKpi(int year, int? quarter);
    
    // KPI 4
    [HttpGet("facility-compliance")]
    Task<KPI4DrilldownData> GetFacilityComplianceKpi(int year);
    
    // KPI 5
    [HttpGet("capa-decisions")]
    Task<KPI5DrilldownData> GetCapaDecisionsKpi(int year, int? quarter);
    
    // KPI 6
    [HttpGet("timeline-completion")]
    Task<KPI6DrilldownData> GetTimelineCompletionKpi(int year, int? quarter);
    
    // KPI 7
    [HttpGet("average-turnaround")]
    Task<KPI7DrilldownData> GetAverageTurnaroundKpi(int year, int? quarter);
    
    // KPI 8
    [HttpGet("median-turnaround")]
    Task<KPI8DrilldownData> GetMedianTurnaroundKpi(int year);
    
    // KPI 9
    [HttpGet("report-publication")]
    Task<KPI9DrilldownData> GetReportPublicationKpi(int year);
}
```

---

## 📝 Notes for Frontend Implementation

### Common Patterns Across All KPIs:

1. **Time Period Filtering**: All KPIs support quarterly (Q1-Q4) or annual filtering
2. **Status-Based Filtering**: Use `InspectionStatus` codes to determine completion/compliance
3. **Disaggregation**: All KPIs support breakdown by inspection mode (domestic/foreign/joint/remote)
4. **Timeline Calculations**: Use `StatusLog` table for accurate date tracking
5. **Processing Time**: Leverage `vwInspectionProcessingTime` view for detailed stage breakdowns

### Key Status Codes Reference:

```csharp
// Completion Statuses
ALEG = "Approval Letter Generated"      // Fully compliant
PALG = "Partial Approval Letter Generated"  // Partially compliant
NCLG = "Non-Compliance Letter Generated"     // Non-compliant
REJ = "Rejected"                         // Rejected

// CAPA Statuses
CAPREQ = "CAPA Plan Requested"
CAPS = "CAPA Plan Submitted"
CAPREJ = "CAPA Plan Rejected"
IMRREQ = "Implementation Report Requested"
IMRS = "Implementation Report Submitted"
IMRREJ = "Implementation Report Rejected"

// Processing Statuses
RQST = "Requested"
ASGI = "Assigned To GMP Officer"
ASDI = "Assigned To Inspector"
SCP = "Screening Passed"
SCF = "Screening Failed"
```

### Data Aggregation Tips:

1. **Use Views**: Prefer `vwInspection` and `vwInspectionProcessingTime` for optimized queries
2. **Status Logs**: Use `StatusLog` for accurate timeline calculations (not `CreatedDate`/`ModifiedDate`)
3. **Payment Dates**: Use `InspectionPayment` receipt date as clock start for KPI 6/7/8
4. **Letter Dates**: Use `InspectionLetter.letter_generation_date` for publication tracking (KPI 9)
5. **CAPA Tracking**: Use `InspectionCapa` table with status log joins for accurate CAPA timelines

---

**Document Version**: 1.0  
**Last Updated**: Based on codebase analysis  
**Backend Framework**: .NET Core / Entity Framework Core  
**Database**: PostgreSQL

