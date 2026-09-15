WITH base AS (
  SELECT
    id,
    module_code,
    submoduletype_code,
    ma_type_code,
    ma_status_code,
    COALESCE(ma_status_display_name, ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(is_food_notification, false) AS is_food_notification,
    processing_time_in_day,
    270 AS target_days
  FROM license.vwma
  WHERE submoduletype_code = 'FD'
    AND module_code = 'NMR'
    AND ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND (
      ma_type_code = 'FNT'
      OR COALESCE(is_food_notification, false) = true
    )
),

classified AS (
  SELECT
    *,
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

approval_pathway_tab AS (
  SELECT
    'Approval pathway'::text AS category_name,
    approval_pathway_norm::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count,
    ROUND(AVG(processing_time_in_day)::numeric, 2) AS avg_processing_days
  FROM classified
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
  FROM classified
  GROUP BY regulatory_outcome, module_code, target_days
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
  SELECT * FROM approval_pathway_tab
  UNION ALL
  SELECT * FROM regulatory_outcome_tab
  UNION ALL
  SELECT * FROM processing_band_tab
) q
ORDER BY category_name, category_value, module_code;