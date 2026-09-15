
WITH base AS (
  SELECT
    CASE
      WHEN module_code = 'VAR' THEN ma_type_code
      ELSE module_code
    END AS module_code,
    submoduletype_code,
    processing_time_in_day,
    CASE
      WHEN module_code = 'NMR' THEN 270
      WHEN module_code = 'REN' THEN 90
      WHEN module_code = 'VAR' THEN 60
    END AS target_days,

    /* Reliance SLA: 90 days */
    CASE
      WHEN module_code = 'NMR' AND (
        COALESCE(is_sra, false) = true
        OR UPPER(TRIM(COALESCE(approval_pathway, ''))) IN ('SRA', 'SRA''S', 'SRAS')
        OR COALESCE(approval_pathway, '') ILIKE '%reliance%'
        OR COALESCE(approval_pathway_code, '') ILIKE '%REL%'
        OR COALESCE(approval_pathway_code, '') ILIKE '%CRP%'
        OR COALESCE(approval_pathway, '') ILIKE '%WHO Pre Qualified%'
      ) THEN 90
      WHEN module_code = 'NMR' THEN 270
      WHEN module_code = 'REN' THEN 90
      WHEN module_code = 'VAR' THEN 60
    END AS effective_target_days
  FROM license.vwma
  WHERE ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND module_code IN ('NMR', 'REN', 'VAR')
    AND submoduletype_code = 'MDCN'
    AND ma_number::text !~~ '%LD%'
    AND (
      module_code <> 'VAR'
      OR ma_type_code IN ('VMIN', 'VMAJ')
    )
    @dateFilter
)
SELECT
  module_code,
  submoduletype_code,
  target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND(
    (
      COUNT(*) FILTER (WHERE processing_time_in_day <= effective_target_days) * 100.0
      / NULLIF(COUNT(*), 0)
    )::numeric,
    2
  ) AS percentage
FROM base
GROUP BY module_code, submoduletype_code, target_days
ORDER BY module_code;

