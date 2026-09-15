MA Medicine SQL reconciliation — 11 September 2026

The differences are caused by different reporting definitions, plus a confirmed inconsistency between the app's main KPI card and its drilldown. The attached SQL executes successfully, but several comments overstate what its filters guarantee.

All database connections used PostgreSQL `default_transaction_read_only=on`; `SHOW transaction_read_only` returned `on`. No database records, stored reports, app source files, or views were changed. Results came from the database configured through the project's existing DATABASE_URL loader. Stored SQL was executed directly with its filter metadata; this does not verify the browser's current API response, API deployment/database identity, or server-side date-range implementation. Tests used Gregorian calendar years and half-open ranges from January 1 to January 1 of the next year. The 2026 results reflect records available when tested, not a completed year. Existing scripts capable of updates were inspected but not executed.

**1. The same year selects different populations.**

| Medicine, new applications | 2024 | 2025 | 2026 |
|---|---:|---:|---:|
| Attached SQL: first requests, with created-date fallback | 1,082 | 980 | 576 |
| Attached SQL: first approvals | 286 | 759 | 386 |
| App eligible current statuses, filtered by submission year | 454 | 300 | 11 |
| App eligible current statuses, filtered by decision year | 374 | 844 | 409 |

The first two rows sum the three pathway classes. The app rows are KPI denominators, not requested or approved counts. Its current-status filter is APR, REJ, SUSP, CNCL. The page defaults to submission date; reports 8 and 179 serve the medicine percentage and completion-time cards in that mode. Decision mode selects reports 155 and 118. This selection is wired in the local client and matches the stored filter metadata.

For example, a request in 2023 approved in 2025 appears under 2023 requests and 2025 approvals in the attached report. In submission mode, the app assigns that application to 2023. In decision mode, it assigns it to the year recorded by the processing-time view. Changing only the year cannot align these definitions.

Sources: `src/app/market-authorizations/page.tsx:166`, `src/lib/ma-api/client.ts:129`, `stored-reports.json`, `app-results.json`, `attached-results.json`.

**2. Confirmed app inconsistency: card and drilldown use different clocks.**

The stored percentage face report 8 (and its decision-date clone 155) reads `license.vwma.processing_time_in_day`. This comes from `vwma_processing_time`, which calculates whole elapsed days between the latest RQST and the selected decision timestamp, including applicant waiting time.

The corresponding drilldown reports 9/160 replace that field with the sum of six regulatory stages from `vwma_unified_processing_time`. The completion-time reports 118/179 also use this stage sum.

For 2024 submission dates, report 8 returns **36 / 454 on time = 7.93%**. Summing the mutually exclusive Internal regulatory pathway and Reliance pathway rows of report 9 gives **135 / 454 = 29.74%**. This is an actual inconsistency in the same KPI, not an expected year-filter difference. For 2024 decision dates, the equivalent counts are 27 versus 134 on time, both out of 374.

Recommended correction: choose the agreed clock for this KPI and apply it to both face and drilldown SQL, with identical eligibility, missing-time handling, pathway classification, and SLA rules. If the intended measure excludes applicant time, changing only the card's date filter will not fix it. No correction was applied during this audit.

**3. First events and latest events differ.**

The attachment uses MIN(modified_date) from `vwma_log_status_new` for RQST, APR and FIR. The processing-time view uses MAX(modified_date) from `vwma_log_status`, and chooses `COALESCE(latest APR, latest REJ)` for decision date. This prioritizes APR if both exist; it does not choose the chronologically latest of APR and REJ.

Across the attachment's eligible base, 14 applications have different non-null request/submission years between these definitions; another 6 lack the first RQST and use created date only in the attachment's requested count. There are 146 applications whose first-approval year differs from the processing view's decision year. These are observed differences; the audit does not attribute all of them solely to MIN versus MAX because the underlying log views also differ.

The attached SQL is internally mixed: approval counts use first APR, while processing-time averages use the processing view's decision date and latest RQST. Establish whether the report is about first-ever milestones, the latest lifecycle, or each application cycle, and use matching boundaries for both counts and durations.

**4. Historical approval is not the same as current approved status.**

The attachment's base excludes only DEL and legacy numbers. A historical APR therefore remains countable even if the application is now archived, suspended, reopened, or otherwise in another status. That may be appropriate for an historical approvals report.

Its processing-time section requires a historical decision date, not a currently final status. In 2025, 929 base applications have a decision date in that year. The app includes 844 and excludes 85: **76 ARCH, 6 FIR, 1 FIRR, 2 VOID**. The attachment then drops 10 elapsed-time outliers over 3,000 days, producing a different duration population again. Thus the comment “pending apps are excluded” is not guaranteed: reopened files with old decisions are included.

The 844 app records comprise 686 APR, 149 REJ and 9 SUSP. These counts cannot be compared directly with the attachment's 759 first approvals.

**5. Pathway precedence differs on real records.**

The attachment prioritizes explicit SRA/WHOPQ/NSRA/FTR/etc. codes, using is_sra only when approval_pathway_id is null. The app prioritizes is_sra=true even when an explicit non-reliance pathway exists.

There are **13 conflicts** in the attachment's base: one FTR and twelve NSRA records have is_sra=true. The attachment calls these non-reliance; the app calls them SRA. Six are currently approved; the rest are pending. Five currently approved conflicts fall in decision year 2025. This explains pathway-level differences even after matching dates.

The app also merges SRA and WHO into an overall Reliance group and maps unspecified pathways to Regular. The attachment exposes SRA and WHO separately and has additional explicit/no-pathway time rows. Aggregate the same categories before comparing. No unclassified records were found in the attachment's current eligible base, although future null is_sra or unknown pathway codes would be silently omitted by its CASE expression.

**6. Subtracting applicant lag is not equivalent to the app's stage sum.**

The attachment subtracts lifetime RTA→RTAR and FIR→FIRR durations from whole-day elapsed time. The unified stage view uses separate formulas, fractional days, assignment timestamps, and additional transitions. Its applicant screening component includes PRSC→FATCH, which the attachment's lag formula does not subtract. The stage sum is therefore not algebraically the same as elapsed minus the two applicant transitions.

Holding both cohort and pathway classification fixed demonstrates the difference:

| Decision year 2025, explicit attachment classification | Same records | Elapsed average | Attachment net average | App stage average |
|---|---:|---:|---:|---:|
| Non-reliance | 745 | 825.91 | 513.41 | 485.72 |
| SRA | 75 | 416.17 | 227.60 | 200.81 |
| WHO | 14 | 208.57 | 140.94 | 146.16 |

These rows restrict both formulas to the app's current-status set, nonnegative stage time, and the attachment's 0–3,000 elapsed-day range. They intentionally use the attachment's classification for both formulas so classification cannot explain the remaining difference. Full results are in `clock-check.json`.

Six applications across all years have applicant lag greater than elapsed time; GREATEST(...,0) turns them into zero-day net durations. Also, stage time exceeds elapsed time by more than one day for 34 matched 2025 applications. These observations warrant lifecycle/transition review; neither calculation should be assumed to be the definitive regulatory clock merely because it excludes named applicant columns. In particular, the unified view includes post-decision VOID-related transitions and uses broad assignment-to-first-STL spans. This audit identifies the risk but does not certify each stage interval or establish the cause for every anomalous record.

**7. Other attachment and repository-script limitations.**

- `BETWEEN 0 AND 3000` excludes outliers; it does not clamp them as the opening comment says. Ten 2025 records are excluded. The app does not impose this elapsed-time upper bound.
- “Requested” includes six created-date fallbacks with no RQST evidence across the base. A created application is not necessarily a submitted application. Count/report that fallback separately if requested means genuinely submitted.
- FIR is counted only in its first-ever FIR year. A later FIR in another year is omitted. This is correct for “first FIR,” but differs from “applications receiving any FIR this year” or “number of FIR letters.” The app's MA-KPI-5 is not included in the live face-report merge; its seed value is preserved, so it cannot validate these historical counts.
- Explicit pathway presence does not establish when that pathway was assigned or that the application is a modern submission. The claim that this removes the pre-pathway backlog is not proven by `approval_pathway_id IS NOT NULL`.
- “No pathway” time rows are gross elapsed time, whereas “pathway assigned” rows exclude applicant time. They are not comparable duration complements, even though the underlying presence/absence populations are complementary.
- `ma_number NOT LIKE '%LD%'` also excludes null numbers under SQL null semantics. This applies to both compared filters.
- `Sql/MA-Medicen-KPI1.sql` is not the current stored report: it includes ARCH, has no dateFilter placeholder, lacks the explicit legacy exclusion, uses elapsed time, and uses older Before IRP labeling. It should not be treated as the authoritative app query.
- No duplicate inflation was observed in the app's eligible new-medicine `vwma` population: 3,871 rows and 3,871 distinct IDs.

Recommended resolution order: align the face/drilldown clock first; define first-event versus latest-cycle reporting; align status eligibility and pathway precedence; then align lag boundaries and outlier/missing-time rules. Keep requested counts, historical approval counts, decision-cohort KPI denominators and FIR activity as explicitly different metrics. Re-run the saved comparisons after an approved implementation change.

Reproduction: from the repository root, `node analysis/ma-sql-audit/audit.cjs`, then `node analysis/ma-sql-audit/diagnostics.cjs` and `node analysis/ma-sql-audit/clock-check.cjs`. These scripts enforce read-only sessions and write only local audit files. SQL snapshots and aggregate results are saved beside this report. The queries ran in separate read-only statements rather than one frozen snapshot, so later reruns can change as source data changes.
