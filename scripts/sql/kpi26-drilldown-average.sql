/*
  MA-MDCN-KPI6 Drill-Down: AVERAGE Decision Time
  ------------------------------------------------
  Companion drill-down for kpi.kpi id = 26 ("MA-MDCN-Front-KPI6-7 mean-median").

  Decision time = teamleader_decision_time_days + leo_final_decision_time_days
  (from license.vwma_unified_processing_time), for NMR / MDCN applications
  with a final decision (APR, REJ, SUSP, CNCL), excluding legacy '%LD%' numbers.

  The AVERAGE is highly sensitive to outliers, so this drill-down explains
  WHERE the average comes from: per category it reports the average, the
  gap vs the overall average, the max (worst case), and how many outlier
  cases (> 2x target) are dragging the mean up.

  Output shape follows the standard drill-down contract
  (category_name, category_value, module_code, target_days,
   on_time_count, total_count, percentage, avg_decision_days)
  plus analysis columns appended at the end.
*/

WITH decision_time_per_ma AS (
  SELECT
    ma_number,
    MAX(
        COALESCE(teamleader_decision_time_days, 0)
      + COALESCE(leo_final_decision_time_days, 0)
    ) AS decision_time_in_days
  FROM license.vwma_unified_processing_time
  GROUP BY ma_number
),

base AS (
  SELECT
    ma.id,
    ma.ma_number,
    ma.module_code,
    ma.submoduletype_code,
    ma.ma_type_code,
    ma.ma_status_code,
    COALESCE(ma.ma_status_display_name, ma.ma_status_code) AS regulatory_outcome,
    COALESCE(ma.application_type, 'UNSPECIFIED')           AS application_type,
    TRIM(COALESCE(ma.approval_pathway, 'UNSPECIFIED'))     AS approval_pathway_norm,
    TRIM(COALESCE(ma.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(ma.is_sra, false)                             AS is_sra,
    dt.decision_time_in_days,
    270 AS target_days
  FROM license.vwma ma
  JOIN decision_time_per_ma dt
    ON dt.ma_number = ma.ma_number
  WHERE ma.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND ma.module_code = 'NMR'
    AND ma.submoduletype_code = 'MDCN'
    AND ma.ma_number::text !~~ '%LD%'
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS') THEN 'Reliance pathway'
      WHEN approval_pathway_norm ILIKE '%reliance%'
        OR approval_pathway_code_norm ILIKE '%REL%'
        OR approval_pathway_code_norm ILIKE '%CRP%'
        OR approval_pathway_norm ILIKE '%WHO Pre Qualified%'
      THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN 'SRA''s'
      WHEN UPPER(TRIM(approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = 'APR'  THEN 'Approved'
      WHEN ma_status_code = 'REJ'  THEN 'Rejected'
      WHEN ma_status_code = 'SUSP' THEN 'Suspended'
      WHEN ma_status_code = 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN decision_time_in_days IS NULL THEN 'No decision time'
      WHEN decision_time_in_days < 0    THEN 'Invalid negative time'
      WHEN decision_time_in_days <= 30  THEN '0-30 days'
      WHEN decision_time_in_days <= 90  THEN '31-90 days'
      WHEN decision_time_in_days <= 180 THEN '91-180 days'
      WHEN decision_time_in_days <= 270 THEN '181-270 days'
      WHEN decision_time_in_days <= 540 THEN '271-540 days'
      ELSE 'Over 540 days'
    END AS decision_band
  FROM base
),

overall AS (
  SELECT
    ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),

categorized AS (
  SELECT
    c.module_code,
    c.target_days,
    c.decision_time_in_days,
    x.category_name,
    x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      ('Application type'::text,             c.application_type_clean::text),
      ('Internal regulatory pathway'::text,
        CASE WHEN c.pathway_group = 'Internal regulatory pathway'
             THEN c.approval_pathway_clean::text END),
      ('Reliance pathway'::text,
        CASE WHEN c.pathway_group = 'Reliance pathway'
             THEN c.approval_pathway_clean::text END),
      ('Regulatory outcome'::text,           c.regulatory_outcome_clean::text),
      ('MA type'::text,                      c.ma_type_clean::text),
      ('Decision time band'::text,           c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL
)

SELECT
  cat.category_name,
  cat.category_value,
  cat.module_code,
  cat.target_days,

  COUNT(*) FILTER (
    WHERE cat.decision_time_in_days <= cat.target_days
      AND cat.decision_time_in_days >= 0
  ) AS on_time_count,

  COUNT(*) AS total_count,

  ROUND(
    (
      COUNT(*) FILTER (
        WHERE cat.decision_time_in_days <= cat.target_days
          AND cat.decision_time_in_days >= 0
      ) * 100.0
      / NULLIF(COUNT(*), 0)
    )::numeric,
    2
  ) AS percentage,

  ROUND(
    AVG(cat.decision_time_in_days) FILTER (
      WHERE cat.decision_time_in_days >= 0
    )::numeric,
    2
  ) AS avg_decision_days,

  /* ---- average-specific analysis columns ---- */

  o.overall_avg_days,

  ROUND(
    (
      AVG(cat.decision_time_in_days) FILTER (WHERE cat.decision_time_in_days >= 0)
      - o.overall_avg_days
    )::numeric,
    2
  ) AS gap_vs_overall_avg_days,

  ROUND(
    MAX(cat.decision_time_in_days) FILTER (
      WHERE cat.decision_time_in_days >= 0
    )::numeric,
    2
  ) AS max_decision_days,

  COUNT(*) FILTER (
    WHERE cat.decision_time_in_days > cat.target_days * 2
  ) AS extreme_outlier_count,

  ROUND(
    (
      COUNT(*) FILTER (WHERE cat.decision_time_in_days > cat.target_days * 2) * 100.0
      / NULLIF(COUNT(*), 0)
    )::numeric,
    2
  ) AS extreme_outlier_pct

FROM categorized cat
CROSS JOIN overall o
GROUP BY
  cat.category_name,
  cat.category_value,
  cat.module_code,
  cat.target_days,
  o.overall_avg_days

ORDER BY
  cat.category_name,
  cat.category_value,
  cat.module_code;
