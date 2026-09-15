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
    v.decision_date AS approval_date,
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
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = 'CO'
    AND v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
    
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
SELECT module_code,'CO'::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;