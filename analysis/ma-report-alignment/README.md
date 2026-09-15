# MA alignment and full-page drilldowns

Prepared and verified on 12 September 2026. **Applied with explicit user authorization on 14 September 2026 at 06:19:13 UTC** to the configured database `eris_dev_2026_22_06`. All 98 report definitions were verified through a fresh connection after commit. The other 49 table rows and all unrelated fields were unchanged.

Before the update, all 147 rows and every column of `kpi.kpi` were backed up to `C:\Users\IE\Downloads\EFDA-kpi-table-backup-2026-09-14T06-18-38-338Z`. This directory contains JSON data, a data-only SQL restore for the existing table, table metadata, the guarded MA-only rollback and a migration receipt. The backup was flushed to disk, read back and validated by converting it to the database table's record type and comparing every row; zero differences were found. Catalogue writes were locked during backup and migration. See `migration-receipt.json` for hashes and the commit record.

The same eight backup files are also packaged as `C:\Users\IE\Downloads\EFDA-kpi-table-backup-2026-09-14T06-18-38-338Z.zip`. The restore SQL passed a read-only `EXPLAIN` check; no restore was executed.

Post-migration verification is complete: **700 reconciliation checks passed against the deployed definitions** (350 each for 2025 and 2026), followed by **20 frontend normalization/distribution parity tests**. See `post-migration-summary.json` and `post-migration-verification-2025.json` / `post-migration-verification-2026.json`. For Medicine KPI-1 in 2025, both card and pathway drilldown now return 250/300 (83.33%) by submission date and 252/844 (29.86%) by decision date.

## Completed implementation

- MA and GMP cards navigate to dedicated `/market-authorizations/drilldown/[kpiId]` and `/gmp-inspections/drilldown/[kpiId]` pages. Product, date range and MA date basis travel in the URL. The sticky back link restores that context, and sign-in redirects preserve the query string.
- The detail pages use responsive content, a prominent back icon, chart/table controls where supported, loading and unavailable states, and working CSV exports.
- MA time views offer reported box plots, mean–median comparisons, category volume, duration bars and volume-share charts. Box edges are P25/P75; the line is the median; the diamond is the mean. Whiskers use the observed minimum/maximum, including extremes, rather than Tukey fences. No individual outliers are invented from aggregates.
- Both time detail views fetch paired median and average reports with identical product/date filters. Matching categories (including SLA, completed count and on-time count) combine the legacy median quartiles with the average mean/maximum, enabling box plots in both views without applying SQL changes. Box plots are the default wherever valid quartiles exist, and the selector remains visible. Full minimum/maximum whiskers still require the reported minimum; missing values are not fabricated.
- MA percentage views default to on-time versus other-completed counts. Time-band views default to ordered volume bars. GMP compares processing days or performance directly; volume-share charts use application counts, not a sum of percentages or averages.
- The preceding task's fixes are retained: date-aware report selection, stale-response protection, overall median/average headlines, variation module normalization, PAR totals, and unavailable FIR KPI-5 instead of sample metrics on the active MA dashboard.

## Prepared SQL

`proposed-reports.json` and the individual `report-*.sql` files cover all 98 active reports across Medicine, Food, Food Notification, Medical Device and Cosmetics, with submission and decision date variants.

The standard card and category queries derive from the same application population, regulatory stage clock and per-application SLA. New-application reliance uses 90 days; variation retains its applicable 60-day target. Missing/negative durations cannot count as on time. Null category labels remain represented, and Food/notification classification is disjoint. Time headlines use overall SQL aggregates; subgroup medians are never averaged into an overall median. PAR card and category totals share a source and publication timing rule.

Both median and average drilldowns additionally expose exact `distribution_min_days`, `distribution_q1_days`, `distribution_median_days`, `distribution_q3_days`, `distribution_max_days` and `distribution_mean_days` for each category.

- `apply-reviewed-alignment.sql`: one transaction updating report query/filter metadata only. Every report has an exact prior-content guard; a changed report aborts the transaction.
- `rollback-reviewed-alignment.sql`: guarded reverse transaction restoring the captured definitions.

The reviewed apply statements were executed once inside the backup transaction by `scripts/apply-ma-report-alignment.js`; rollback/restore files were not executed. Stored SQL is now migrated. Authenticated browser/API verification is separate from direct database verification; the deployment must use this same database. Reload the dashboard to clear the ten-minute in-memory client cache.

This resolves the application's card-versus-drilldown inconsistencies. It does not redefine the external SQL report: first-event versus latest-event dates, historical versus current statuses, pathway precedence, and elapsed-minus-applicant-time versus regulatory-stage duration remain different reporting choices. The underlying stage intervals were not rewritten or independently certified by this migration.

## Verification

- Production build and TypeScript pass, with both new routes present and no temporary preview route.
- 129 tests pass with the 2025 integration snapshot enabled (119 unit tests plus 10 product/date normalization checks). The 10 corresponding 2026 integration checks also pass, including equality of the mean and median reports' distribution summaries.
- All 98 candidate SQL queries pass database planning.
- 350 reconciliation checks pass for 2025 and 350 for 2026: five product views × two date bases, covering each category's counts and on-time totals. Results are in `verification-2025.json` and `verification-2026.json`.
- Read-only boundary tests pass for cross-year decisions, inclusive/exclusive period boundaries, 90/270/60-day SLAs, missing/negative durations, empty ranges and complete categories.
- Changed implementation files pass targeted ESLint. Repository-wide ESLint still reports pre-existing CommonJS, explicit-any and sidebar purity issues elsewhere, plus CommonJS audit scripts from the prior task.
- Desktop and 390px mobile visual checks used a temporary route with synthetic data, which was removed afterward. Box selection, mean–median switching, tables, GMP volume shares and sticky navigation were checked; the mobile document width equaled the viewport and no drilldown dialog existed. Authenticated live-API browser verification remains pending eRIS sign-in.

## Reproduction

After migration, use `node scripts/verify-applied-ma-alignment.js 2025` and repeat for `2026`. This reads and executes the deployed definitions without rebuilding or overwriting the reviewed migration. Do not rerun the original preparation script against the already-migrated catalogue. To run frontend parity checks, set `MA_REPORT_VERIFY_FILE` to `analysis/ma-report-alignment/post-migration-verification-2025.json` (or 2026) and run `npm test`. Each product/date verification uses a consistent read-only snapshot; separate product/date groups can observe later source changes. The boundary regression script remains `node scripts/test-ma-report-alignment.js`.
