WITH base AS (
  SELECT
    id,
    module_code,
    submoduletype_code,
    ma_type_code,
    ma_status_code,
    ma_status_display_name,
    approval_pathway,         -- direct from vwma
    approval_pathway_code,    -- direct from vwma
    processing_time_in_day,
    CASE module_code
      WHEN 'NMR' THEN 270
      WHEN 'REN' THEN 90
      WHEN 'VAR' THEN 60
    END AS target_days
  FROM license.vwma
  WHERE submoduletype_code = 'MD'
    AND ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND module_code IN ('NMR','REN','VAR')
),

summary AS (
  SELECT
    'Medical Device Overall'::text AS category_name,
    'ALL'::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count
  FROM base
  GROUP BY module_code, target_days
),

application_type_tab AS (
  SELECT
    'Application type'::text AS category_name,
    module_code::text AS category_value, -- NMR / REN / VAR
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count
  FROM base
  GROUP BY module_code, target_days
),

internal_pathway_tab AS (
  SELECT
    'Internal regulatory pathway'::text AS category_name,
    approval_pathway::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count
  FROM base
  WHERE approval_pathway IS NOT NULL
    AND approval_pathway <> ''
    AND approval_pathway NOT ILIKE '%reliance%'
    AND COALESCE(approval_pathway_code, '') NOT ILIKE '%REL%'
  GROUP BY approval_pathway, module_code, target_days
),

reliance_pathway_tab AS (
  SELECT
    'Reliance pathway'::text AS category_name,
    approval_pathway::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count
  FROM base
  WHERE approval_pathway IS NOT NULL
    AND approval_pathway <> ''
    AND (
      approval_pathway ILIKE '%reliance%'
      OR COALESCE(approval_pathway_code, '') ILIKE '%REL%'
    )
  GROUP BY approval_pathway, module_code, target_days
),

regulatory_outcome_tab AS (
  SELECT
    'Regulatory outcome'::text AS category_name,
    COALESCE(ma_status_display_name, ma_status_code)::text AS category_value,
    module_code,
    target_days,
    COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
    COUNT(*) AS total_count
  FROM base
  GROUP BY COALESCE(ma_status_display_name, ma_status_code), module_code, target_days
)

SELECT
  category_name,
  category_value,
  module_code,
  target_days,
  on_time_count,
  total_count,
  ROUND((on_time_count * 100.0 / NULLIF(total_count, 0))::numeric, 2) AS percentage
FROM (
  SELECT * FROM summary
  UNION ALL
  SELECT * FROM application_type_tab
  UNION ALL
  SELECT * FROM internal_pathway_tab
  UNION ALL
  SELECT * FROM reliance_pathway_tab
  UNION ALL
  SELECT * FROM regulatory_outcome_tab
) x
ORDER BY category_name, category_value, module_code;