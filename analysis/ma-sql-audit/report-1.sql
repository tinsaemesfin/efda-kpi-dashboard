SELECT
  module_code,
  submoduletype_code,
  CASE module_code
    WHEN 'NMR' THEN 270
    WHEN 'REN' THEN 90
    WHEN 'VAR' THEN 60
  END AS target_days,
  COUNT(*) FILTER (
    WHERE processing_time_in_day <= CASE module_code
      WHEN 'NMR' THEN 270
      WHEN 'REN' THEN 90
      WHEN 'VAR' THEN 60
    END
  ) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND(
    (COUNT(*) FILTER (
      WHERE processing_time_in_day <= CASE module_code
        WHEN 'NMR' THEN 270
        WHEN 'REN' THEN 90
        WHEN 'VAR' THEN 60
      END
    ) * 100.0 / NULLIF(COUNT(*), 0))::numeric
  , 2) AS percentage
FROM license.vwma
WHERE ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
  AND module_code IN ('NMR','REN','VAR')
GROUP BY module_code, submoduletype_code
order by submoduletype_code