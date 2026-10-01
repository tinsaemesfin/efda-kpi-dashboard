# Mandatory MA FIR restoration

The previous frontend requested report 218. In the connected `eris_dev_2026_22_06` catalogue, that ID now contains a GMP approved-local report. The original MA FIR query was recovered from `D:/Projects/eris-be/docs/kpi/ma/scripts/firr_to_stl_within_target.sql`; a verbatim reference copy is saved as `original-fir.sql`. That reference migration was **not executed**.

The original business calculation is retained: a completed cycle enters FIRR and its very next transition must be FIRR → STL. Calendar-day duration is measured per cycle; an application is on time only if its longest completed cycle is within the configured target. Pending cycles and cycles leaving FIRR for another status are excluded. Legacy application-number exclusion is retained. The existing target setting remains 30; no settings or status history were changed.

Two dedicated catalogue reports were inserted: 250 filters application submission dates; 251 filters effective decision dates using the same agreed event rules as the other MA decision reports. Unlike the original creation-date report, these follow the restored date selector. New, renewal, and variation counts remain visible across medicine, food, medical devices, and cosmetics. Food notifications remain supported by the frontend mapping; no qualifying notification rows were returned for the verified period.

| 2025 product | Submission date | Decision date |
|---|---:|---:|
| Medicine | 871 / 1,256 | 962 / 1,695 |
| Medical devices | 1,138 / 1,454 | 908 / 1,224 |
| Food | 332 / 402 | 236 / 289 |
| Cosmetics | 1 / 1 | No qualifying rows |

`deployment.json` and `verification.json` record aggregate results, including the recovered query with its original creation-date filter. Differences between that report and the new submission cohort arise from the date basis. `reports.json` records exact definitions and metadata. All 195 pre-existing report rows were verified unchanged within the installation transaction. A flushed/read-back full catalogue backup is retained locally and ignored by Git.

`node scripts/test-ma-fir-cycles.js` executes the recovered SQL against isolated values in a read-only connection: the 30-day boundary, a repeated late cycle, a pending cycle, a transition to another status, and a missing decision date. Frontend tests reconcile the stored deployment aggregates to product totals. No source application data was modified.

The database installation is committed. The date-selector MR 18 was already merged; hosted FIR availability requires merging and deploying the follow-up FIR restoration MR. This verification covers SQL and frontend processing; an authenticated hosted API/browser session has not been tested.
