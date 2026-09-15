WITH base AS (
  SELECT
    id,
    module_code,
    submoduletype_code,
    ma_type_code,
    ma_status_code,
    COALESCE(ma_status_display_name, ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(application_type, '')) AS application_type_raw,
    TRIM(COALESCE(approval_pathway, '')) AS approval_pathway_raw,
    TRIM(COALESCE(approval_pathway_code, '')) AS approval_pathway_code_raw,
    COALESCE(is_sra, false) AS is_sra,
    processing_time_in_day,
    270 AS target_days
  FROM license.vwma
  WHERE submoduletype_code = 'CO'
    AND module_code = 'NMR'
    AND ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
),

normalized AS (
  SELECT
    *,
    CASE
      WHEN application_type_raw <> '' THEN application_type_raw
      WHEN COALESCE(TRIM(ma_type_code), '') <> '' THEN ma_type_code
      ELSE 'UNSPECIFIED'
    END AS application_type_norm,

    CASE
      WHEN approval_pathway_raw <> '' THEN approval_pathway_raw
      WHEN is_sra THEN 'SRA'
      ELSE 'Regular'
    END AS approval_pathway_norm,

    CASE
      WHEN approval_pathway_raw ILIKE '%reliance%'
        OR approval_pathway_code_raw ILIKE '%REL%'
        OR approval_pathway_code_raw ILIKE '%CRP%'
        OR is_sra = true
      THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= 270 THEN '181-270 days'
      ELSE '270+ days'
    END AS processing_band
  FROM base
),

application_type_tab AS (
  SELECT
    'Application type'::text AS category_name,
    application_type_norm::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM normalized
  GROUP BY application_type_norm, module_code, target_days
),

internal_pathway_tab AS (
  SELECT
    'Internal regulatory pathway'::text AS category_name,
    approval_pathway_norm::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM normalized
  WHERE pathway_group = 'Internal regulatory pathway'
  GROUP BY approval_pathway_norm, module_code, target_days
),

reliance_pathway_tab AS (
  SELECT
    'Reliance pathway'::text AS category_name,
    approval_pathway_norm::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM normalized
  WHERE pathway_group = 'Reliance pathway'
  GROUP BY approval_pathway_norm, module_code, target_days
),

regulatory_outcome_tab AS (
  SELECT
    'Regulatory outcome'::text AS category_name,
    regulatory_outcome::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM normalized
  GROUP BY regulatory_outcome, module_code, target_days
),

ma_type_tab AS (
  SELECT
    'MA type'::text AS category_name,
    COALESCE(NULLIF(TRIM(ma_type_code), ''), 'UNSPECIFIED')::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM normalized
  GROUP BY COALESCE(NULLIF(TRIM(ma_type_code), ''), 'UNSPECIFIED'), module_code, target_days
),

processing_band_tab AS (
  SELECT
    'Processing time band'::text AS category_name,
    processing_band::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM normalized
  GROUP BY processing_band, module_code, target_days
)

SELECT
  category_name,
  category_value,
  module_code,
  target_days,
  on_time_count,
  total_count,
  ROUND((on_time_count * 100.0 / NULLIF(total_count, 0))::numeric, 2) AS percentage,
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
ORDER BY category_name, category_value, module_code;