/* MA face/drilldown alignment v1 */
WITH records AS (
WITH unified_processing_time AS (
  /*
    Creates one regulatory processing-time value per MA from
    vwma_unified_processing_time.

    Included:
    - Screener assignment
    - Screening
    - Assessor assignment
    - Assessment
    - Team Leader decision
    - LEO final decision

    Excluded:
    - Applicant response during screening
    - Applicant response to FIR
  */
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
    ma.id,
    ma.module_code,
    ma.submoduletype_code,
    ma.ma_type_code,
    COALESCE(ma.application_type, 'UNSPECIFIED') AS application_type,
    ma.ma_status_code,
    COALESCE(ma.ma_status_display_name, ma.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(ma.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(ma.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(ma.is_sra, false) AS is_sra,

    /*
      Uses the same processing_time_in_day field name used by
      the rest of your original script.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM license.vwma ma
  LEFT JOIN unified_processing_time upt
    ON upt.id = ma.id
  WHERE ma.submoduletype_code = 'MDCN'
    AND ma.module_code = 'NMR'
    AND ma.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND ma.ma_number::text !~~ '%LD%'
    @dateFilter
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

    /*
      This now uses processing_time_in_day calculated from
      vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= 270 THEN '181-270 days'
      ELSE 'Over 270 days'
    END AS processing_band,

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
      WHEN ma_status_code = 'APR' THEN 'Approved'
      WHEN ma_status_code = 'ARCH' THEN 'Archived'
      WHEN ma_status_code = 'REJ' THEN 'Rejected'
      WHEN ma_status_code = 'SUSP' THEN 'Suspended'
      WHEN ma_status_code = 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = 'Reliance pathway' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES ('Application type'::text, COALESCE(c.application_type_clean, 'Unspecified')::text),
      ('Internal regulatory pathway', CASE WHEN c.pathway_group = 'Internal regulatory pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Reliance pathway', CASE WHEN c.pathway_group = 'Reliance pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Regulatory outcome', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, 'Unspecified')),
      ('MA type', COALESCE(c.ma_type_clean, c.ma_type_code, 'Unspecified')),
      ('Processing time band', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;