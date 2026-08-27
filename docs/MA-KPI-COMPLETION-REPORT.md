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

All new definitions executed successfully against the live 2026 data range. TypeScript, ESLint, Vitest, and production-build checks passed. The database sequence is synchronized at 120, and none of the new report queries contains FIR logic.

Important data note: 2026 Food, Food Notification, Medical Device, and Cosmetics records currently have no qualifying PSA/SPC/LBL/PIL publication uploads, so their KPI 8 feeds correctly return 0% and their drilldowns show `Not published`. This should be reconciled with any external PAR publication system before treating it as a definitive operational performance conclusion.
