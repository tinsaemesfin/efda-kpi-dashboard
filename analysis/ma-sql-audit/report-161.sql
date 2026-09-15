
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

application_type_tab AS (
  SELECT
    'Application type'::text AS category_name,
    application_type_clean::text AS category_value,
    module_code,
    target_days,

    COUNT(*) FILTER (
      WHERE processing_time_in_day <= target_days
        AND processing_time_in_day >= 0
    ) AS on_time_count,

    COUNT(*) AS total_count,

    ROUND(
      AVG(processing_time_in_day) FILTER (
        WHERE processing_time_in_day IS NOT NULL
          AND processing_time_in_day >= 0
      )::numeric,
      2
    ) AS avg_processing_days

  FROM classified
  WHERE application_type_clean IS NOT NULL
  GROUP BY application_type_clean, module_code, target_days
),

internal_pathway_tab AS (
  SELECT
    'Internal regulatory pathway'::text AS category_name,
    approval_pathway_clean::text AS category_value,
    module_code,
    target_days,

    COUNT(*) FILTER (
      WHERE processing_time_in_day <= target_days
        AND processing_time_in_day >= 0
    ) AS on_time_count,

    COUNT(*) AS total_count,

    ROUND(
      AVG(processing_time_in_day) FILTER (
        WHERE processing_time_in_day IS NOT NULL
          AND processing_time_in_day >= 0
      )::numeric,
      2
    ) AS avg_processing_days

  FROM classified
  WHERE pathway_group = 'Internal regulatory pathway'
    AND approval_pathway_clean IS NOT NULL
    AND UPPER(TRIM(approval_pathway_clean)) NOT IN ('SRA', 'SRA''S', 'SRAS')
  GROUP BY approval_pathway_clean, module_code, target_days
),

reliance_pathway_tab AS (
  SELECT
    'Reliance pathway'::text AS category_name,
    approval_pathway_clean::text AS category_value,
    module_code,
    /* Reliance SLA: 90 days */
    90::int AS target_days,

    COUNT(*) FILTER (
      WHERE processing_time_in_day <= 90
        AND processing_time_in_day >= 0
    ) AS on_time_count,

    COUNT(*) AS total_count,

    ROUND(
      AVG(processing_time_in_day) FILTER (
        WHERE processing_time_in_day IS NOT NULL
          AND processing_time_in_day >= 0
      )::numeric,
      2
    ) AS avg_processing_days

  FROM classified
  WHERE pathway_group = 'Reliance pathway'
    AND approval_pathway_clean IS NOT NULL
  GROUP BY approval_pathway_clean, module_code, target_days
),

regulatory_outcome_tab AS (
  SELECT
    'Regulatory outcome'::text AS category_name,
    regulatory_outcome_clean::text AS category_value,
    module_code,
    target_days,

    COUNT(*) FILTER (
      WHERE processing_time_in_day <= target_days
        AND processing_time_in_day >= 0
    ) AS on_time_count,

    COUNT(*) AS total_count,

    ROUND(
      AVG(processing_time_in_day) FILTER (
        WHERE processing_time_in_day IS NOT NULL
          AND processing_time_in_day >= 0
      )::numeric,
      2
    ) AS avg_processing_days

  FROM classified
  WHERE regulatory_outcome_clean IS NOT NULL
  GROUP BY regulatory_outcome_clean, module_code, target_days
),

ma_type_tab AS (
  SELECT
    'MA type'::text AS category_name,
    ma_type_clean::text AS category_value,
    module_code,
    target_days,

    COUNT(*) FILTER (
      WHERE processing_time_in_day <= target_days
        AND processing_time_in_day >= 0
    ) AS on_time_count,

    COUNT(*) AS total_count,

    ROUND(
      AVG(processing_time_in_day) FILTER (
        WHERE processing_time_in_day IS NOT NULL
          AND processing_time_in_day >= 0
      )::numeric,
      2
    ) AS avg_processing_days

  FROM classified
  WHERE ma_type_clean IS NOT NULL
  GROUP BY ma_type_clean, module_code, target_days
),

processing_band_tab AS (
  SELECT
    'Processing time band'::text AS category_name,
    processing_band::text AS category_value,
    module_code,
    target_days,

    COUNT(*) FILTER (
      WHERE processing_time_in_day <= target_days
        AND processing_time_in_day >= 0
    ) AS on_time_count,

    COUNT(*) AS total_count,

    ROUND(
      AVG(processing_time_in_day) FILTER (
        WHERE processing_time_in_day IS NOT NULL
          AND processing_time_in_day >= 0
      )::numeric,
      2
    ) AS avg_processing_days

  FROM classified
  GROUP BY processing_band, module_code, target_days
)

SELECT
  category_name,
  category_value,
  module_code,
  target_days,
  on_time_count,
  total_count,

  ROUND(
    (
      on_time_count * 100.0
      / NULLIF(total_count, 0)
    )::numeric,
    2
  ) AS percentage,

  avg_processing_days

FROM (
  SELECT * FROM application_type_tab
  UNION ALL
  SELECT * FROM internal_pathway_tab
  UNION ALL
  SELECT * FROM reliance_pathway_tab
  UNION ALL
  SELECT * FROM regulatory_outcome_tab
  UNION ALL
  SELECT * FROM ma_type_tab
  UNION ALL
  SELECT * FROM processing_band_tab
) q

ORDER BY
  category_name,
  category_value,
  module_code;

