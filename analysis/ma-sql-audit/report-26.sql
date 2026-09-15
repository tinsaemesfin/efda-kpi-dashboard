
WITH decision_time_per_ma AS (
  SELECT
    ma_number,
    COALESCE(teamleader_decision_time_days, 0)
      + COALESCE(leo_final_decision_time_days, 0) AS decision_time_in_days
  FROM license.vwma_unified_processing_time
),

base AS (
  SELECT
    ma.ma_number,
    dt.decision_time_in_days
  FROM license.vwma ma
  JOIN decision_time_per_ma dt
    ON dt.ma_number = ma.ma_number
  WHERE ma.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND ma.module_code = 'NMR'
    AND ma.submoduletype_code = 'MDCN'
    AND ma.ma_number::text !~~ '%LD%'
    @dateFilter
)

SELECT
  'NMR' AS module_code,
  'MDCN' AS submoduletype_code,
  270 AS target_days,
  'Median Decision Time' AS metric,
  COUNT(*) AS total_count,
  ROUND(
    PERCENTILE_CONT(0.5)
      WITHIN GROUP (ORDER BY decision_time_in_days)::numeric,
    2
  ) AS decision_time_in_days
FROM base

UNION ALL

SELECT
  'NMR' AS module_code,
  'MDCN' AS submoduletype_code,
  270 AS target_days,
  'Average Decision Time' AS metric,
  COUNT(*) AS total_count,
  ROUND(
    AVG(decision_time_in_days)::numeric,
    2
  ) AS decision_time_in_days
FROM base;

