-- ============================================================================
-- MA Medicine Yearly Report (2018-2026)
-- New applications (module NMR) for medicines (submodule MDCN), split into:
--   SRA           = SRA pathway only (incl. null pathway + is_sra flag)
--   WHO-PQ        = WHOPQ pathway only
--   non-Reliance  = Regular (NSRA) / Fast Track (FTR) / Conditional (CNDL)
--                   / Low Risk (LRISK) / EUA  (incl. null pathway + NOT is_sra)
-- Legacy records (ma_number containing 'LD') and deleted apps are excluded.
--
-- Row definitions:
--   Requested          = first RQST log entry (fallback: ma.created_date)
--   Approved           = first APR log entry
--   FIR                = first FIR log entry (distinct applications)
--   Avg/Median days    = processing_time_in_day from license.vwma_processing_time
--                        (decision date - submission date), counted under the
--                        DECISION year, durations clamped to 0..3000 days.
--                        Decided = APR or REJ (approved AND rejected, not
--                        approved-only; pending apps are excluded).
--   "excl. applicant"  = same, minus time the file sat with the applicant:
--                        sum of RTA->RTAR and FIR->FIRR transition durations
--                        from the status log (same method as
--                        vwma_processing_time_aggregates), floored at 0.
--   "pathway assigned" = avg/median EXCLUDING applicant lag, restricted to
--                        applications with an explicit approval_pathway_id.
--                        Pathway assignment began in 2023, so these rows show
--                        the regulator-side clock of the modern-era cohort,
--                        free of the pre-pathway backlog that inflates
--                        decision-year averages (esp. 2025).
--   "no pathway"       = the complement: applications with NULL
--                        approval_pathway_id (bucketed by the is_sra flag).
--                        Only exists for non-Reliance and SRA -- the WHO-PQ
--                        bucket requires an explicit pathway code.
-- ============================================================================

WITH base AS (
    SELECT DISTINCT
        ma.id,
        ma.created_date,
        ma.approval_pathway_id IS NOT NULL AS has_pathway,
        CASE
            WHEN app.approval_pathway_code = 'SRA'
                 OR (ma.approval_pathway_id IS NULL AND ma.is_sra)
                THEN 'SRA'
            WHEN app.approval_pathway_code = 'WHOPQ'
                THEN 'WHO'
            WHEN app.approval_pathway_code IN ('NSRA', 'FTR', 'CNDL', 'LRISK', 'EUA')
                 OR (ma.approval_pathway_id IS NULL AND NOT ma.is_sra)
                THEN 'NREL'
        END AS pathway_class
    FROM license.ma ma
    JOIN common.ma_type        mat  ON ma.ma_type_id = mat.id
    JOIN common.submodule_type subt ON mat.submodule_type_id = subt.id
    JOIN common.submodule      sb   ON mat.ma_type_code = sb.submodule_code
    JOIN common.module         mo   ON sb.module_id = mo.id
    JOIN common.ma_status      mas  ON ma.ma_status_id = mas.id
    LEFT JOIN common.approval_pathway app ON ma.approval_pathway_id = app.id
    WHERE subt.submodule_type_code = 'MDCN'      -- medicines only
      AND mo.module_code = 'NMR'                 -- new applications only
      AND ma.ma_number NOT LIKE '%LD%'           -- exclude legacy
      AND mas.ma_status_code <> 'DEL'            -- exclude deleted
),

-- first occurrence of each milestone status per application
ev AS (
    SELECT
        ls.ma_id,
        MIN(ls.modified_date) FILTER (WHERE ls.to_status_code = 'RQST') AS first_rqst,
        MIN(ls.modified_date) FILTER (WHERE ls.to_status_code = 'FIR')  AS first_fir,
        MIN(ls.modified_date) FILTER (WHERE ls.to_status_code = 'APR')  AS first_apr
    FROM license.vwma_log_status_new ls
    GROUP BY ls.ma_id
),

-- applicant lag per application: time spent in RTA (before RTAR) and in
-- FIR (before FIRR), from consecutive log transitions -- the same method
-- vwma_processing_time_aggregates uses
applicant_lag AS (
    SELECT t.ma_id,
           SUM(t.dur_days) FILTER (
               WHERE (t.from_status_code = 'RTA' AND t.to_status_code = 'RTAR')
                  OR (t.from_status_code = 'FIR' AND t.to_status_code = 'FIRR')
           ) AS applicant_days
    FROM (
        SELECT ls.ma_id,
               ls.from_status_code,
               ls.to_status_code,
               EXTRACT(EPOCH FROM ls.modified_date
                   - LAG(ls.modified_date) OVER (PARTITION BY ls.ma_id
                                                 ORDER BY ls.modified_date)
               ) / 86400.0 AS dur_days
        FROM license.vwma_log_status_new ls
        WHERE ls.from_status_code IS NOT NULL
          AND ls.to_status_code   IS NOT NULL
    ) t
    WHERE t.dur_days IS NOT NULL AND t.dur_days > 0
    GROUP BY t.ma_id
),

req AS (   -- requested per year
    SELECT b.pathway_class,
           EXTRACT(YEAR FROM COALESCE(e.first_rqst, b.created_date))::int AS yr,
           COUNT(*)::numeric AS v
    FROM base b
    LEFT JOIN ev e ON e.ma_id = b.id
    WHERE b.pathway_class IS NOT NULL
    GROUP BY 1, 2
),

apr AS (   -- approved per year
    SELECT b.pathway_class,
           EXTRACT(YEAR FROM e.first_apr)::int AS yr,
           COUNT(*)::numeric AS v
    FROM base b
    JOIN ev e ON e.ma_id = b.id
    WHERE b.pathway_class IS NOT NULL
      AND e.first_apr IS NOT NULL
    GROUP BY 1, 2
),

fir AS (   -- entered FIR per year (distinct applications, first FIR)
    SELECT b.pathway_class,
           EXTRACT(YEAR FROM e.first_fir)::int AS yr,
           COUNT(*)::numeric AS v
    FROM base b
    JOIN ev e ON e.ma_id = b.id
    WHERE b.pathway_class IS NOT NULL
      AND e.first_fir IS NOT NULL
    GROUP BY 1, 2
),

pt AS (    -- processing time of decided apps (APR + REJ), by decision year
    SELECT b.pathway_class,
           EXTRACT(YEAR FROM p.decision_date)::int AS yr,
           ROUND(AVG(p.processing_time_in_day)::numeric, 1) AS avg_v,
           ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY p.processing_time_in_day))::numeric, 1) AS med_v,
           ROUND(AVG(GREATEST(p.processing_time_in_day
                              - COALESCE(al.applicant_days, 0), 0))::numeric, 1) AS avg_nolag,
           ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY GREATEST(p.processing_time_in_day
                                     - COALESCE(al.applicant_days, 0), 0)))::numeric, 1) AS med_nolag,
           ROUND(AVG(GREATEST(p.processing_time_in_day
                              - COALESCE(al.applicant_days, 0), 0))
                 FILTER (WHERE b.has_pathway)::numeric, 1) AS avg_pw,
           ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY GREATEST(p.processing_time_in_day
                                     - COALESCE(al.applicant_days, 0), 0))
                 FILTER (WHERE b.has_pathway))::numeric, 1) AS med_pw,
           ROUND(AVG(p.processing_time_in_day)
                 FILTER (WHERE NOT b.has_pathway)::numeric, 1) AS avg_nopw,
           ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY p.processing_time_in_day)
                 FILTER (WHERE NOT b.has_pathway))::numeric, 1) AS med_nopw
    FROM base b
    JOIN license.vwma_processing_time p ON p.id = b.id
    LEFT JOIN applicant_lag al ON al.ma_id = b.id
    WHERE b.pathway_class IS NOT NULL
      AND p.decision_date IS NOT NULL
      AND p.processing_time_in_day BETWEEN 0 AND 3000   -- drop bad-date outliers
    GROUP BY 1, 2
),

long_form AS (
    SELECT 1 AS ord, 'New Requested MA Medicine (non-Reliance) Count (Regular, Fast track, Conditional, Low Risk)' AS report_type, yr, v FROM req WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 2, 'New Requested MA Medicine WHO-PQ Count', yr, v FROM req WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 3, 'New Requested MA Medicine SRA Count', yr, v FROM req WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 4, 'New Approved MA Medicine (non-Reliance) Count (Regular, Fast track, Conditional, Low Risk)', yr, v FROM apr WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 5, 'New Approved MA Medicine WHO-PQ Count', yr, v FROM apr WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 6, 'New Approved MA Medicine SRA Count', yr, v FROM apr WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 7, 'New FIR MA Medicine (non-Reliance) Count (Regular, Fast track, Conditional, Low Risk)', yr, v FROM fir WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 8, 'New FIR MA Medicine WHO-PQ Count', yr, v FROM fir WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 9, 'New FIR MA Medicine SRA Count', yr, v FROM fir WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 10, 'New Average Processing time MA Medicine (non-Reliance) (Regular, Fast track, Conditional, Low Risk)', yr, avg_v FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 11, 'New Average Processing time MA Medicine WHO-PQ', yr, avg_v FROM pt WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 12, 'New Average Processing time MA Medicine SRA', yr, avg_v FROM pt WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 13, 'New Median Processing time MA Medicine (non-Reliance) (Regular, Fast track, Conditional, Low Risk)', yr, med_v FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 14, 'New Median Processing time MA Medicine WHO-PQ', yr, med_v FROM pt WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 15, 'New Median Processing time MA Medicine SRA', yr, med_v FROM pt WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 16, 'New Average Processing time excl. applicant time MA Medicine (non-Reliance)', yr, avg_nolag FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 17, 'New Average Processing time excl. applicant time MA Medicine WHO-PQ', yr, avg_nolag FROM pt WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 18, 'New Average Processing time excl. applicant time MA Medicine SRA', yr, avg_nolag FROM pt WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 19, 'New Median Processing time excl. applicant time MA Medicine (non-Reliance)', yr, med_nolag FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 20, 'New Median Processing time excl. applicant time MA Medicine WHO-PQ', yr, med_nolag FROM pt WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 21, 'New Median Processing time excl. applicant time MA Medicine SRA', yr, med_nolag FROM pt WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 22, 'New Average Processing time excl. applicant time MA Medicine (non-Reliance) - approval pathway assigned', yr, avg_pw FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 23, 'New Average Processing time excl. applicant time MA Medicine WHO-PQ - approval pathway assigned', yr, avg_pw FROM pt WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 24, 'New Average Processing time excl. applicant time MA Medicine SRA - approval pathway assigned', yr, avg_pw FROM pt WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 25, 'New Median Processing time excl. applicant time MA Medicine (non-Reliance) - approval pathway assigned', yr, med_pw FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 26, 'New Median Processing time excl. applicant time MA Medicine WHO-PQ - approval pathway assigned', yr, med_pw FROM pt WHERE pathway_class = 'WHO'
    UNION ALL
    SELECT 27, 'New Median Processing time excl. applicant time MA Medicine SRA - approval pathway assigned', yr, med_pw FROM pt WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 28, 'New Average Processing time MA Medicine (non-Reliance) - no approval pathway', yr, avg_nopw FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 29, 'New Average Processing time MA Medicine SRA - no approval pathway', yr, avg_nopw FROM pt WHERE pathway_class = 'SRA'
    UNION ALL
    SELECT 30, 'New Median Processing time MA Medicine (non-Reliance) - no approval pathway', yr, med_nopw FROM pt WHERE pathway_class = 'NREL'
    UNION ALL
    SELECT 31, 'New Median Processing time MA Medicine SRA - no approval pathway', yr, med_nopw FROM pt WHERE pathway_class = 'SRA'
)

SELECT
    report_type AS "Report Types",
    MAX(v) FILTER (WHERE yr = 2018) AS "2018",
    MAX(v) FILTER (WHERE yr = 2019) AS "2019",
    MAX(v) FILTER (WHERE yr = 2020) AS "2020",
    MAX(v) FILTER (WHERE yr = 2021) AS "2021",
    MAX(v) FILTER (WHERE yr = 2022) AS "2022",
    MAX(v) FILTER (WHERE yr = 2023) AS "2023",
    MAX(v) FILTER (WHERE yr = 2024) AS "2024",
    MAX(v) FILTER (WHERE yr = 2025) AS "2025",
    MAX(v) FILTER (WHERE yr = 2026) AS "2026"
FROM long_form
WHERE yr BETWEEN 2018 AND 2026
GROUP BY ord, report_type
ORDER BY ord;