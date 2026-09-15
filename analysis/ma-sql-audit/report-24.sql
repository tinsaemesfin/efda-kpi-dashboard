
WITH RECURSIVE unified_processing_time AS (
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

base_current AS (
  SELECT
    v.id AS current_id,
    'VMIN'::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = 'MD'
    AND v.module_code = 'VAR'
    AND v.ma_type_code = 'MDVMIN'
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')

    /* Exclude current legacy records */
    AND v.ma_number::text !~~ '%LD%'
    @dateFilter
),

ma_chain AS (
  SELECT
    bc.current_id,
    m.id AS ma_id,
    m.original_ma_id,
    0 AS depth
  FROM base_current bc
  JOIN license.ma m
    ON m.id = bc.current_id

  UNION ALL

  SELECT
    mc.current_id,
    pm.id AS ma_id,
    pm.original_ma_id,
    mc.depth + 1 AS depth
  FROM ma_chain mc
  JOIN license.ma pm
    ON pm.id = mc.original_ma_id
  WHERE mc.depth < 20
),

root_ma AS (
  SELECT DISTINCT ON (current_id)
    current_id,
    ma_id AS root_id
  FROM ma_chain
  WHERE original_ma_id IS NULL
  ORDER BY current_id, depth DESC
),

root_nmr AS (
  SELECT
    rm.current_id,
    rm.root_id
  FROM root_ma rm
  JOIN license.vwma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = 'NMR'

   /* Exclude root legacy records */
   AND root_v.ma_number::text !~~ '%LD%'
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, 'UNSPECIFIED') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, 'UNSPECIFIED')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, 'UNSPECIFIED')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN license.vwma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.submoduletype_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated processing time drives:
      - Processing time band
      - On-time count
      - Percentage
      - Average processing days
    */
    bc.processing_time_in_day,

    CASE
      WHEN rd.root_application_type = 'New Application - Emergency Use Authorization'
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN 'SRA''s'
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'SRA''s'
      WHEN rd.root_approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN 'Reliance pathway'
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN ('SRA', 'SRA''S', 'SRAS')
        THEN 'Reliance pathway'
      WHEN rd.root_approval_pathway_norm ILIKE '%reliance%'
        OR rd.root_approval_pathway_code_norm ILIKE '%REL%'
        OR rd.root_approval_pathway_code_norm ILIKE '%CRP%'
        OR rd.root_approval_pathway_norm ILIKE '%WHO Pre Qualified%'
        THEN 'Reliance pathway'
      ELSE 'Internal regulatory pathway'
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = 'APR' THEN 'Approved'
      WHEN bc.current_ma_status_code = 'ARCH' THEN 'Archived'
      WHEN bc.current_ma_status_code = 'REJ' THEN 'Rejected'
      WHEN bc.current_ma_status_code = 'SUSP' THEN 'Suspended'
      WHEN bc.current_ma_status_code = 'CNCL' THEN 'Cancelled'
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'MDVMIN'
        THEN 'VMIN'
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''))) = 'EUA'
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN 'No processing time'
      WHEN bc.processing_time_in_day < 0 THEN 'Invalid processing time'
      WHEN bc.processing_time_in_day <= 30 THEN '0-30 days'
      WHEN bc.processing_time_in_day <= 60 THEN '31-60 days'
      ELSE '60+ days'
    END AS processing_band

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),

categorized AS (
  SELECT
    c.module_code,
    /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = 'Reliance pathway' THEN 90 ELSE c.target_days END AS target_days,
    c.processing_time_in_day,
    x.category_name,
    x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (
        'Application type'::text,
        c.application_type_clean::text
      ),
      (
        'Internal regulatory pathway'::text,
        CASE
          WHEN c.pathway_group = 'Internal regulatory pathway'
            THEN c.approval_pathway_clean::text
          ELSE NULL
        END
      ),
      (
        'Reliance pathway'::text,
        CASE
          WHEN c.pathway_group = 'Reliance pathway'
            THEN c.approval_pathway_clean::text
          ELSE NULL
        END
      ),
      (
        'Regulatory outcome'::text,
        c.regulatory_outcome_clean::text
      ),
      (
        'MA type'::text,
        c.ma_type_clean::text
      ),
      (
        'Processing time band'::text,
        c.processing_band::text
      )
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL
)

SELECT
  category_name,
  category_value,
  module_code,
  target_days,

  COUNT(*) FILTER (
    WHERE processing_time_in_day <= target_days
      AND processing_time_in_day >= 0
  ) AS on_time_count,

  COUNT(*) AS total_count,

  ROUND(
    (
      COUNT(*) FILTER (
        WHERE processing_time_in_day <= target_days
          AND processing_time_in_day >= 0
      ) * 100.0
      / NULLIF(COUNT(*), 0)
    )::numeric,
    2
  ) AS percentage,

  ROUND(
    AVG(processing_time_in_day) FILTER (
      WHERE processing_time_in_day IS NOT NULL
        AND processing_time_in_day >= 0
    )::numeric,
    2
  ) AS avg_processing_days

FROM categorized
GROUP BY
  category_name,
  category_value,
  module_code,
  target_days

ORDER BY
  category_name,
  category_value,
  module_code;

