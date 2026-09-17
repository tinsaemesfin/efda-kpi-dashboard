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
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN ('PSA', 'SPC', 'LBL', 'PIL')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = 'FD'
    AND (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
    
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,'FD'::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;