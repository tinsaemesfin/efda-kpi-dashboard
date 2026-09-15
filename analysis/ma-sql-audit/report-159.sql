
WITH unified_processing_time AS (
  SELECT
    id,
    MAX(
        COALESCE(screener_assignment_time_days, 0)
      + COALESCE(screening_time_days, 0)
      + COALESCE(assessor_assignment_time_days, 0)
      + COALESCE(assessment_time_days, 0)
      + COALESCE(teamleader_decision_time_days, 0)
      + COALESCE(leo_final_decision_time_days, 0)
    ) AS processing_time_in_day
  FROM license.vwma_unified_processing_time
  GROUP BY id
),

base AS (
  SELECT
    v.module_code,
    v.submoduletype_code,

    /* Updated regulatory processing time */
    upt.processing_time_in_day,

    CASE
      WHEN v.module_code = 'NMR' THEN 270
      WHEN v.module_code = 'REN' THEN 90
      WHEN v.module_code = 'VAR' THEN 60
    END AS target_days,

    /* Reliance SLA: 90 days */
    CASE
      WHEN v.module_code = 'NMR' AND (
        COALESCE(v.is_sra, false) = true
        OR UPPER(TRIM(COALESCE(v.approval_pathway, ''))) IN ('SRA', 'SRA''S', 'SRAS')
        OR COALESCE(v.approval_pathway, '') ILIKE '%reliance%'
        OR COALESCE(v.approval_pathway_code, '') ILIKE '%REL%'
        OR COALESCE(v.approval_pathway_code, '') ILIKE '%CRP%'
        OR COALESCE(v.approval_pathway, '') ILIKE '%WHO Pre Qualified%'
      ) THEN 90
      WHEN v.module_code = 'NMR' THEN 270
      WHEN v.module_code = 'REN' THEN 90
      WHEN v.module_code = 'VAR' THEN 60
    END AS effective_target_days

  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id

  WHERE v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.submoduletype_code = 'CO'

    /* Exclude legacy data */
    AND v.ma_number::text !~~ '%LD%'
    @dateFilter
)

SELECT
  module_code,
  submoduletype_code,
  target_days,

  COUNT(*) FILTER (
    WHERE processing_time_in_day <= effective_target_days
      AND processing_time_in_day >= 0
  ) AS on_time_count,

  COUNT(*) AS total_count,

  ROUND(
    (
      COUNT(*) FILTER (
        WHERE processing_time_in_day <= effective_target_days
          AND processing_time_in_day >= 0
      ) * 100.0
      / NULLIF(COUNT(*), 0)
    )::numeric,
    2
  ) AS percentage

FROM base

GROUP BY
  module_code,
  submoduletype_code,
  target_days

ORDER BY
  CASE module_code
    WHEN 'NMR' THEN 1
    WHEN 'REN' THEN 2
    WHEN 'VAR' THEN 3
    ELSE 4
  END;

