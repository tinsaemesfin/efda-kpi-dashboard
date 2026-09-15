
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
  WHERE 
    v.submoduletype_code = 'FD'
    AND COALESCE(v.ma_type_code, '') <> 'FNT'
    AND COALESCE(v.is_food_notification, false) = false
    AND v.module_code = 'NMR'
    AND v.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS')
        OR approval_pathway_norm ILIKE '%reliance%'
        OR approval_pathway_code_norm ILIKE '%REL%'
        OR approval_pathway_code_norm ILIKE '%CRP%'
        OR approval_pathway_norm ILIKE '%WHO Pre Qualified%'
      THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,
    CASE WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN 'APR' THEN 'Approved'
      WHEN 'REJ' THEN 'Rejected'
      WHEN 'SUSP' THEN 'Suspended'
      WHEN 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN 'Invalid negative time'
      WHEN decision_time_in_days <= 30 THEN '0-30 days'
      WHEN decision_time_in_days <= 90 THEN '31-90 days'
      WHEN decision_time_in_days <= 180 THEN '91-180 days'
      WHEN decision_time_in_days <= 270 THEN '181-270 days'
      WHEN decision_time_in_days <= 540 THEN '271-540 days'
      ELSE 'Over 540 days'
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS overall_median_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = 'Reliance pathway' THEN 90 ELSE c.target_days END AS target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      ('Application type'::text, c.application_type_clean::text),
      ('Internal regulatory pathway'::text, CASE WHEN c.pathway_group = 'Internal regulatory pathway' THEN c.approval_pathway_clean::text END),
      ('Reliance pathway'::text, CASE WHEN c.pathway_group = 'Reliance pathway' THEN c.approval_pathway_clean::text END),
      ('Regulatory outcome'::text, c.regulatory_outcome_clean::text),
      ('MA type'::text, c.ma_type_clean::text),
      ('Decision time band'::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  'NMR'::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value;
