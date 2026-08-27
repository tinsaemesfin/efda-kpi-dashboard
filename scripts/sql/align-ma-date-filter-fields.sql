WITH updated AS (
  UPDATE kpi.kpi
  SET
    filter_columns = jsonb_set(
      filter_columns::jsonb,
      '{0,OverridingFieldName}',
      '"decision_date"'::jsonb
    )::text,
    query = replace(
      replace(query, 'Median Decision Time', 'Median Completion Time'),
      'Average Decision Time',
      'Average Completion Time'
    ),
    modified_date = NOW()
  WHERE id BETWEEN 96 AND 120
  RETURNING id, filter_columns
)
SELECT
  COUNT(*)::int AS updated_count,
  MIN(id)::int AS min_id,
  MAX(id)::int AS max_id,
  BOOL_AND(
    filter_columns::jsonb #>> '{0,OverridingFieldName}' = 'decision_date'
  ) AS all_decision_date
FROM updated;
