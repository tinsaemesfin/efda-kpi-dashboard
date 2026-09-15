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
    CASE WHEN v.module_code = 'VAR' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = 'MDCN'
    AND v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
    AND (v.module_code <> 'VAR' OR v.ma_type_code IN ('VMIN', 'VMAJ'))
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
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS')
        OR approval_pathway_norm ILIKE '%reliance%'
        OR approval_pathway_code_norm ILIKE '%REL%'
        OR approval_pathway_code_norm ILIKE '%CRP%'
        OR approval_pathway_norm ILIKE '%WHO Pre Qualified%'
      THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,
    CASE WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN 'Not published'
      WHEN processing_time_in_day < 0 THEN 'Invalid publication date'
      WHEN processing_time_in_day <= 7 THEN '0-7 days'
      WHEN processing_time_in_day <= 14 THEN '8-14 days'
      WHEN processing_time_in_day <= 30 THEN '15-30 days'
      WHEN processing_time_in_day <= 60 THEN '31-60 days'
      ELSE 'Over 60 days'
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES ('Application type'::text, COALESCE(c.application_type_clean, 'Unspecified')::text),
      ('Internal regulatory pathway', CASE WHEN c.pathway_group = 'Internal regulatory pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Reliance pathway', CASE WHEN c.pathway_group = 'Reliance pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Regulatory outcome', COALESCE(c.regulatory_outcome, c.ma_status_code, 'Unspecified')),
      ('MA type', COALESCE(c.ma_type_code, c.ma_type_code, 'Unspecified')),
      ('Publication time band', c.publication_band),
      ('Application module', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;