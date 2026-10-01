
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN ('APR','REJ','SUSP','CNCL')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code='APR') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN ('SUSP','CNCL')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN ('APR','REJ') AND COALESCE(from_status_code,'') NOT IN ('SUSP','APR','REJ')
 UNION ALL SELECT ma_id,first_susp_cncl,'APR' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
), target AS (
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
  FROM license.vwma v JOIN effective_decision ed ON ed.ma_id=v.id
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
