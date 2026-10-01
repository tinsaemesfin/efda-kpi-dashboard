-- =============================================================================
-- MA KPI: FIR Responses Moved to Team Leader (FIRR -> STL) Within Target
--
-- Percentage of MA applications whose FIR response (FIRR) was moved to
-- Submitted to Team Leader (STL) within the admin-configured number of days.
--
-- Target days: settings.system_setting code KPI_MA_FIRR_TO_STL_TARGET_DAYS
--   (editable by admins in System Settings; KPI falls back to 30 if missing).
--
-- Measurement:
--   * A cycle starts when the application enters FIRR and ends when the very
--     next status change is FIRR -> STL. Duration is in calendar days.
--   * Cycles still waiting in FIRR, or that left FIRR for another status,
--     are excluded.
--   * Per application: on time only if every completed cycle is within target.
--   * Date filter (@dateFilter) applies to the application created_date.
--
-- Performance: the log is read from license.ma_log_status (not the
-- vwma_log_status view) and only for applications that ever entered FIRR.
-- license.vwma is crosstab-heavy, so it is read once, MATERIALIZED, for just
-- those applications; without that the planner re-evaluates it per row.
-- If the log scan is still slow, these indexes help (check they don't exist):
--   CREATE INDEX IF NOT EXISTS ix_ma_log_status_to_status_id
--     ON license.ma_log_status (to_status_id);
--   CREATE INDEX IF NOT EXISTS ix_ma_log_status_ma_id_modified_date
--     ON license.ma_log_status (ma_id, modified_date, id);
--
-- Idempotent: the setting is inserted only if missing (admin edits survive a
-- re-run); the KPI row is replaced by name.
-- Requires INSERT privilege on settings.system_setting and kpi.kpi.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. System setting (admin-editable target days)
-- -----------------------------------------------------------------------------
INSERT INTO settings.system_setting (
  id,
  name,
  value,
  description,
  system_setting_code,
  data_type,
  is_active,
  created_date,
  modified_date,
  rowguid
)
SELECT
  COALESCE((SELECT MAX(id) FROM settings.system_setting), 0) + 1,
  'KPI - MA FIR Response to Team Leader Target (Days)',
  '30',
  'Maximum calendar days from FIR response received (FIRR) to Submitted to Team Leader (STL) for an MA application to count as on time in the FIRR to STL KPI.',
  'KPI_MA_FIRR_TO_STL_TARGET_DAYS',
  'Integer',
  true,
  NOW(),
  NOW(),
  gen_random_uuid()
WHERE NOT EXISTS (
  SELECT 1 FROM settings.system_setting
  WHERE system_setting_code = 'KPI_MA_FIRR_TO_STL_TARGET_DAYS'
);

DO $$
DECLARE
  seq text;
BEGIN
  seq := pg_get_serial_sequence('settings.system_setting', 'id');
  IF seq IS NOT NULL THEN
    PERFORM setval(seq, GREATEST((SELECT MAX(id) FROM settings.system_setting), 1));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. KPI row
-- -----------------------------------------------------------------------------
DELETE FROM kpi.kpi WHERE name = 'KPIMA-FIRR-STL';

INSERT INTO kpi.kpi (
  id,
  title,
  created_date,
  description,
  query,
  series_columns,
  filter_columns,
  report_type_id,
  priority,
  is_active,
  modified_date,
  name,
  rowguid,
  width,
  max_rows,
  is_mobile,
  column_definitions,
  report_group_id,
  kpi_group
)
SELECT
  (SELECT MAX(id) FROM kpi.kpi) + 1,
  'MA FIR Responses Moved to Team Leader Within Target',
  NOW(),
  'Percentage of MA applications whose FIR response (FIRR) was moved to Submitted to Team Leader (STL) within the target days set in system setting KPI_MA_FIRR_TO_STL_TARGET_DAYS.',
  $q$
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
$q$,
  src.series_columns,
  '[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Date","Alias":"v","OverridingFieldName":"created_date","ParameterName":"dateFilter","Type":"DateRange"}]',
  src.report_type_id,
  src.priority,
  true,
  NOW(),
  'KPIMA-FIRR-STL',
  gen_random_uuid(),
  src.width,
  src.max_rows,
  src.is_mobile,
  '[]',
  src.report_group_id,
  src.kpi_group
FROM kpi.kpi src
WHERE src.id = 8;

DO $$
DECLARE
  seq text;
BEGIN
  seq := pg_get_serial_sequence('kpi.kpi', 'id');
  IF seq IS NOT NULL THEN
    PERFORM setval(seq, (SELECT MAX(id) FROM kpi.kpi));
  END IF;
END $$;

-- Confirm
SELECT id, name, value, data_type
FROM settings.system_setting
WHERE system_setting_code = 'KPI_MA_FIRR_TO_STL_TARGET_DAYS';

SELECT id, name, title, kpi_group, report_type_id, is_active,
       (query ILIKE '%@dateFilter%') AS has_placeholder
FROM kpi.kpi
WHERE name = 'KPIMA-FIRR-STL';

COMMIT;
