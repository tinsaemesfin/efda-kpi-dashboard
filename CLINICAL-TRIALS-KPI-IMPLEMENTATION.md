# Clinical Trials KPI Implementation

## Overview
This document describes the accurate implementation of Clinical Trial KPIs based on the official requirement specifications from `ct-kpi.txt`.

## Implemented KPIs

### Main KPIs (Harmonized across NRAs)

#### KPI 1: Percentage of new clinical trial applications evaluated within a specified timeline
- **Maturity Level:** 3
- **Indicator Type:** Process  
- **Formula:** (N ÷ D) × 100
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Status:** Fully harmonized across TMDA, EFDA, RFDA, UNDA
- **Current Performance:** 87.6% (127/145 applications)

#### KPI 2: Percentage of clinical trial amendments evaluated within specified timelines
- **Maturity Level:** 3
- **Indicator Type:** Process
- **Formula:** (N ÷ D) × 100  
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Status:** Fully harmonized
- **Current Performance:** 89.0% (203/228 amendments)

#### KPI 3: Percentage of approved and ongoing clinical trials inspected as per the GCP plan
- **Maturity Level:** 3
- **Indicator Type:** Output
- **Formula:** (N ÷ D) × 100
- **Unit:** %
- **Reporting Frequency:** Annual
- **Status:** Harmonized for TMDA, EFDA, RFDA (Uganda NDA uses modified definition)
- **Current Performance:** 84.8% (78/92 inspections)

#### KPI 4: Percentage of field and safety reports assessed within a specified timeline
- **Maturity Level:** 3
- **Indicator Type:** Process
- **Formula:** (N ÷ D) × 100
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Differences:** EFDA counts safety reports only; RFDA counts all reports; UNDA has time-period-specific denominator
- **Current Performance:** 90.4% (412/456 reports)

#### KPI 5: Percentage of clinical trials compliant with GCP requirements
- **Maturity Level:** 3
- **Indicator Type:** Outcome
- **Formula:** (N ÷ D) × 100
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Status:** Harmonized for EFDA & UNDA (TMDA includes GCP+GCLP; RFDA doesn't track as prerequisite)
- **Current Performance:** 87.2% (68/78 CTs)

#### KPI 6: Percentage of approved clinical trials listed in national registry
- **Maturity Level:** 4
- **Indicator Type:** Output
- **Formula:** (N ÷ D) × 100
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Status:** TMDA, EFDA, UNDA harmonized (UNDA auto-publishes = 100%; RFDA auto = not tracked)
- **Current Performance:** 94.7% (89/94 CTs)

#### KPI 7: Percentage of CAPA evaluated within specified timeline
- **Maturity Level:** 3
- **Indicator Type:** Process
- **Formula:** (N ÷ D) × 100
- **Unit:** %
- **Reporting Frequency:** Quarterly
- **Status:** EFDA & UNDA harmonized (TMDA reports annually; RFDA tracks "technically")
- **Current Performance:** 86.5% (45/52 CAPA)

#### KPI 8: Average turnaround time to complete evaluation of CT applications
- **Maturity Level:** 3
- **Indicator Type:** Process
- **Formula:** N ÷ D
- **Unit:** Days
- **Reporting Frequency:** Quarterly
- **Status:** RFDA, TMDA, UNDA harmonized (EFDA reports semi-annually)
- **Note:** Supports KPI #1 by helping define timeline rules
- **Current Performance:** 54.3 days (6890 total days / 127 applications)

### Supplemental KPIs (Ethiopia FDA Specific)

#### KPI 2.1: Percentage of received amendments of CTs evaluated
- **Indicator Type:** Output
- **Formula:** (Evaluated amendments ÷ amendments received) × 100
- **Reporting Frequency:** Quarterly
- **Current Performance:** 95.6% (218/228)

#### KPI 3.1: Percentage of regulatory measures taken due to GCP findings and safety concerns
- **Indicator Type:** Outcome
- **Formula:** (Regulatory measures taken ÷ CTs conducted) × 100
- **Reporting Frequency:** Quarterly
- **Current Performance:** 8.3% (12/145)

#### KPI 4.1: Percentage of received safety reports assessed
- **Indicator Type:** Output
- **Formula:** (Safety reports assessed ÷ received safety reports) × 100
- **Reporting Frequency:** Quarterly
- **Current Performance:** 95.2% (434/456)

## File Structure

```
src/
├── types/
│   └── clinical-trial-kpi.ts          # Type definitions for all 8 KPIs
├── data/
│   ├── clinical-trial-dummy-data.ts   # Realistic dummy data with quarterly/annual trends
│   └── ct-requirements-mapping.ts     # Requirement number mappings
└── app/
    └── clinical-trials/
        └── page.tsx                    # Complete KPI dashboard page
```

## Features

### 1. Accurate Data Representation
- ✅ All KPIs show **Numerator** and **Denominator** clearly
- ✅ Proper **Unit of Measure** (% or Days)
- ✅ Correct **Reporting Frequency** (Quarterly or Annual)
- ✅ **Maturity Level** and **Indicator Type** displayed
- ✅ **Formulas** documented

### 2. Quarterly & Annual Tracking
- KPIs 1, 2, 4, 5, 6, 7: Quarterly data with trends
- KPI 3: Annual data with year-over-year comparison
- KPI 8: Quarterly turnaround time tracking

### 3. Requirement Matching
- Toggle switch to show/hide requirement numbers
- Each KPI card displays its requirement number (CT-KPI-1 through CT-KPI-8)
- Supplemental KPIs show as CT-KPI-2.1, CT-KPI-3.1, CT-KPI-4.1
- Complete metadata visible when requirements are enabled

### 4. Visual Components
- Bar charts for quarterly percentage trends
- Line charts for annual progression
- Individual KPI cards with detailed metrics
- Color-coded status indicators
- Trend arrows showing improvement/decline

### 5. Harmonization Status
- Clear indication of which KPIs are fully/partially harmonized
- Notes about NRA-specific differences (EFDA, TMDA, RFDA, UNDA)

## Data Quality

The dummy data is realistic and follows these principles:
- **Percentages** range from 84-95% (realistic for well-performing regulatory authority)
- **Quarterly variations** show natural fluctuations
- **Targets** set at 85% for percentage KPIs, 60 days for turnaround time
- **Trends** show gradual improvement over time
- **Sample sizes** are proportional (e.g., more reports than applications)

## Usage

To view the Clinical Trials KPI dashboard:

1. Navigate to `/clinical-trials`
2. View all 8 main KPIs with their complete details
3. Click "Match Requirements" toggle to see requirement numbers
4. Scroll down to view Supplemental EFDA KPIs
5. When requirements are shown, see complete KPI metadata at bottom

## Next Steps

After approval of the Clinical Trials implementation:
1. Apply same methodology to GMP Inspections KPIs
2. Apply same methodology to Market Authorization KPIs
3. All three categories will follow the same accurate, detailed format

