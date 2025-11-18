# Market Authorization KPI Implementation

## Overview

This document outlines the detailed implementation of the **8 Marketing Authorization KPIs** based on the official requirements document. The implementation covers Medicine, Medical devices, and Food authorization processes across TMDA (Tanzania), EFDA (Ethiopia), Rwanda FDA, and Uganda NDA.

## Implemented KPIs

### KPI 1: Percentage of New MA Applications Completed Within a Specified Time Period

- **Maturity Level:** 3
- **Type:** Process
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Formula:** (N ÷ D) × 100
- **Current Performance:** 82.1% (234/285 applications)

**Definition:** Measures how many new MA applications were completed within the official processing timeline.

**Timing Rules:**
- Time counted from start of regulatory processing (screening/validation)
- Excludes time when application is paused waiting for applicant input
- Uses each NRA's official public SLA timeline

**AMRH Additional Requirements:**
- **KPI 1.1 - Regional reliance positive outcomes within 90 working days:** 86.5% (45/52)
- **KPI 1.2 - Continental reliance positive outcomes within 90 working days:** 79.2% (38/48)

**Harmonization:** TMDA, EFDA, Rwanda FDA (UNDA uses target-based denominator)

---

### KPI 2: Percentage of Renewal MA Applications Completed Within a Specified Time Period

- **Maturity Level:** 3
- **Type:** Process
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Formula:** (N ÷ D) × 100
- **Current Performance:** 87.6% (156/178 renewals)

**Definition:** Measures efficiency in completing renewal applications on time.

**Timing Rules:**
- Clock runs from screening/validation → final decision
- Excludes applicant waiting time

**Harmonization:** TMDA, EFDA, Rwanda FDA (UNDA does not track this KPI - renewals not yet priority)

---

### KPI 3: Percentage of Minor Variation MA Applications Completed Within a Specified Time Period

- **Maturity Level:** 3
- **Type:** Process
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Formula:** (N ÷ D) × 100
- **Current Performance:** 89.7% (312/348 minor variations)

**Definition:** Measures timeliness in evaluating minor variations.

**Timing Rules:**
- Start = screening/validation
- End = final decision
- Excludes hold time

**Harmonization:** TMDA, EFDA, Rwanda FDA fully harmonized (UNDA uses target-based denominator)

---

### KPI 4: Percentage of Major Variation MA Applications Completed Within a Specified Time Period

- **Maturity Level:** 3
- **Type:** Process
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Formula:** (N ÷ D) × 100
- **Current Performance:** 82.1% (128/156 major variations)

**Definition:** Measures if major variations are completed within required timelines.

**Timing Rules:**
- Same as minor variations — measure only regulator processing times

**Harmonization:** TMDA, EFDA, Rwanda FDA (UNDA uses planned denominator)

---

### KPI 5: Percentage of Queries / Additional Information / FIRs Completed Within a Specified Time Period

- **Maturity Level:** 3
- **Type:** Process
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Formula:** (N ÷ D) × 100
- **Current Performance:** 86.9% (445/512 queries/FIRs)

**Definition:** Tracks the efficiency of responding to queries, requests for additional information, and FIRs.

**Timing Rules:**
- Measured from date of applicant's response → date regulator marks the query/FIR as completed
- Applicant waiting time is excluded

**Harmonization:** TMDA, EFDA, Rwanda FDA (UNDA uses planned denominator)

---

### KPI 6: Median Time Taken to Complete a New MA Application

- **Maturity Level:** 3
- **Type:** Process
- **Unit:** Days
- **Reporting Frequency:** Annually
- **Formula:** Arrange all completion times in ascending order; If odd: median = middle value; If even: median = average of two middle values
- **Current Performance:** 156.0 days

**Definition:** Measures the median number of days needed to complete new MA applications.

**Timing Rules:**
- Time measured from screening → final decision
- Excludes applicant hold time

**Key Notes:**
- Median preferred because mean can be distorted by outliers
- Accepted as harmonized continental practice

**AMRH Extensions:**
- **KPI 6.1 - Median time for regional reliance pathway:** 78.0 days
- **KPI 6.2 - Median time for continental reliance pathway:** 82.0 days

**Harmonization:** Fully harmonized across all four NRAs (TMDA, EFDA, Rwanda FDA, UNDA)

---

### KPI 7: Average Time Taken to Complete a New MA Application

- **Maturity Level:** 3
- **Type:** Process
- **Unit:** Days
- **Reporting Frequency:** Annually
- **Formula:** N ÷ D
- **Current Performance:** 164.2 days (167,520 total days / 1,020 applications)

**Definition:** Measures the average time (mean) required to complete new MA applications.

**Timing Rules:**
- Same as KPI 6 (screening → final decision, excluding hold time)

**Key Notes:**
- NRAs comfortable using mean, but must check for outliers
- If too skewed, median should be preferred

**Harmonization:** Fully harmonized across all four NRAs

---

### KPI 8: Percentage of Public Assessment Reports (PARs) Published Within Specified Timelines

- **Maturity Level:** 4
- **Type:** Output
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Formula:** (N ÷ D) × 100
- **Current Performance:** 82.8% (178/215 PARs)

**Definition:** Measures transparency by tracking publication of PARs for approved medicines.

**Timing Rules:**
- Time measured from final MA decision → publication date

**Specified Timelines by NRA:**
- **EFDA:** 60 days
- **TMDA:** 90 days
- **Rwanda FDA:** TBD
- **Uganda NDA:** TBD

**Harmonization:** TMDA, EFDA, Rwanda FDA, UNDA (Rwanda & UNDA still implementing publication systems)

---

## Technical Implementation

### Files Created/Modified

1. **`src/types/ma-kpi.ts`**
   - Complete TypeScript type definitions for all 8 MA KPIs
   - Separate interfaces for each KPI with proper data structures
   - Support for quarterly and annual reporting frequencies
   - AMRH extension structures for KPI 1 and KPI 6

2. **`src/data/ma-dummy-data.ts`**
   - Realistic dummy data for all 8 KPIs
   - Historical trends (quarterly and annual)
   - AMRH extensions data
   - Complete timing rules and notes

3. **`src/data/ma-requirements-mapping.ts`**
   - Requirement mappings for MA-KPI-1 through MA-KPI-8
   - Sub-indicator mappings (KPI 1.1, 1.2, 6.1, 6.2)
   - Helper function for requirement lookup
   - Integration with requirement matching feature

4. **`src/app/market-authorizations/page.tsx`**
   - Comprehensive dashboard page
   - All 8 KPIs displayed with full details
   - Charts showing quarterly/annual trends
   - AMRH extension sections
   - Requirement matching toggle
   - Harmonization status summary

### Key Features

#### Accurate Data Display
- ✅ Numerator and denominator shown separately
- ✅ Correct units (% or Days)
- ✅ Proper reporting frequencies (Quarterly/Annual)
- ✅ Formulas displayed for clarity
- ✅ Maturity levels and indicator types

#### Visual Representations
- 📊 Quarterly trend charts (bar and line)
- 📈 Annual trend charts for yearly KPIs
- 📉 Target lines for performance comparison
- 🎨 Color-coded status indicators

#### Requirement Matching
- 🔍 Toggle to show/hide requirement numbers
- 🏷️ MA-KPI-1 through MA-KPI-8 badges
- 🏷️ Sub-indicators (1.1, 1.2, 6.1, 6.2)
- 📝 Requirement descriptions on hover
- ✨ Seamless integration across all cards

#### AMRH Extensions
- 🌐 Regional and Continental reliance pathways
- 📋 KPI 1.1, 1.2 for reliance positive outcomes
- ⏱️ KPI 6.1, 6.2 for reliance pathway median times
- 🎨 Highlighted sections with gradient backgrounds

#### Timing Rules & Notes
- ⏰ Clear timing rules for each KPI
- 📄 NRA-specific timelines (EFDA, TMDA, Rwanda FDA, UNDA)
- ⚙️ Stop-clock rules and hold time exclusions
- 📌 Implementation status notes

## Data Accuracy

All KPI data strictly follows the official requirements:

1. **Correct Formulas**
   - KPI 1-5, 8: `(N ÷ D) × 100`
   - KPI 6: Median calculation
   - KPI 7: `N ÷ D`

2. **Proper Units**
   - Percentages for KPI 1-5, 8
   - Days for KPI 6, 7

3. **Accurate Frequencies**
   - Quarterly: KPI 1, 2, 3, 4, 5, 8
   - Annual: KPI 6, 7

4. **Complete Metadata**
   - Maturity levels (3 or 4)
   - Indicator types (Process, Output)
   - Timing rules
   - Notes and harmonization status

## Performance Metrics (Current Quarter/Year)

| KPI | Performance | Numerator | Denominator | Status |
|-----|------------|-----------|-------------|--------|
| KPI 1 | 82.1% | 234 | 285 | Good |
| KPI 1.1 | 86.5% | 45 | 52 | Good |
| KPI 1.2 | 79.2% | 38 | 48 | Good |
| KPI 2 | 87.6% | 156 | 178 | Good |
| KPI 3 | 89.7% | 312 | 348 | Excellent |
| KPI 4 | 82.1% | 128 | 156 | Good |
| KPI 5 | 86.9% | 445 | 512 | Good |
| KPI 6 | 156.0 days | - | - | Excellent |
| KPI 6.1 | 78.0 days | - | - | Excellent |
| KPI 6.2 | 82.0 days | - | - | Excellent |
| KPI 7 | 164.2 days | 167,520 | 1,020 | Excellent |
| KPI 8 | 82.8% | 178 | 215 | Good |

## Harmonization Summary

- **Fully Harmonized (All 4 NRAs):** KPI 6, 7
- **Harmonized (3 NRAs):** KPI 1, 2, 3, 4, 5, 8
- **NRA-Specific Notes:** 
  - UNDA uses target-based denominators for KPI 1, 3, 4, 5
  - UNDA does not track KPI 2 (renewals not yet priority)
  - Rwanda FDA & UNDA still implementing PAR publication systems (KPI 8)

## Application Types Covered

The KPIs track performance across:

1. **New Applications** (KPI 1, 6, 7)
2. **Renewals** (KPI 2)
3. **Minor Variations** (KPI 3)
4. **Major Variations** (KPI 4)
5. **Queries/FIRs** (KPI 5)
6. **Public Assessment Reports** (KPI 8)

## Reliance Pathways (AMRH)

Special tracking for:
- **Regional Reliance** (within East African Community)
- **Continental Reliance** (African Medicines Agency harmonization)

These pathways enable faster approvals by relying on assessments from reference authorities.

## Next Steps

This implementation provides a **government-grade, production-ready** Market Authorization KPI dashboard that:

1. ✅ Accurately reflects all official requirements
2. ✅ Displays proper numerators, denominators, and formulas
3. ✅ Shows correct units and reporting frequencies
4. ✅ Includes AMRH extensions for reliance pathways
5. ✅ Tracks harmonization status across NRAs
6. ✅ Supports requirement matching feature
7. ✅ Provides visual trend analysis
8. ✅ Maintains consistency with Clinical Trials and GMP implementations

The dashboard is ready for stakeholder review and can be extended with real data integration when available.

---

## Complete Project Status

### ✅ All Three KPI Categories Implemented

1. **Clinical Trials** - 8 main KPIs + 3 supplemental KPIs (Ethiopia FDA)
2. **GMP Inspections** - 9 main KPIs
3. **Market Authorizations** - 8 main KPIs + AMRH extensions

All implementations follow the same high-accuracy standards with:
- Accurate formulas and calculations
- Proper units and frequencies
- Complete disaggregations
- Harmonization status tracking
- Requirement matching feature
- Comprehensive visualizations

**Total KPIs Implemented:** 28 main KPIs + 5 extensions = **33 KPIs**

