/* MA face/drilldown alignment v1 */
WITH unified_processing_time AS (
  /*
    Creates one regulatory processing-time value per MA from
    vwma_unified_processing_time.

    Included:
    - Screener assignment
    - Screening
    - Assessor assignment
    - Assessment
    - Team Leader decision
    - LEO final decision

    Excluded:
    - Applicant response during screening
    - Applicant response to FIR
  */
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
    ma.id,
    ma.module_code,
    ma.submoduletype_code,
    ma.ma_type_code,
    COALESCE(ma.application_type, 'UNSPECIFIED') AS application_type,
    ma.ma_status_code,
    COALESCE(ma.ma_status_display_name, ma.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(ma.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(ma.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(ma.is_sra, false) AS is_sra,

    /*
      Uses the same processing_time_in_day field name used by
      the rest of your original script.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM license.vwma ma
  LEFT JOIN unified_processing_time upt
    ON upt.id = ma.id
  WHERE ma.submoduletype_code = 'MDCN'
    AND ma.module_code = 'NMR'
    AND ma.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND ma.ma_number::text !~~ '%LD%'
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS') THEN 'Reliance pathway'
      WHEN approval_pathway_norm ILIKE '%reliance%'
        OR approval_pathway_code_norm ILIKE '%REL%'
        OR approval_pathway_code_norm ILIKE '%CRP%'
        OR approval_pathway_norm ILIKE '%WHO Pre Qualified%'
      THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    /*
      This now uses processing_time_in_day calculated from
      vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= 270 THEN '181-270 days'
      ELSE 'Over 270 days'
    END AS processing_band,

    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN 'SRA''s'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
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
part_1 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      vwma_unified_processing_time.
    */
    upt.processing_time_in_day AS current_processing_time_in_day,

    270 AS target_days

  FROM license.vwma v

  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id

  WHERE v.submoduletype_code = 'MDCN'
    AND v.module_code = 'REN'
    AND v.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
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
    prev_m.id AS ma_id,
    prev_m.original_ma_id,
    mc.depth + 1 AS depth
  FROM ma_chain mc
  JOIN license.ma prev_m
    ON prev_m.id = mc.original_ma_id
),

root_ma AS (
  SELECT DISTINCT ON (current_id)
    current_id,
    ma_id AS root_id
  FROM ma_chain
  WHERE original_ma_id IS NULL
  ORDER BY current_id, depth DESC
),

root_details AS (
  SELECT
    rm.current_id,
    rv.id AS root_id,
    rv.module_code AS root_module_code,
    COALESCE(rv.application_type, 'UNSPECIFIED') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, 'UNSPECIFIED')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, 'UNSPECIFIED')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_ma rm
  LEFT JOIN license.vwma rv
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

    /*
      This is the updated value used for:
      - On-time count
      - Percentage
      - Average processing days
      - Processing time band
    */
    bc.current_processing_time_in_day AS processing_time_in_day,

    rd.root_id,
    rd.root_module_code,
    rd.root_application_type,
    rd.root_approval_pathway_norm,
    rd.root_approval_pathway_code_norm,
    rd.root_is_sra,

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
      WHEN bc.current_processing_time_in_day IS NULL THEN 'No processing time'
      WHEN bc.current_processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN bc.current_processing_time_in_day <= 30 THEN '0-30 days'
      WHEN bc.current_processing_time_in_day <= 90 THEN '31-90 days'
      WHEN bc.current_processing_time_in_day <= 180 THEN '91-180 days'
      WHEN bc.current_processing_time_in_day <= 270 THEN '181-270 days'
      ELSE '270+ days'
    END AS processing_band,

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
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''))) = 'archived'
        OR bc.current_ma_status_code = 'ARCH'
      THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'EUA'
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id

  WHERE rd.root_module_code = 'NMR'
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
      Updated regulatory processing time used for:
      - Processing bands
      - On-time count
      - Percentage
      - Average processing days
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
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
  LEFT JOIN license.vwma rv
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
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.ma_type_code = 'VMAJ'
    AND v.submoduletype_code = 'MDCN'
    AND v.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
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
  JOIN license.vwma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = 'NMR'
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
  JOIN license.vwma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated value drives:
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
SELECT module_code, 'MDCN'::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code;