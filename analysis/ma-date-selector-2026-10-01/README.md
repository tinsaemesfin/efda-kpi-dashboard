# MA submission/decision date selector restoration

Implemented on 1 October 2026. The database update committed at **11:32:53 Addis Ababa time** in `eris_dev_2026_22_06`.

## Dashboard behavior

The MA dashboard again offers **Submission date** and **Decision date**, alongside start/end dates. Submission date remains the default. The selected product, dates and date basis are saved in the URL and carried into drilldowns and their back links. Drilldown filter chips describe the selected date basis.

| KPI | Submission date | Decision date |
|---|---|---|
| 1–4 | Eligible applications received in the period; pending applications remain in the corrected product groups' denominator. | Eligible applications with a qualifying effective decision in the period. |
| 6–7 | Completed applications submitted in the period. | Completed applications with an effective decision in the period. |
| 8 | Granted applications submitted in the period. | Granted applications with an effective decision in the period. |

Completion statuses, regulatory-stage processing durations, per-application targets, lineage/classification corrections, and EtPAR-only document counting are retained. The decision timestamp still follows the previously agreed qualifying status-log event and missing-approval fallback rules. Decision-mode reports exclude applications without a qualifying decision date, including for an unfiltered report.

Decision-mode percentage denominators retain eligible applications with a qualifying historical decision even if their current status later changed. The current completed-outcome rule determines the numerator. Cosmetics retains its existing completion eligibility and already distinct date-mode definitions.

For Medicine KPI 1, the 2025 candidate results were **250/1,004 (24.90%) by submission date** and **246/918 (26.80%) by decision date**. These are different application cohorts, not interchangeable percentages. Historical source/status corrections can change future reruns.

## Database rollout and backup

The guarded transaction updated **40 existing MA report definitions**:

- 20 decision-mode KPI 1–4 reports: restored effective decision dates, including the synthetic submission-date projections in Medicine 155/160 and the event-date source for optimized Medical Device reports.
- 12 submission-mode KPI 6–7 reports: restored submission cohort filtering while retaining completed-only durations.
- 8 submission-mode KPI 8 reports: restored submission cohort filtering while retaining the effective approval/upload clock and the `PSA` EtPAR predicate.

No report IDs, database views, application histories or source records were added or rewritten. All 98 active MA definitions were guarded against catalogue drift before application. The transaction verified that the other **155 table rows** and unrelated fields were unchanged.

Before updates, all **195 report rows and every column** were backed up with catalogue writes locked. The saved JSON was flushed to disk, read back, hashed, and converted back to the PostgreSQL table's record type; the roundtrip found zero differences. `full-table-backup.zip` contains the full JSON snapshot, column metadata, full-table restore SQL and a guarded MA-only rollback. No restore or rollback was executed.

`deployment.json` records the database, updated IDs, commit time, backup directory/hash and unchanged-data check. `persistence.json` records a fresh-connection check of all 98 active MA query/filter definitions.

## Verification

- All 98 active SQL reports planned successfully with a dated filter and without one.
- All 350 pre-update reconciliation checks passed across five products and both date modes. Query/filter hashes bind those results to the exact deployed proposal.
- 169 application tests passed, including ten checks that SQL results remain aligned after frontend normalization.
- Six focused date-restoration regression tests passed.
- Production build, TypeScript and targeted ESLint passed.
- All 350 post-update reconciliation checks passed as well, for 700 checks before/after application. Results are saved in `deployed-2025.json`; each product/date group uses a fresh read-only connection and a repeatable-read snapshot. Both runs used the 2025 period.

The database update is committed. The frontend changes require merging and deployment before they appear on the hosted dashboard. Authenticated browser/API deployment identity has not been verified. Reload an already-open dashboard after deploying the frontend to clear its in-memory report cache. Full-table backups and generated duplicate SQL files remain local; the repository includes the exact report definitions, deployment receipt and verification evidence.

## FIR exception

KPI 5 has one configured report, 218, rather than submission/decision variants. The connected catalogue currently identifies 218 as **GMP-MDCN-Face-KPI10-Approved-Local**, not an MA FIR report. This update leaves that GMP definition untouched. The frontend now rejects its inspection-module rows as FIR data and shows FIR data as unavailable instead of displaying inspection counts as FIR completion. The filter panel explicitly identifies KPI 5 as following its report-specific date filter. A valid FIR source and its two date definitions are separate work.

KPI 8 continues to measure EtPAR upload timing as the approved proxy for public publication; no public-availability timestamp was introduced.

## Maintenance

`node scripts/restore-ma-date-selector.js verify 2025` checks persisted definitions and runs read-only reconciliation. Repeat with another year when needed. `node --test scripts/test-restore-ma-date-selector.js` runs the focused regression tests.

Preparation is intended for the pre-restoration baseline; rerunning preparation after deployment intentionally fails its expected-change guard. Do not run the apply command again after a successful commit. Review the guarded rollback or full-table restore before recovery.
