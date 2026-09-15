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

data AS (SELECT b.*, e.first_rqst,e.first_apr,e.first_fir,p.submission_date,p.decision_date,p.processing_time_in_day,al.applicant_days,mas.ma_status_code,ma.is_sra,ap.approval_pathway_code
FROM base b LEFT JOIN ev e ON e.ma_id=b.id LEFT JOIN license.vwma_processing_time p ON p.id=b.id LEFT JOIN applicant_lag al ON al.ma_id=b.id JOIN license.ma ma ON ma.id=b.id JOIN common.ma_status mas ON mas.id=ma.ma_status_id LEFT JOIN common.approval_pathway ap ON ap.id=ma.approval_pathway_id)
SELECT pathway_class,ma_status_code,approval_pathway_code,is_sra,EXTRACT(YEAR FROM COALESCE(first_rqst,created_date))::int request_year,EXTRACT(YEAR FROM first_apr)::int first_approval_year,EXTRACT(YEAR FROM submission_date)::int submission_year,EXTRACT(YEAR FROM decision_date)::int decision_year,
count(*)::int n,count(*) FILTER(WHERE first_rqst IS NULL)::int missing_rqst,count(*) FILTER(WHERE processing_time_in_day<0 OR processing_time_in_day>3000)::int outliers,count(*) FILTER(WHERE applicant_days>processing_time_in_day)::int lag_exceeds_total,
round(avg(processing_time_in_day)::numeric,2) avg_elapsed
FROM data GROUP BY 1,2,3,4,5,6,7,8