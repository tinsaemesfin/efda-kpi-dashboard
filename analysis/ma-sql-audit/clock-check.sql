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

dt AS (SELECT id,MAX(COALESCE(screener_assignment_time_days,0)+COALESCE(screening_time_days,0)+COALESCE(assessor_assignment_time_days,0)+COALESCE(assessment_time_days,0)+COALESCE(teamleader_decision_time_days,0)+COALESCE(leo_final_decision_time_days,0)) days FROM license.vwma_unified_processing_time GROUP BY id)
SELECT EXTRACT(YEAR FROM p.decision_date)::int yr,b.pathway_class,count(*)::int n,
round(avg(p.processing_time_in_day)::numeric,2) elapsed_avg,
round(avg(GREATEST(p.processing_time_in_day-COALESCE(al.applicant_days,0),0))::numeric,2) attached_net_avg,
round(avg(dt.days)::numeric,2) app_stage_avg,
count(*) FILTER(WHERE abs(dt.days-GREATEST(p.processing_time_in_day-COALESCE(al.applicant_days,0),0))>1)::int differs_over_one_day,
count(*) FILTER(WHERE dt.days>p.processing_time_in_day+1)::int stage_exceeds_elapsed
FROM base b JOIN license.vwma_processing_time p ON p.id=b.id JOIN license.ma ma ON ma.id=b.id JOIN common.ma_status mas ON mas.id=ma.ma_status_id JOIN dt ON dt.id=b.id LEFT JOIN applicant_lag al ON al.ma_id=b.id
WHERE p.decision_date >= '2024-01-01' AND p.decision_date < '2027-01-01' AND p.processing_time_in_day BETWEEN 0 AND 3000 AND mas.ma_status_code IN ('APR','REJ','SUSP','CNCL') AND dt.days>=0
GROUP BY 1,2 ORDER BY 1,2