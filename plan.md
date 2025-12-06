# Marketing Authorization Dashboard - KPI Implementation Plan

This plan details 8 KPIs with drill-down capabilities using existing backend data structures. The frontend will use demo data following these schemas.

---

## Data Sources Available in Backend

### Core Tables/Views

| Source | Key Fields | Purpose |

|--------|-----------|---------|

| `license.vwma` | MANumber, MATypeCode, MAStatusCode, SubmissionDate, DecisionDate, ProcessingTimeInDay, AgentName, SupplierName, Assessors, BranchName | Main MA data with joined lookups |

| `license.ma_log_status` | MAID, FromStatusID, ToStatusID, CreatedDate, ModifiedByUserID, Comment | Status transition history |

| `license.ma_assignment` | MAID, AssignedToUserID, ResponderTypeID, DueDate, CreatedDate | Assessor assignments |

| `license.ma_review` | MAID, ResponderID, Comment, FIRDueDate, SuggestedStatusID | FIR/Review data |

| `license.vwma_processing_time_aggregates` | AvgScreeningDays, AvgAssessmentDays, AvgTotalProcessingTimeDays | Aggregate statistics |

| `common.ma_type` | MATypeCode (NRG, REN, MIJV, MAJV, etc.), SubmoduleTypeID | Application types |

| `common.ma_status` | MAStatusCode (RQST, APR, REJ, FIR, etc.), DisplayName | Status definitions |

### Key MA Type Codes

- **NRG** / **VNRG**: New Registration
- **REN** / **RREN**: Renewal
- **MIJV**: Minor Variation
- **MAJV**: Major Variation

### Key Status Codes

- **RQST**: Requested | **APR**: Approved | **REJ**: Rejected
- **FIR**: Further Information Required | **FIRR**: FIR Replied
- **RTA**: Return to Agent | **RTAR**: RTA Replied
- **VER**: Verified | **STL**: Submitted to Team Leader

---

## KPI 1: Percentage of New MA Applications Completed Within Timeline

### Formula

- **Numerator**: COUNT(NewMA WHERE status IN ('APR','REJ') AND processing_days <= target_days)
- **Denominator**: COUNT(NewMA WHERE status IN ('APR','REJ'))

### Data Query Pattern

```sql
SELECT 
  COUNT(*) FILTER (WHERE processing_time_in_day <= :target_days) as completed_on_time,
  COUNT(*) as total_completed,
  (COUNT(*) FILTER (WHERE processing_time_in_day <= :target_days) * 100.0 / NULLIF(COUNT(*), 0)) as percentage
FROM license.vwma
WHERE ma_type_code IN ('NRG', 'VNRG')
  AND ma_status_code IN ('APR', 'REJ')
  AND decision_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - By Submodule Type:**

| Dimension | Fields | Purpose |

|-----------|--------|---------|

| Product Category | submoduletype_code (MDCN, FD, MD) | Medicine vs Food vs Medical Device |

**Level 2 - By Approval Pathway:**

| Dimension | Fields | Purpose |

|-----------|--------|---------|

| Pathway | approval_pathway_code (SRA, Regular, Accelerated, Abridged, Verification) | Impact of pathway on timelines |

**Level 3 - By Processing Stage:**

| Dimension | Fields (from vwma_processing_time) | Purpose |

|-----------|--------|---------|

| Screening Time | screener_assignment_days, screening_days | Identify screening bottlenecks |

| Assessment Time | assessor_assignment_days, assessment_days | Identify assessment bottlenecks |

| Decision Time | teamleader_decision_days, leo_final_decision_days | Identify decision bottlenecks |

| Applicant Response | applicant_response_screening_days, applicant_response_fir_days | Time spent waiting for applicant |

**Level 4 - Individual Applications:**

| Fields | Purpose |

|--------|---------|

| MANumber, BrandName, GenericName, AgentName, SupplierName | Application details |

| PrimaryAssessor, SecondaryAssessor, Prescreener | Responsible staff |

| SubmissionDate, DecisionDate, ProcessingTimeInDay | Timeline data |

### Root Cause Analysis Dimensions

- **By Branch**: branch_name - Regional performance comparison
- **By Agent**: agent_name - Agent compliance patterns
- **By Assessor**: primary_assessor, secondary_assessor - Staff workload/performance
- **By Time Period**: Monthly/Quarterly trends

---

## KPI 2: Percentage of Renewal MA Applications Completed Within Timeline

### Formula

- **Numerator**: COUNT(RenewalMA WHERE status IN ('APR','REJ') AND processing_days <= target_days)
- **Denominator**: COUNT(RenewalMA WHERE status IN ('APR','REJ'))

### Data Query Pattern

```sql
SELECT 
  COUNT(*) FILTER (WHERE processing_time_in_day <= :target_days) as completed_on_time,
  COUNT(*) as total_completed
FROM license.vwma
WHERE ma_type_code IN ('REN', 'RREN')
  AND ma_status_code IN ('APR', 'REJ')
  AND decision_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - By Submodule Type:**

- Medicine (MDCN), Food (FD), Medical Device (MD)

**Level 2 - By Renewal Status:**

| Dimension | Logic | Purpose |

|-----------|-------|---------|

| On-Time Renewals | renewal submitted before expiry | Compliant applications |

| Late Renewals | renewal submitted after expiry | Non-compliant patterns |

| Near-Expiry | expiry within 90 days | Risk identification |

**Level 3 - By Processing Bottleneck:**

- Same as KPI 1 (screening, assessment, decision stages)

**Level 4 - Individual Applications:**

- Application details with original_ma_id linkage to show renewal history

### Root Cause Analysis Dimensions

- **Expiry Pattern**: Days before/after expiry when renewal was submitted
- **Renewal Frequency**: First renewal vs subsequent renewals
- **Product History**: Previous compliance record

---

## KPI 3: Percentage of Minor Variation Applications Completed Within Timeline

### Formula

- **Numerator**: COUNT(MinorVariation WHERE status IN ('APR','REJ') AND processing_days <= target_days)
- **Denominator**: COUNT(MinorVariation WHERE status IN ('APR','REJ'))

### Data Query Pattern

```sql
SELECT 
  COUNT(*) FILTER (WHERE processing_time_in_day <= :target_days) as completed_on_time,
  COUNT(*) as total_completed
FROM license.vwma
WHERE ma_type_code = 'MIJV'
  AND ma_status_code IN ('APR', 'REJ')
  AND decision_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - By Variation Reason:**

| Data Source | Fields | Purpose |

|-------------|--------|---------|

| ma_variation_summary | minor_variation_count, variation_summary | Type of changes requested |

| variation_summary_reason | Linked reasons | Specific variation categories |

**Level 2 - By Submodule Type:**

- Medicine, Food, Medical Device breakdown

**Level 3 - By Processing Stage:**

- Screening, Assessment, Team Leader Decision breakdowns

**Level 4 - Individual Applications:**

- With link to original registration (original_ma_id)

### Root Cause Analysis Dimensions

- **Variation Category**: Manufacturing site change, formulation, labeling, etc.
- **Complexity Score**: Based on number/type of changes
- **Previous Variations**: Pattern of repeated variations

---

## KPI 4: Percentage of Major Variation Applications Completed Within Timeline

### Formula

- **Numerator**: COUNT(MajorVariation WHERE status IN ('APR','REJ') AND processing_days <= target_days)
- **Denominator**: COUNT(MajorVariation WHERE status IN ('APR','REJ'))

### Data Query Pattern

```sql
SELECT 
  COUNT(*) FILTER (WHERE processing_time_in_day <= :target_days) as completed_on_time,
  COUNT(*) as total_completed
FROM license.vwma
WHERE ma_type_code = 'MAJV'
  AND ma_status_code IN ('APR', 'REJ')
  AND decision_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - By Variation Complexity:**

| Dimension | Source | Purpose |

|-----------|--------|---------|

| Number of Changes | ma_variation_summary.major_variation_count | Complexity indicator |

| Variation Categories | variation_summary_reason | Type of major changes |

**Level 2 - By Review Complexity:**

| Dimension | Source | Purpose |

|-----------|--------|---------|

| FIR Count | COUNT of FIR status transitions | Number of information requests |

| Assessment Cycles | COUNT of STL transitions | Review iterations |

**Level 3 - By Processing Stage:**

- Detailed breakdown of each workflow stage

**Level 4 - Individual Applications:**

- Full application details with variation history

### Root Cause Analysis Dimensions

- **Change Type**: API change, indication change, manufacturing process
- **Data Requirements**: Clinical data, bioequivalence, stability data needed
- **Review Iterations**: Number of back-and-forth cycles

---

## KPI 5: Percentage of Queries/FIRs Completed Within Timeline

### Formula

- **Numerator**: COUNT(FIR WHERE FIRR_date - FIR_date <= target_days)
- **Denominator**: COUNT(FIR issued)

### Data Query Pattern

```sql
WITH fir_data AS (
  SELECT 
    ma_id,
    modified_date as fir_date,
    LEAD(modified_date) OVER (PARTITION BY ma_id ORDER BY modified_date) as firr_date
  FROM license.ma_log_status
  WHERE to_status_code = 'FIR'
)
SELECT 
  COUNT(*) FILTER (WHERE EXTRACT(DAY FROM firr_date - fir_date) <= :target_days) as on_time,
  COUNT(*) as total_firs
FROM fir_data
WHERE fir_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - By FIR Type:**

| Dimension | Source | Purpose |

|-----------|--------|---------|

| Screening FIR | RTA status | Pre-verification queries |

| Assessment FIR | FIR status | Post-verification queries |

**Level 2 - By Application Type:**

- New, Renewal, Minor Variation, Major Variation breakdown

**Level 3 - By Query Category:**

| Data Source | Purpose |

|-------------|---------|

| ma_review.comment | Nature of query |

| field_submodule_type | Deficiency areas identified |

**Level 4 - Individual FIRs:**

| Fields | Purpose |

|--------|---------|

| MANumber, FIR date, FIRR date, Response time | FIR details |

| AgentName, Responder | Parties involved |

| Comment/Deficiency areas | Query content |

### Root Cause Analysis Dimensions

- **Query Nature**: Documentation, data integrity, technical, regulatory
- **Response Pattern**: First-time response vs multiple iterations
- **Extension Requests**: is_fir_extension_requested flag
- **Agent Performance**: Response times by agent

---

## KPI 6: Median Time to Complete New MA Application

### Formula

- **Calculation**: PERCENTILE_CONT(0.5) of processing_time_in_day for completed New MAs

### Data Query Pattern

```sql
SELECT 
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_time_in_day) as median_days,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY processing_time_in_day) as p25_days,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY processing_time_in_day) as p75_days,
  MIN(processing_time_in_day) as min_days,
  MAX(processing_time_in_day) as max_days
FROM license.vwma
WHERE ma_type_code IN ('NRG', 'VNRG')
  AND ma_status_code IN ('APR', 'REJ')
  AND decision_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - Distribution Analysis:**

| Metric | Purpose |

|--------|---------|

| Histogram of completion times | Distribution shape |

| Quartile breakdown (P25, P50, P75, P90) | Performance tiers |

| Outlier identification (> 2 std dev) | Exceptional cases |

**Level 2 - By Category:**

| Dimension | Purpose |

|-----------|---------|

| Submodule Type | Medicine vs Food vs Device medians |

| Approval Pathway | SRA vs Regular vs Accelerated medians |

| Branch | Regional median comparison |

**Level 3 - Stage Breakdown:**

| Stage | Median Calculation |

|-------|-------------------|

| Screening | Median of screening_days |

| Assessment | Median of assessment_days |

| Team Leader | Median of teamleader_decision_days |

| Final Decision | Median of leo_final_decision_days |

**Level 4 - Outlier Analysis:**

- Applications significantly above median with root cause

### Root Cause Analysis Dimensions

- **Time Trend**: Monthly/quarterly median trends
- **Bottleneck Stage**: Which stage contributes most to delays
- **Correlation Analysis**: FIR count vs completion time

---

## KPI 7: Average Time to Complete New MA Application

### Formula

- **Numerator**: SUM(processing_time_in_day)
- **Denominator**: COUNT(completed applications)

### Data Query Pattern

```sql
SELECT 
  AVG(processing_time_in_day) as average_days,
  STDDEV(processing_time_in_day) as std_dev,
  COUNT(*) as sample_size
FROM license.vwma
WHERE ma_type_code IN ('NRG', 'VNRG')
  AND ma_status_code IN ('APR', 'REJ')
  AND decision_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - By Time Component (from vwma_processing_time_aggregates):**

| Component | Field | Purpose |

|-----------|-------|---------|

| Screener Assignment | avg_screener_assignment_days | Time to assign screener |

| Screening | avg_screening_days | Pre-assessment processing |

| Applicant Response (Screening) | avg_applicant_response_screening_days | RTA response time |

| Assessor Assignment | avg_assessor_assignment_days | Time to assign assessors |

| Assessment | avg_assessment_days | Technical review time |

| Team Leader Decision | avg_teamleader_decision_days | TL review time |

| Applicant Response (FIR) | avg_applicant_response_fir_days | FIR response time |

| Final Decision | avg_leo_final_decision_days | LEO approval time |

**Level 2 - Regulatory vs Applicant Time:**

| Category | Components |

|----------|------------|

| Regulatory Time | Screening + Assessment + TL Decision + Final Decision |

| Applicant Time | RTA Response + FIR Response |

**Level 3 - Performance Comparison:**

| Dimension | Purpose |

|-----------|---------|

| By Assessor | Individual assessor average times |

| By Team | Team-level performance |

| By Period | Trend analysis |

**Level 4 - Individual Applications:**

- Detailed timeline for each application

### Root Cause Analysis Dimensions

- **Workload Impact**: Correlation with assessor workload
- **Complexity Impact**: Correlation with application complexity
- **Seasonal Patterns**: Holiday/year-end impacts

---

## KPI 8: Percentage of PARs Published Within Timeline

### Formula

- **Numerator**: COUNT(PAR published within timeline after approval)
- **Denominator**: COUNT(Approvals in period)

### Data Query Pattern

```sql
SELECT 
  COUNT(*) FILTER (WHERE par_published_date IS NOT NULL 
                    AND par_published_date - decision_date <= :target_days) as on_time,
  COUNT(*) as total_approvals
FROM license.vwma ma
LEFT JOIN document.document doc ON doc.reference_id = ma.id 
  AND doc.module_document.document_type.document_type_code = 'PAR'
WHERE ma.ma_status_code = 'APR'
  AND ma.decision_date BETWEEN :start_date AND :end_date
```

### Drill-Down Levels

**Level 1 - By Application Type:**

| Type | Purpose |

|------|---------|

| New Registration | PARs for new approvals |

| Major Variation | PARs for significant changes |

**Level 2 - By Publication Status:**

| Status | Purpose |

|--------|---------|

| Published On-Time | Within target |

| Published Late | Exceeded target |

| Pending | Not yet published |

**Level 3 - By Product Category:**

- Medicine, Food, Medical Device breakdown

**Level 4 - Individual PARs:**

| Fields | Purpose |

|--------|---------|

| MANumber, Product Name, Approval Date | Application info |

| PAR Publication Date, Days to Publish | Timeline info |

| Responsible Officer | Accountability |

### Root Cause Analysis Dimensions

- **Backlog Analysis**: Pending PARs by age
- **Resource Allocation**: PAR publication capacity
- **Process Bottlenecks**: Stages in PAR preparation

---

## Demo Data Structure for Frontend

### Summary Dashboard Data

```json
{
  "kpis": [
    {
      "id": "new_ma_completion",
      "name": "New MA Applications On-Time",
      "value": 78.5,
      "target": 80,
      "trend": "up",
      "change": 2.3,
      "numerator": 157,
      "denominator": 200
    }
  ],
  "period": { "start": "2024-01-01", "end": "2024-12-31" },
  "lastUpdated": "2024-12-06T10:00:00Z"
}
```

### Drill-Down Data Structure

```json
{
  "kpi": "new_ma_completion",
  "level": 1,
  "dimension": "submodule_type",
  "data": [
    { "category": "Medicine", "value": 82.1, "count": 120, "total": 146 },
    { "category": "Food", "value": 75.0, "count": 30, "total": 40 },
    { "category": "Medical Device", "value": 50.0, "count": 7, "total": 14 }
  ],
  "drillable": true,
  "nextLevel": "approval_pathway"
}
```

### Individual Application Data

```json
{
  "maNumber": "MA-2024-001234",
  "brandName": "Product X",
  "genericName": "Active Ingredient Y",
  "applicationType": "New Registration",
  "status": "Approved",
  "submissionDate": "2024-01-15",
  "decisionDate": "2024-06-20",
  "processingDays": 156,
  "targetDays": 180,
  "onTime": true,
  "timeline": [
    { "stage": "Screening", "days": 15, "target": 14 },
    { "stage": "Assessment", "days": 90, "target": 100 },
    { "stage": "FIR Response", "days": 21, "target": 30 },
    { "stage": "Final Decision", "days": 30, "target": 36 }
  ],
  "assessors": {
    "prescreener": "John Doe",
    "primary": "Jane Smith",
    "secondary": "Bob Johnson"
  },
  "agent": "ABC Pharmaceuticals",
  "supplier": "XYZ Manufacturing"
}
```

---

## Implementation Priority

1. **Phase 1**: KPIs 1, 2, 7 (Core completion metrics)
2. **Phase 2**: KPIs 3, 4, 6 (Variation and median metrics)
3. **Phase 3**: KPIs 5, 8 (FIR and PAR metrics)

Each KPI should have:

- Summary card with percentage/value and trend indicator
- Click to expand for Level 1 drill-down
- Breadcrumb navigation for drill-down levels
- Export capability at each level
- Filter controls for date range, submodule type, branch