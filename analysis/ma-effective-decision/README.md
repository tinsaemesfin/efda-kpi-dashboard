# MA effective-decision rollout

Authorized by the user on 15 September 2026 after review of `ss (1).txt` and acceptance of the missing-approval fallback and latest qualifying log-event rule. **Applied on 15 September 2026** to `eris_dev_2026_22_06`: 59 updated definitions verified through a fresh connection. The other 88 table rows and unrelated fields were unchanged. See the migration receipt for exact commit time and hashes.

Before the update, all 147 rows and all columns of `kpi.kpi` were backed up to `C:\Users\IE\Downloads\EFDA-kpi-table-backup-2026-09-15T14-05-40-808Z`. The backup includes full JSON, table metadata, data-only restore SQL, the forward migration and a guarded rollback. Durable file readback and database record-type roundtrip found zero differences before updates.

All **700 reconciliation checks passed**: 350 against the 2025 candidates and 350 against the deployed 2026 definitions, covering all five products and both date modes. A separate standalone execution of deployed report 160 confirmed the 2025 medicine result (246/839) in approximately 10.9 seconds. **20 frontend parity tests** (10 for each year), nine report-mapping tests, event/period fixture checks and targeted ESLint also passed.

## Scope

The dashboard uses 98 MA definitions across Medicine, Food, Food Notification, Medical Device and Cosmetics. This migration updates 59: 49 decision-date definitions and 10 submission-date PAR definitions. The other 39 submission-date percentage and processing-time definitions are byte-for-byte unchanged because their calculations do not use a decision date. The 15 older MA rows (1–7, 26–32, 88) are retained as historical definitions; the dashboard's active report mappings do not call them. Non-MA reports are outside this migration.

## Agreed behavior

- Latest APR/REJ event whose previous status is not SUSP/APR/REJ determines the effective decision timestamp.
- With no logged APR, first SUSP/CNCL is added as a fallback approval event; latest qualifying event or fallback wins.
- Current status continues to determine eligibility and outcome labels. VOID is not separately excluded from history. Known manually intervened/conflicting records follow the same agreed rule pending investigation.
- Decision-period filters use the date portion, so an inclusive end-date comparison includes the entire last day. No-event records are excluded from decision reports even without a period filter, matching the sample.
- Source rows are retained for root-application classification even when a root lacks a decision event; only the reported current application must satisfy the decision filter.
- PAR keeps the exact timestamp for selecting subsequent document uploads and calculating elapsed days. Both PAR date variants use that same timestamp; submission-mode cohort selection still uses submission date.
- Product/module SLAs, stage-duration calculations, legacy/status exclusions, categories, output fields and box-plot distributions are preserved. Face and drilldown remain separate stored reports.

`effective_status_log`, `effective_decision`, the source MA projection and the enriched MA projection are materialized to avoid repeated expansion of expensive views. No database views or application histories are modified.

## Artifacts and checks

- `all-reports.json` and `report-*.sql`: current candidate/deployed definitions for all 98 dashboard reports.
- `proposed-reports.json`: 59 updates with exact previous query/filter guards.
- `apply-reviewed-alignment.sql` and `rollback-reviewed-alignment.sql`: guarded forward/reverse transactions.
- `planning.json`: all 59 changed reports pass planning with dated and unfiltered queries.
- `candidate-2025.json`: pre-deployment reconciliation across five products and both date modes.
- `deployed-2026.json`: completed post-deployment reconciliation (350 checks).
- `deployed-standalone-medicine-2025.json`: unbundled execution of the stored medicine drilldown.
- `migration-receipt.json`: database identity, backup location, commit status, unrelated-data and fresh-connection checks.

The generated Medicine new-application KPI 1 matches every aggregate drilldown row in the reviewed attachment for 2025: 246/839, or 29.32%. Event-fixture checks cover reinstatement, duplicate events, later rejection, cancellation fallback, missing qualifying events, year boundaries, timestamp precision and submission invariants.

Database reconciliation uses read-only transactions and materializes source views once per product/date comparison; definitions are independently planned without that optimization. It verifies SQL behavior, not authenticated browser/API deployment identity. Historical source corrections can alter future reruns.

## Commands

Preparation is intentionally guarded against baseline drift and should not be rerun after application. Use `node scripts/ma-effective-decision.js deployed 2026` to verify the stored rollout. Event tests: `node scripts/test-ma-effective-decision.js`. Frontend aggregate parity can use `MA_REPORT_VERIFY_FILE=analysis/ma-effective-decision/deployed-2026.json` with the existing parity test.

The full-table backup and data-only restore are created and validated before updates by `scripts/apply-ma-effective-decision.js`. No restore or rollback is executed during normal application.
