# MA KPI completion research record

Audience: EFDA KPI dashboard maintainers  
Date: 2026-08-27  
Scope: Market Authorization KPIs only, across Medicine, Food, Food Notification, Medical Device, and Cosmetics. MA-KPI-5 (queries/additional information/FIR) is explicitly excluded.

## Executive answer

The MA reporting catalogue and dashboard wiring have been completed for the previously missing non-FIR face and drilldown feeds. Thirty-two consecutive MA report definitions were added as IDs 89-120. The frontend now resolves report IDs through product-level matrices and uses live data for KPI 1-4 drilldowns where product-specific reports exist, KPI 6/7 faces and drilldowns for all five product contexts, and KPI 8 faces and drilldowns for all five contexts.

The signed MA KPI specification changed two implementation choices during review:

- KPI 6/7 uses the full regulator-controlled interval from screening/validation through final decision. The active reports sum screener assignment, screening, assessor assignment, assessment, team-leader decision, and final decision, while excluding the two applicant-response stages.
- EFDA KPI 8 uses a 60-day publication timeline and selects MAs by decision/grant date. New active face reports replace the legacy 30-day feeds without deleting or overwriting their IDs.

## Evidence and assumptions

- Formal definitions: `PDF/Signoff__Group_1s_MA_KPIs_25 Jun 2025.pdf`, visually inspected on the KPI 6, KPI 7, and KPI 8 pages. The document states start-of-processing to final-decision timing for KPI 6/7 and a 60-day EFDA timeline for KPI 8.
- Existing application contract: `src/lib/ma-api/constants.ts`, `client.ts`, `useMAApi.ts`, both drilldown modals, normalizers, and the MA page.
- Live database contract: `kpi.kpi`, `license.vwma`, `license.vwma_unified_processing_time`, `document.document`, `document.module_document`, and `common.document_type`.
- Report-period field: KPI 1-4 retains `created_date` because the denominators are applications received in the period. KPI 6/7 and KPI 8 use `decision_date` because their populations are completed/granted applications in the period.
- Historical IDs are preserved. Legacy reports remain available to other consumers even when the dashboard now selects a corrected replacement.

## Existing MA ID inventory reviewed

| IDs | Role | Result |
| --- | --- | --- |
| 1-7 | Deprecated early MA experiments | Not wired; unchanged |
| 8 | Medicine KPI 1-4 face | Active; unchanged |
| 9-11, 13 | Medicine KPI 1-4 drilldowns | Active; unchanged; ID 12 is absent |
| 14-17 | Food, Food Notification, Medical Device, Cosmetics KPI 1-4 faces | Active; unchanged |
| 18-21 | Food KPI 1-4 drilldowns | Active; unchanged |
| 22-25 | Medical Device KPI 1-4 drilldowns | Active; unchanged |
| 26-28 | Legacy Medicine KPI 6/7 face and drilldowns | Preserved; dashboard replaced by 118-120 |
| 29-32 | Legacy KPI 8 face reports using 30 days | Preserved; dashboard replaced by 114-117 (Food Notification uses 108) |
| 88 | Unused Medicine date-filter clone of ID 8 | Preserved; not wired |

## New active ID matrix

| Product | KPI 1-4 drilldown | KPI 6/7 face | KPI 6 median DD | KPI 7 average DD | KPI 8 face | KPI 8 DD |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Medicine | 9, 10, 11, 13 | 118 | 119 | 120 | 114 | 109 |
| Food | 18-21 | 96 | 97 | 98 | 115 | 110 |
| Food Notification | 89-92 | 99 | 100 | 101 | 108 | 111 |
| Medical Device | 22-25 | 102 | 103 | 104 | 116 | 112 |
| Cosmetics | 93-95 (single variation KPI) | 105 | 106 | 107 | 117 | 113 |

## 2026 verification observations

- KPI 6/7 face reports returned two rows each. Median/average completion times were: Medicine 243.25/274.28 days (409 completed new MAs), Food 196.68/259.96 (249), Food Notification 0.00/2.16 (1,551), Medical Device 115.93/119.68 (625), and Cosmetics 7.47/13.39 (169).
- KPI 8 Medicine returned live publication data. For new Medicine applications, 133 of 399 were published within 60 days (33.33%).
- No qualifying approval-document upload was found for 2026 Food, Food Notification, Medical Device, or Cosmetics populations under the existing PSA/SPC/LBL/PIL document mapping. Their KPI 8 results are therefore 0%, and drilldowns explicitly show `Not published`; these are database findings, not placeholder values.
- Food Notification renewal/minor/major variation and Cosmetics renewal/variation drilldowns currently return zero rows because those source populations do not exist in the selected 2026 data. The reports remain valid for future records.

## Validation

- All 25 initial definitions (89-113) were executed against the live 2026 range before insertion and returned the expected schemas.
- Database writes used guarded transactions, explicit consecutive IDs, table locking, post-insert checks, and sequence advancement.
- Final database state: max ID and sequence value 120; 32 new MA rows in 89-120; zero new query definitions contain a whole-word FIR reference; all legacy MA query hashes reviewed before work remain unchanged.
- Static checks: TypeScript compilation, focused ESLint, Vitest, and production build.

## Material limitations

- The document mapping for KPI 8 follows the existing catalogue convention: module documents whose types are PSA, SPC, LBL, or PIL. Absence of those uploads is reported as not published. If EFDA stores public PAR publication in another system or document type, that source must be added before interpreting 0% as organizational non-publication.
- Food Notification currently shares the `FD` submodule code and is separated with `ma_type_code = 'FNT'` or `is_food_notification = true`.
- The dashboard API itself requires an authenticated access token. Database-backed report execution and frontend contracts were verified locally; an end-to-end authenticated browser session was not required for this implementation.

## Claim-to-source ledger

| Claim | Source | Access |
| --- | --- | --- |
| KPI 6/7 timing and KPI 8 60-day EFDA requirement | *Marketing Authorization KPIs*, Sonia George, signed/modified 2025-06-25 | Repository PDF, visually inspected |
| Report IDs, SQL, filters, and sequence | `kpi.kpi`, `kpi.kpi_id_seq` | Live PostgreSQL, 2026-08-27 |
| Product and status populations | `license.vwma` | Live PostgreSQL, 2026-08-27 |
| Regulator/applicant stage timing | `license.vwma_unified_processing_time` | Live PostgreSQL, 2026-08-27 |
| PAR upload mapping | `document.document`, `document.module_document`, `common.document_type` | Live PostgreSQL, 2026-08-27 |
| API and UI report routing | MA API constants/client/hooks/modals/page | Repository HEAD on branch `MA-Medicine` |

Research stopped after the signed definition, live schema, stored SQL, output schemas, frontend routing, automated checks, and representative post-write results converged with no unresolved implementation gap inside the non-FIR MA scope.
