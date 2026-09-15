
WITH 
decision_time_per_ma AS (
  SELECT
    id,
    MAX(
        COALESCE(screener_assignment_time_days, 0)
      + COALESCE(screening_time_days, 0)
      + COALESCE(assessor_assignment_time_days, 0)
      + COALESCE(assessment_time_days, 0)
      + COALESCE(teamleader_decision_time_days, 0)
      + COALESCE(leo_final_decision_time_days, 0)
    ) AS decision_time_in_days
  FROM license.vwma_unified_processing_time
  GROUP BY id
),
base AS (
  SELECT
    v.id,
    v.ma_number,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = 'MDCN'
    AND v.module_code = 'NMR'
    AND v.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    @dateFilter
)
SELECT
  'NMR'::text AS module_code,
  'MDCN'::text AS submoduletype_code,
  270::int AS target_days,
  'Median Completion Time'::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  'NMR'::text,
  'MDCN'::text,
  270::int,
  'Average Completion Time'::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0;
