# MA KPI completion report

Completed on 2026-08-27 for Medicine, Food, Food Notification, Medical Device, and Cosmetics. MA-KPI-5 (queries/FIR) was intentionally excluded.

## Delivered

- Added 32 consecutive database reports, IDs 89-120.
- Added missing Food Notification and Cosmetics KPI 1-4 drilldowns.
- Added KPI 6/7 face and statistical drilldown feeds for every MA product context.
- Added KPI 8 face and drilldown feeds for every MA product context.
- Corrected active KPI 6/7 calculations to cover the full regulator-controlled processing interval and to filter completed applications by `decision_date`.
- Corrected active EFDA KPI 8 feeds to the signed 60-day timeline and to filter granted applications by `decision_date`.
- Generalized frontend report routing, caching, hooks, normalization, and modal selection by product.
- Preserved all legacy report IDs and skipped all FIR work.

## Active report map

| Product | KPI 1-4 DD | KPI 6/7 face/DD | KPI 8 face/DD |
| --- | --- | --- | --- |
| Medicine | 9, 10, 11, 13 | 118 / 119 / 120 | 114 / 109 |
| Food | 18-21 | 96 / 97 / 98 | 115 / 110 |
| Food Notification | 89-92 | 99 / 100 / 101 | 108 / 111 |
| Medical Device | 22-25 | 102 / 103 / 104 | 116 / 112 |
| Cosmetics | 93-95 | 105 / 106 / 107 | 117 / 113 |

## Verification result

All new definitions executed successfully against the live 2026 data range. TypeScript, ESLint, Vitest, and production-build checks passed. None of the new report queries contains FIR logic.

Important data note: 2026 Food, Food Notification, Medical Device, and Cosmetics records currently have no qualifying PSA/SPC/LBL/PIL publication uploads, so their KPI 8 feeds correctly return 0% and their drilldowns show `Not published`. This should be reconciled with any external PAR publication system before treating it as a definitive operational performance conclusion.

## September 2026 MA review

- Applied the 90-day reliance SLA to SRA, WHO-prequalified, regional-reliance, and continental-reliance category rows in all active KPI 1-4 and KPI 6/7 drilldowns.
- Updated the KPI 1-4 face calculations so reliance NMR cases are assessed against 90 days while ordinary NMR cases retain 270 days. The face response retains the ordinary KPI target so one KPI card is not split into duplicate target rows.
- Kept KPI 8 PAR reports on their independent 60-day publication SLA.
- Replaced the date-preset selector with an explicit `Submission date` / `Decision date` selector. Submission date is the dashboard default.
- Changed all active KPI 1-4 reports from `created_date` to the actual `submission_date` field and added paired Decision-date definitions.
- Added paired Submission-date definitions for KPI 6/7 and KPI 8, which previously only supported `decision_date`. Database report IDs 155-203 cover all front and drilldown variants, and the sequence is synchronized at 203.
- Kept the From/To inputs independent of the date basis and capped their maximum at the user's local current date.
- Updated MA cards and drilldowns to display the 90% performance target together with the applicable day SLA. Time-chart colors and reference lines now use each category's returned `target_days`, including 90 days for reliance pathways and 60 days for PAR.
- Added visible explanations of each chart's percentage, numerator/denominator, SLA, and selected date cohort.
