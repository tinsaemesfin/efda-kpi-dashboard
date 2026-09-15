WITH base AS (
  SELECT
    module_code,
    CASE
      WHEN submoduletype_code = 'FD' AND ma_type_code = 'FNT' THEN 'FNT'
      WHEN submoduletype_code = 'FD' AND ma_type_code <> 'FNT' THEN 'FD'
      ELSE submoduletype_code
    END AS submoduletype_code_grouped,
    processing_time_in_day,
    CASE module_code
      WHEN 'NMR' THEN 270
      WHEN 'REN' THEN 90
      WHEN 'VAR' THEN 60
    END AS target_days
  FROM license.vwma
  WHERE ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND module_code IN ('NMR','REN','VAR')
)
SELECT
  module_code,
  submoduletype_code_grouped AS submoduletype_code,
  target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND(
    (COUNT(*) FILTER (WHERE processing_time_in_day <= target_days) * 100.0 
     / NULLIF(COUNT(*), 0))::numeric
  , 2) AS percentage
FROM base
GROUP BY module_code, submoduletype_code_grouped, target_days
ORDER BY submoduletype_code_grouped;