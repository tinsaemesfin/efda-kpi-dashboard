-- this sql have before IRE for both internal regulatory pathway and releance pathway 


WITH base AS (
  SELECT
    id,
    module_code,
    submoduletype_code,
    ma_type_code,
    COALESCE(application_type, 'UNSPECIFIED') AS application_type,
    ma_status_code,
    COALESCE(ma_status_display_name, ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(is_sra, false) AS is_sra,
    processing_time_in_day,
    270 AS target_days
  FROM license.vwma
  WHERE submoduletype_code = 'MDCN'
    AND module_code = 'NMR'
    AND ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
),

classified AS (
  SELECT
    *,
    CASE
      -- Move WHO Pre Qualified into Reliance pathway
      WHEN approval_pathway_norm ILIKE '%reliance%'
        OR approval_pathway_code_norm ILIKE '%REL%'
        OR approval_pathway_code_norm ILIKE '%CRP%'
        OR approval_pathway_norm ILIKE '%WHO Pre Qualified%'
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
    END AS processing_band,

    CASE
      -- Remove EUA item from Application type tab
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      -- Rename UNSPECIFIED in Internal regulatory pathway to Before IRP
      -- Also move EUA item into Internal regulatory pathway bucket
      WHEN application_type = 'New Application - Emergency Use Authorization'
        THEN 'New Application - Emergency Use Authorization'
      WHEN approval_pathway_norm = 'UNSPECIFIED'
        THEN 'Before IRP'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      -- Remove archived from Regulatory outcome tab
      WHEN LOWER(TRIM(COALESCE(regulatory_outcome, ''))) = 'archived'
        OR ma_status_code = 'ARCH'
      THEN NULL
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      -- Remove EUA from MA type tab
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
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
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
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM classified
  WHERE pathway_group = 'Internal regulatory pathway'
  GROUP BY approval_pathway_clean, module_code, target_days
),

reliance_pathway_tab AS (
  SELECT
    'Reliance pathway'::text AS category_name,
    approval_pathway_clean::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM classified
  WHERE pathway_group = 'Reliance pathway'
  GROUP BY approval_pathway_clean, module_code, target_days
),

regulatory_outcome_tab AS (
  SELECT
    'Regulatory outcome'::text AS category_name,
    regulatory_outcome_clean::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
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
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
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
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
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