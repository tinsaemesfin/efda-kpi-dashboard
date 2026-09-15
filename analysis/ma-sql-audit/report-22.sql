
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

base AS (
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
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = 'MD'
    AND v.module_code = 'NMR'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ '%LD%'
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

