# Agreed medicine KPI 1 sample: review before approval

Reviewed 15 September 2026 against the configured database `eris_dev_2026_22_06`. Database sessions enforced read-only mode. No stored queries, views, application code or source records were updated. Local review scripts and evidence were saved in this directory. Attachment comments were treated as claims to evaluate, not deployment authorization.

## Conclusion

The proposed date rule is a sensible improvement for preventing repeated approvals and reinstatements from moving an application into a later reporting period. It retains the processing-time and SLA alignment already deployed on 14 September. It is not a complete replacement for all MA reports, and the fallback and conflicting-history cases below need an explicit reporting decision before rollout.

## Verified baseline and changes

All 98 currently deployed MA query texts match the previous alignment snapshots; the catalogue contains 147 rows. The old repository file `Sql/MA-Medicen-KPI1.sql` is not the live baseline.

| Item | Current stored logic | Attached sample |
|---|---|---|
| Reporting date | `vwma.decision_date`, ultimately latest APR, otherwise latest REJ | Latest APR/REJ whose previous status is not SUSP/APR/REJ |
| Reinstatement/repeated status | Can move the selected date forward | SUSP→APR, APR→APR and REJ→REJ are excluded |
| Approval followed by rejection | APR takes precedence even when older | Latest qualifying event wins |
| Missing approval history | May use an older rejection date | Adds first SUSP/CNCL as a synthetic APR event if there is no APR log; latest event still wins |
| Date precision | Existing view timestamp | Cast to DATE for period filtering |
| Eligibility | Current APR/REJ/SUSP/CNCL; excludes LD numbers and null numbers | Same predicates, with an additional inner join requiring an effective event |
| Processing duration | Maximum per-ID sum of six regulatory-stage durations | Same |
| SLA | New-application reliance 90 days; other new applications 270 | Same |
| Missing/negative duration | Included in total; excluded from on-time count and nonnegative average | Same |
| Classification | Existing reliance precedence, outcome/type categories and bands | Equivalent for the sample scope |
| Query structure | Separate stored face and drilldown outputs | Shared records with FACE and DRILLDOWN combined; materialized event and medicine CTEs |

For example, an application approved in 2023 and reinstated in 2025 stays in the 2023 decision period under the new rule, provided the original qualifying approval is logged. This is latest qualifying decision logic, not first-ever approval logic.

## Actual 2025 results: medicine new applications only

| Metric | Current | Sample |
|---|---:|---:|
| Total | 844 | 839 |
| On time | 252 | 246 |
| Percentage | 29.86% | 29.32% |
| Currently approved | 686 | 679 |
| Currently rejected | 149 | 150 |
| Currently suspended | 9 | 9 |
| Currently cancelled | 0 | 1 |

Nine records leave 2025 and four enter. The sample average is 486.64 days. Each complete category dimension reconciles to the sample face's 839 total and 246 on time; internal and reliance pathways reconcile when combined. Do not add all category dimensions together, because each repeats the same applications.

The stored reports and sample were executed within one repeatable-read snapshot. Separate diagnostics used read-only queries outside that snapshot. These are direct database results, not authenticated browser/API verification.

## Exceptions and limitations

1. **Cancellation is a proxy, not an observed approval date.** MA 6539 has a 2022 rejection and an APR→CNCL entry on 6 February 2025, but no logged APR. The sample adds it to 2025 using cancellation as synthetic approval. This is a defensible missing-data convention only if accepted and identified as estimated; it cannot establish when approval actually happened. One fallback candidate was found among 3,871 eligible medicine new applications.
2. **Current status does not resolve conflicting historical events.** MAs 30622, 29118 and 16280 are currently APR, but their latest qualifying events are REJ after VOID. The sample assigns rejection dates while the outcome category still says Approved. These occur outside the sample's 2025 period. The comment that current status makes VOID history safe to ignore is therefore insufficient. Source history/current status needs reconciliation or an explicit exception policy; silently discarding every VOID is not a reliable alternative either.
3. **No event means no decision-period inclusion.** One eligible APR record (2181) has no effective event and no old decision date. It already falls outside a dated old query, but the new inner join also removes it when no period filter is applied. Thus the claim that only date changes is not universally true for unfiltered reports.
4. **The transition test is broader than verified workflow steps.** Null previous statuses qualify, and transitions from CNCL/VOID/other statuses also qualify. Direct APR→REJ or REJ→APR is excluded. Confirm those transitions are administrative rather than substantive decisions before generalizing across products. Equal event timestamps lack a tie-breaker; no conflicting APR/REJ timestamp ties were found in this check.
5. **The duration clock is unchanged.** Moving the date does not restrict stage calculations to the selected decision cycle or fix previously identified interval anomalies. A corrected reporting period is not certification of the processing duration.
6. **Current-status reporting remains mutable historically.** ARCH is still excluded, so later archival can remove an application from past-year results. The SQL does not prove that every archived record was superseded; that is a business assertion in the comments.
7. **Existing presentation conventions remain.** Overall target_days is 270 even though reliance records use 90. EUA cleanup does not exclude EUA records: application type becomes Unspecified and MA type falls back to EUA. These are inherited behaviors, not new changes.
8. **Performance claim is unverified.** The sample executed successfully with MATERIALIZED. The attachment's claim of over ten minutes without it was not benchmarked here.

## Scope of implementation after approval

- Apply an agreed effective-decision rule consistently to relevant decision-date percentage, average, median and drilldown queries across Medicine, Food, Food Notification, Medical Device and Cosmetics.
- Preserve each product/module's eligibility, root-application classification, SLA, output schema and distribution fields. Report 155 currently returns NMR, REN, VMIN and VMAJ; the attachment contains NMR only. Face and drilldown must remain separate stored outputs for the app.
- Preserve submission-date semantics. The sample does not authorize converting submission reports to decision reports or removing their no-history records.
- Review PAR reports separately: they use decision/approval timestamps both to select applications and to find subsequent publications and calculate elapsed time. A DATE cast suitable for inclusive period filtering must not truncate the timestamp used for publication timing. This sample supplies no replacement PAR definition.
- Adapt `@dateFilter` to actual metadata. Reports 155 and 160 currently have an empty Alias, contrary to the attachment's comment that Alias is ma. The proposed query's `WHERE` also needs to remain valid when the application inserts its `AND` filter fragment.
- Back up the current table, prepare guarded updates and rollback, and verify face/drilldown reconciliation and product/date coverage before applying the approved change.

No migration has been generated or applied in this review. User approval is required by the explicit request before updating MA scripts.

## Evidence

- `current-reports.json`: live query and filter snapshot.
- `results.json`: baseline comparisons and executed 2025 results.
- `diagnostics.json`: cohort movement, missing events, fallback and conflict counts.
- `edge-cases.json`: status-event evidence for the exceptions above.
- `review.cjs` and `diagnostics.cjs`: reproducible read-only checks.
