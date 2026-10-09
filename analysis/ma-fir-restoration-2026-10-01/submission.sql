
WITH target AS (
  SELECT COALESCE(
    (
      SELECT NULLIF(TRIM(ss.value), '')::numeric
      FROM settings.system_setting ss
      WHERE ss.system_setting_code = 'KPI_MA_FIRR_TO_STL_TARGET_DAYS'
        AND ss.is_active = true
      LIMIT 1
    ),
    30
  ) AS target_days
),
status_ids AS MATERIALIZED (
  SELECT
    MAX(ms.id) FILTER (WHERE ms.ma_status_code = 'FIRR') AS firr_id,
    MAX(ms.id) FILTER (WHERE ms.ma_status_code = 'STL') AS stl_id
  FROM common.ma_status ms
  WHERE ms.ma_status_code IN ('FIRR', 'STL')
),
firr_mas AS MATERIALIZED (
  SELECT DISTINCT ls.ma_id
  FROM license.ma_log_status ls
  CROSS JOIN status_ids s
  WHERE ls.to_status_id = s.firr_id
),
ordered_log AS MATERIALIZED (
  SELECT
    ls.ma_id,
    ls.to_status_id,
    ls.modified_date,
    LEAD(ls.from_status_id) OVER w AS next_from_status_id,
    LEAD(ls.to_status_id) OVER w AS next_to_status_id,
    LEAD(ls.modified_date) OVER w AS next_modified_date
  FROM license.ma_log_status ls
  INNER JOIN firr_mas f
    ON f.ma_id = ls.ma_id
  WHERE ls.from_status_id IS NOT NULL
  WINDOW w AS (PARTITION BY ls.ma_id ORDER BY ls.modified_date, ls.id)
),
per_application AS MATERIALIZED (
  SELECT
    ol.ma_id,
    MAX(EXTRACT(EPOCH FROM (ol.next_modified_date - ol.modified_date)) / 86400)
      AS longest_firr_to_stl_days
  FROM ordered_log ol
  CROSS JOIN status_ids s
  WHERE ol.to_status_id = s.firr_id
    AND ol.next_from_status_id = s.firr_id
    AND ol.next_to_status_id = s.stl_id
  GROUP BY ol.ma_id
),
ma_info AS MATERIALIZED (
  SELECT
    v.id,
    v.module_code,
    v.submoduletype_code
  FROM license.vwma v
  WHERE v.id IN (SELECT ma_id FROM per_application)
    AND v.ma_number::text !~~ '%LD%'
    @dateFilter
),
base AS (
  SELECT
    mi.module_code,
    mi.submoduletype_code,
    pa.longest_firr_to_stl_days
  FROM per_application pa
  INNER JOIN ma_info mi
    ON mi.id = pa.ma_id
)
SELECT
  b.module_code,
  b.submoduletype_code,
  t.target_days,
  COUNT(*) FILTER (WHERE b.longest_firr_to_stl_days <= t.target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND(
    (
      COUNT(*) FILTER (WHERE b.longest_firr_to_stl_days <= t.target_days) * 100.0
      / NULLIF(COUNT(*), 0)
    )::numeric,
    2
  ) AS percentage
FROM base b
CROSS JOIN target t
GROUP BY b.module_code, b.submoduletype_code, t.target_days
ORDER BY b.module_code, b.submoduletype_code;
