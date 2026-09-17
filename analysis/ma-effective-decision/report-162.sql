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
WITH records AS (
WITH RECURSIVE unified_processing_time AS (
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

base_current AS (
  SELECT
    v.id AS current_id,
    'VMIN'::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time used for:
      - Processing bands
      - On-time count
      - Percentage
      - Average processing days
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.module_code = 'VAR'
    AND v.ma_type_code = 'VMIN'
    AND v.submoduletype_code = 'MDCN'
    AND v.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')

    /*
      Exclude legacy CURRENT VMIN applications only.

      Root NMR records may be legacy because it is expected that
      many current variations originated from legacy NMR records.
    */
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
),

ma_chain AS (
  SELECT
    bc.current_id,
    m.id AS ma_id,
    m.original_ma_id,
    0 AS depth
  FROM base_current bc
  JOIN license.ma m
    ON m.id = bc.current_id

  UNION ALL

  SELECT
    mc.current_id,
    pm.id AS ma_id,
    pm.original_ma_id,
    mc.depth + 1 AS depth
  FROM ma_chain mc
  JOIN license.ma pm
    ON pm.id = mc.original_ma_id
  WHERE mc.depth < 20
),

root_ma AS (
  SELECT DISTINCT ON (current_id)
    current_id,
    ma_id AS root_id
  FROM ma_chain
  WHERE original_ma_id IS NULL
  ORDER BY
    current_id,
    depth DESC
),

/*
  Do not filter the root MA by:
  - root module = NMR
  - root MA number not containing LD

  This allows all 1,787 current non-legacy VMIN records
  to remain in the report.
*/
root_details AS (
  SELECT
    rm.current_id,
    rm.root_id,

    COALESCE(rv.application_type, 'UNSPECIFIED') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, 'UNSPECIFIED')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, 'UNSPECIFIED')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra

  FROM root_ma rm
  LEFT JOIN effective_ma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,
    bc.processing_time_in_day,

    CASE
      WHEN COALESCE(rd.root_application_type, 'UNSPECIFIED')
           = 'New Application - Emergency Use Authorization'
        THEN NULL
      ELSE COALESCE(rd.root_application_type, 'UNSPECIFIED')
    END AS application_type_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN 'SRA''s'
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, 'UNSPECIFIED')))
           IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'SRA''s'
      WHEN COALESCE(rd.root_approval_pathway_norm, 'UNSPECIFIED') = 'UNSPECIFIED'
        THEN 'Regular'
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, 'UNSPECIFIED')))
           IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'Reliance pathway'
      WHEN COALESCE(rd.root_approval_pathway_norm, '') ILIKE '%reliance%'
        OR COALESCE(rd.root_approval_pathway_code_norm, '') ILIKE '%REL%'
        OR COALESCE(rd.root_approval_pathway_code_norm, '') ILIKE '%CRP%'
        OR COALESCE(rd.root_approval_pathway_norm, '') ILIKE '%WHO Pre Qualified%'
        THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''))) = 'archived'
        OR bc.current_ma_status_code = 'ARCH'
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'EUA'
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN 'No processing time'
      WHEN bc.processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN bc.processing_time_in_day <= 30 THEN '0-30 days'
      WHEN bc.processing_time_in_day <= 60 THEN '31-60 days'
      WHEN bc.processing_time_in_day <= 90 THEN '61-90 days'
      WHEN bc.processing_time_in_day <= 180 THEN '91-180 days'
      WHEN bc.processing_time_in_day <= 270 THEN '181-270 days'
      ELSE '270+ days'
    END AS processing_band

  FROM base_current bc
  LEFT JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = 'Reliance pathway' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES ('Application type'::text, COALESCE(c.application_type_clean, 'Unspecified')::text),
      ('Internal regulatory pathway', CASE WHEN c.pathway_group = 'Internal regulatory pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Reliance pathway', CASE WHEN c.pathway_group = 'Reliance pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Regulatory outcome', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, 'Unspecified')),
      ('MA type', COALESCE(c.ma_type_clean, c.ma_type_code, 'Unspecified')),
      ('Processing time band', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;