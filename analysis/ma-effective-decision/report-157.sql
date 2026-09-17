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
WITH unified_processing_time AS (
  SELECT
    id,
    MAX(
        COALESCE(screener_assignment_time_days, 0)
      + COALESCE(screening_time_days, 0)
      + COALESCE(assessor_assignment_time_days, 0)
      + COALESCE(assessment_time_days, 0)
      + COALESCE(teamleader_decision_time_days, 0)
      + COALESCE(leo_final_decision_time_days, 0)
    ) AS processing_time_in_day
  FROM license.vwma_unified_processing_time
  GROUP BY id
),
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    'NMR'::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = 'FD'
    AND (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = 'NMR'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
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
    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN 'APR' THEN 'Approved'
      WHEN 'REJ' THEN 'Rejected'
      WHEN 'ARCH' THEN 'Archived'
      WHEN 'SUSP' THEN 'Suspended'
      WHEN 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= target_days THEN '181-' || target_days || ' days'
      ELSE 'Over ' || target_days || ' days'
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    'REN'::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = 'FD'
    AND (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = 'REN'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
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
    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN 'APR' THEN 'Approved'
      WHEN 'REJ' THEN 'Rejected'
      WHEN 'ARCH' THEN 'Archived'
      WHEN 'SUSP' THEN 'Suspended'
      WHEN 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= target_days THEN '181-' || target_days || ' days'
      ELSE 'Over ' || target_days || ' days'
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    'VMIN'::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = 'FD'
    AND (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = 'VAR' AND v.ma_type_code = 'VFMIN'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
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
    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN 'APR' THEN 'Approved'
      WHEN 'REJ' THEN 'Rejected'
      WHEN 'ARCH' THEN 'Archived'
      WHEN 'SUSP' THEN 'Suspended'
      WHEN 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= target_days THEN '181-' || target_days || ' days'
      ELSE 'Over ' || target_days || ' days'
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    'VMAJ'::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = 'FD'
    AND (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = 'VAR' AND v.ma_type_code = 'VFMAJ'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
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
    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN 'APR' THEN 'Approved'
      WHEN 'REJ' THEN 'Rejected'
      WHEN 'ARCH' THEN 'Archived'
      WHEN 'SUSP' THEN 'Suspended'
      WHEN 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= target_days THEN '181-' || target_days || ' days'
      ELSE 'Over ' || target_days || ' days'
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, 'FD'::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;