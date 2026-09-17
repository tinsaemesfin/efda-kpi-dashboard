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
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = 'MD'
    AND v.module_code = 'NMR'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'Reliance pathway'
      WHEN approval_pathway_norm ILIKE '%reliance%'
        OR approval_pathway_code_norm ILIKE '%REL%'
        OR approval_pathway_code_norm ILIKE '%CRP%'
        OR approval_pathway_norm ILIKE '%WHO Pre Qualified%'
        THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    /*
      Uses the unified regulatory processing time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid processing time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= 270 THEN '181-270 days'
      ELSE '270+ days'
    END AS processing_band,

    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization'
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN 'SRA''s'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = 'APR' THEN 'Approved'
      WHEN ma_status_code = 'ARCH' THEN 'Archived'
      WHEN ma_status_code = 'REJ' THEN 'Rejected'
      WHEN ma_status_code = 'SUSP' THEN 'Suspended'
      WHEN ma_status_code = 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
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
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    upt.processing_time_in_day,

    90 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = 'MD'
    AND v.module_code = 'REN'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ '%LD%'
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'Reliance pathway'
      WHEN approval_pathway_norm ILIKE '%reliance%'
        OR approval_pathway_code_norm ILIKE '%REL%'
        OR approval_pathway_code_norm ILIKE '%CRP%'
        OR approval_pathway_norm ILIKE '%WHO Pre Qualified%'
        THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid processing time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      ELSE '90+ days'
    END AS processing_band,

    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization'
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN 'SRA''s'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = 'APR' THEN 'Approved'
      WHEN ma_status_code = 'ARCH' THEN 'Archived'
      WHEN ma_status_code = 'REJ' THEN 'Rejected'
      WHEN ma_status_code = 'SUSP' THEN 'Suspended'
      WHEN ma_status_code = 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    'VMIN'::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = 'MD'
    AND v.module_code = 'VAR'
    AND v.ma_type_code = 'MDVMIN'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')

    /* Exclude current legacy records */
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
  ORDER BY current_id, depth DESC
),

root_nmr AS (
  SELECT
    rm.current_id,
    rm.root_id
  FROM root_ma rm
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = 'NMR'

   /* Exclude root legacy records */
   AND root_v.ma_number::text !~~ '%LD%'
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, 'UNSPECIFIED') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, 'UNSPECIFIED')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, 'UNSPECIFIED')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.submoduletype_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated processing time drives:
      - Processing time band
      - On-time count
      - Percentage
      - Average processing days
    */
    bc.processing_time_in_day,

    CASE
      WHEN rd.root_application_type = 'New Application - Emergency Use Authorization'
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN 'SRA''s'
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'SRA''s'
      WHEN rd.root_approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'Reliance pathway'
      WHEN rd.root_approval_pathway_norm ILIKE '%reliance%'
        OR rd.root_approval_pathway_code_norm ILIKE '%REL%'
        OR rd.root_approval_pathway_code_norm ILIKE '%CRP%'
        OR rd.root_approval_pathway_norm ILIKE '%WHO Pre Qualified%'
        THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = 'APR' THEN 'Approved'
      WHEN bc.current_ma_status_code = 'ARCH' THEN 'Archived'
      WHEN bc.current_ma_status_code = 'REJ' THEN 'Rejected'
      WHEN bc.current_ma_status_code = 'SUSP' THEN 'Suspended'
      WHEN bc.current_ma_status_code = 'CNCL' THEN 'Cancelled'
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'MDVMIN'
        THEN 'VMIN'
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'EUA'
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN 'No processing time'
      WHEN bc.processing_time_in_day < 0 THEN 'Invalid processing time'
      WHEN bc.processing_time_in_day <= 30 THEN '0-30 days'
      WHEN bc.processing_time_in_day <= 60 THEN '31-60 days'
      ELSE '60+ days'
    END AS processing_band

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    'VMAJ'::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = 'MD'
    AND v.module_code = 'VAR'
    AND v.ma_type_code = 'MDVMAJ'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')

    /* Exclude current legacy variation records */
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
  ORDER BY current_id, depth DESC
),

root_nmr AS (
  SELECT
    rm.current_id,
    rm.root_id
  FROM root_ma rm
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = 'NMR'

   /* Exclude legacy root NMR records */
   AND root_v.ma_number::text !~~ '%LD%'
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, 'UNSPECIFIED') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, 'UNSPECIFIED')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, 'UNSPECIFIED')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.submoduletype_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated processing time drives:
      - Processing time band
      - On-time count
      - Percentage
      - Average processing days
    */
    bc.processing_time_in_day,

    CASE
      WHEN rd.root_application_type = 'New Application - Emergency Use Authorization'
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN 'SRA''s'
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'SRA''s'
      WHEN rd.root_approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'Reliance pathway'
      WHEN rd.root_approval_pathway_norm ILIKE '%reliance%'
        OR rd.root_approval_pathway_code_norm ILIKE '%REL%'
        OR rd.root_approval_pathway_code_norm ILIKE '%CRP%'
        OR rd.root_approval_pathway_norm ILIKE '%WHO Pre Qualified%'
        THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = 'APR' THEN 'Approved'
      WHEN bc.current_ma_status_code = 'ARCH' THEN 'Archived'
      WHEN bc.current_ma_status_code = 'REJ' THEN 'Rejected'
      WHEN bc.current_ma_status_code = 'SUSP' THEN 'Suspended'
      WHEN bc.current_ma_status_code = 'CNCL' THEN 'Cancelled'
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'MDVMAJ'
        THEN 'VMAJ'
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'EUA'
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN 'No processing time'
      WHEN bc.processing_time_in_day < 0 THEN 'Invalid processing time'
      WHEN bc.processing_time_in_day <= 30 THEN '0-30 days'
      WHEN bc.processing_time_in_day <= 60 THEN '31-60 days'
      ELSE '60+ days'
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
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
SELECT module_code, 'MD'::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;