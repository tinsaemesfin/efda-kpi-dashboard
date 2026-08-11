# EFDA Regulatory KPI Dashboard Progress Report

 EFDA KPI Dashboard, built on the ERIS regulatory information system
**Status:** Functional system running on the ERIS development/feature environment;

---

## 1. What this system is and why it was needed

EFDA measures its regulatory performance against a defined set of Key Performance Indicators — for example, "what percentage of new market authorisation applications were completed within the 270-day target." Until now, answering those questions meant manual extraction from the ERIS regulatory database, followed by hand-built spreadsheets. The numbers could not be broken down to find *why* a target was missed.

The KPI Dashboard replaces that process. It is a secure web application that reads directly from the live ERIS regulatory data, calculates each KPI using an agreed and documented formula, and lets a manager click any indicator to see the breakdown behind it by application type, regulatory pathway, decision outcome and processing-time band.

It covers three regulatory programmes, with **25 KPI definitions** in total:


| Programme                     | KPIs | Scope                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Market Authorisation (MA)** | 8    | On-time completion of new registrations, renewals, minor and major variations; queries/FIRs; median and average completion time; publication of Public Assessment Reports (PARs) — each calculated separately for **Medicine, Food, Food Notification, Medical Device and Cosmetics** |
| **GMP Inspections**           | 9    | Inspections against plan, complaint-triggered inspections, waived on-site inspections, GMP compliance rate, CAPA decisions, application turnaround (average and median), report publication                                                                                           |
| **Clinical Trials**           | 8    | New CT applications, amendments, GCP inspections, safety reports, GCP compliance, national registry listing, CAPA evaluation, turnaround time                                                                                                                                         |


---

## 2. The largest part of the work: data cleaning, database mapping and view creation

This deserves to be stated plainly, because it is where the majority of the past months went and it is invisible from the screen.

ERIS is a very large, live transactional database. It was designed to *process* applications, not to *report* on them. Turning it into a trustworthy measurement system required the following work before a single KPI could be displayed:

**Database mapping.** Every KPI formula had to be traced back to concrete database objects and agreed field-by-field. The mapping now covers the marketing-authorisation domain (`license.vwma`, `license.vwma_unified_processing_time`, `license.ma_log_status`, `license.ma_assignment`, `license.ma_review`), the document domain used for PAR publication (`document.document`, `document.module_document`, `common.document_type`), the shared reference lookups (`common.ma_type`, `common.ma_status`), and the inspection domain for GMP. Each of the ~30 KPI/drill-down formulas is documented with its source objects, numerator, denominator, target and filters.

**Data cleaning rules.** Raw ERIS data cannot be counted as-is. The following business rules were identified, agreed and encoded into the reporting layer:

- **Approval pathways consolidated** into *Internal regulatory pathway* vs *Reliance pathway*, with WHO Pre-Qualified and SRA-recognised products correctly grouped under Reliance rather than being scattered across inconsistent free-text values.
- **Historical records with no pathway recorded** are labelled *"Before IRP"* instead of "UNSPECIFIED", so pre-reform applications are visible as a legitimate category rather than looking like missing data.
- **Emergency Use Authorisation (EUA)** records are excluded from the routine application-type and MA-type breakdowns, so exceptional pandemic-era approvals do not distort normal performance.
- **Archived, cancelled and legacy migrated records** are excluded from outcome counting; legacy MA numbers carried over from the pre-ERIS system are filtered out so they do not inflate denominators.
- **Application type codes reconciled** — the same real-world application type appears under different codes in different modules; these are now aliased to a single canonical set before counting.
- **Processing-time definition agreed and standardised**, distinguishing regulatory time from applicant response time, and combining team-leader and final decision time into a single defensible measure.
- **Processing-time banding** (0–30, 31–90, 91–180, 181–270, 270+ days) so delays are visible as a distribution rather than a single average.
- **Statistically proper time metrics** — median, 25th/75th/90th percentiles, inter-quartile range and outlier counts, not just a simple average that a handful of extreme cases can distort.

**View and report creation.** These rules were implemented as reusable SQL reporting definitions registered in the ERIS KPI catalogue (`kpi.kpi`), each with its own report ID. **28 KPI report definitions are now registered and serving data**, covering the headline figures and the drill-down breakdowns. Because the logic lives in the database rather than in the dashboard, every number the dashboard shows is reproducible and auditable, and the same definitions can be reused by any other reporting tool in future.

---

## 3. What is complete and running on live data today

**28 of the 56 KPI/product metric feeds — approximately half — are now calculated from live ERIS production data.** The remainder display clearly-labelled sample figures until their database connections and definitions are completed (see Section 5).


| Area                       | Live on real ERIS data                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **MA — Medicine**          | New MA, renewals, minor variation, major variation, median completion time, average completion time, PAR publication (7 of 8) |
| **MA — Food**              | New MA, renewals, minor and major variation, PAR publication                                                                  |
| **MA — Food Notification** | New, renewals, minor and major variation                                                                                      |
| **MA — Medical Device**    | New MA, renewals, minor and major variation, PAR publication                                                                  |
| **MA — Cosmetics**         | New MA, renewals, variation, PAR publication                                                                                  |
| **Clinical Trials**        | New CT applications on time (90-day target), CT amendments on time (60-day target)                                            |
| **GMP Inspections**        | Facilities inspected as per plan (local and abroad)                                                                           |


**Drill-down analysis on live data** is available for **14 indicators**: the four core on-time KPIs for Medicine, Food and Medical Device, plus the median and average completion-time analyses for Medicine. Each opens a multi-level breakdown by application type, internal and reliance pathway, regulatory outcome and processing-time band, with charts and supporting tables.

**Security and access.** The dashboard is integrated with the EFDA ERIS single sign-on identity service. Users log in with their existing ERIES credentials; no separate account is created. Sessions renew automatically and every page is access-protected. The user's permissions are retrieved from ERIS at login, providing the foundation for role-based views.

**The system itself.** Three programme workspaces plus an executive overview page; 87 purpose-built interface components;  Every KPI card carries an explicit label stating whether the figure comes from live data or sample data  nothing is presented as official when it is not. Filtering by period, searching KPIs, switching product lines and switching display density all work. The interface is responsive and follows a government-grade visual standard defined for this project.

---

## 4.what is not yet finished

1. **Not yet on a production server.** The system currently runs against the ERIS development/feature environment. There is no production hosting, no automated deployment and no public URL(we have dev server running with public url).
2. **28 metric feeds still show sample data**, clearly labelled as such: MA queries/FIRs for all product lines; time metrics for Food, Medical Device and Cosmetics; Clinical Trials KPIs 3–8; GMP KPIs 2–9. The interfaces are built and tested — what is missing is the agreed data definition and SQL view for each.
3. **Export to Excel and PDF is not implemented.** The buttons are present in the interface but not yet functional.
4. **Date-range filtering on the MA workspace is applied in the interface only**, not yet passed through to the database query (it is fully wired on Clinical Trials).
5. **The executive overview page still uses summarised sample figures** rather than aggregating the live programme numbers.
6. **Role-based views are not yet enforced.** Permissions are retrieved at login but all authenticated users currently see the same content.

---

## 5. Plan for the coming weeks and months

**Next 6–8 weeks**

- Deploy to a production internal EFDA address, so officials can access the dashboard directly.
- Connect the MA date-range filter to the database queries, and connect the executive overview page to the live programme figures.
- Complete the remaining MA time metrics (median and average) for Food, Medical Device and Cosmetics — the Medicine pattern is already proven and reusable.
- Deliver Excel and PDF export from every KPI card and drill-down.

**Following 2–4 months**

- Define, clean and build the views for **GMP KPIs 2–9** — the database mapping for the inspection domain is already documented and ready to implement.
- Define, clean and build the views for **Clinical Trials KPIs 3–8**.
- Complete the MA queries/FIR indicator, which requires reconstructing query-and-response cycles from status-transition history.
- Extend drill-down to Cosmetics, Food Notification, PAR and the remaining programmes.
- Enable role-based views so directors, programme heads and staff each see the scope relevant to them.

**Beyond that**

- Scheduled and emailed periodic KPI reports.
- Comparison and trend views across periods, and alerting when an indicator falls below target.

---

## 6. Summary

Over nine months this system has moved from nothing to a working, secured, live-data regulatory performance dashboard. Roughly half of the defined KPI measurements now come straight from the ERIS production database, with verified drill-down analysis behind the headline numbers, and the reporting definitions are held in the database so that every figure is auditable and reusable.

The substantial and unglamorous part of the effort — mapping a very large live regulatory database, agreeing what each number actually means, and cleaning inconsistent historical data into countable form — is now largely done for the Market Authorisation programme. That groundwork is what makes the remaining KPIs a matter of repeating a proven process rather than starting again.