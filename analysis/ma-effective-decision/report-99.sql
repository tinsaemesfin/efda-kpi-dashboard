/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN ('APR','REJ','SUSP','CNCL')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code='APR') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN ('SUSP','CNCL')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN ('APR','REJ') AND COALESCE(from_status_code,'') NOT IN ('SUSP','APR','REJ')
 UNION ALL SELECT ma_id,first_susp_cncl,'APR' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
decision_time_per_ma AS (
  SELECT
    id,
    MAX(
        COALESCE(screener_assignment_time_days, 0)
      + COALESCE(screening_time_days, 0)
      + COALESCE(assessor_assignment_time_days, 0)
      + COALESCE(assessment_time_days, 0)
      + COALESCE(teamleader_decision_time_days, 0)
      + COALESCE(leo_final_decision_time_days, 0)
    ) AS decision_time_in_days
  FROM license.vwma_unified_processing_time
  GROUP BY id
),
base AS (
  SELECT
    v.id,
    v.ma_number,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = 'FD'
    AND (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = 'NMR'
    AND v.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
)
SELECT
  'NMR'::text AS module_code,
  'FD'::text AS submoduletype_code,
  270::int AS target_days,
  'Median Completion Time'::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  'NMR'::text,
  'FD'::text,
  270::int,
  'Average Completion Time'::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0
) SELECT * FROM effective_report;