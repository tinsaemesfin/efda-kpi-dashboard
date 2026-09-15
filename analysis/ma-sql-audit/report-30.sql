

WITH params AS (
  SELECT
    30::int AS target_days
),

approval_documents AS (
  SELECT
    md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt
    ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN ('PSA', 'SPC', 'LBL', 'PIL')
),

approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.decision_date AS approval_date,
    v.submoduletype_code,

    CASE
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'MDVMIN' THEN 'VMIN'
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'MDVMAJ' THEN 'VMAJ'
      ELSE v.module_code
    END AS module_code,

    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.submoduletype_code = 'MD'
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
    AND (
      v.module_code <> 'VAR'
      OR v.ma_type_code IN ('MDVMIN', 'MDVMAJ')
    )
    @dateFilter
),

first_approval_document_upload AS (
  SELECT
    a.ma_id,
    MIN(d.created_date) AS approval_document_uploaded_date
  FROM approved_ma a
  JOIN document.document d
    ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad
    ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY
    a.ma_id
),

base AS (
  SELECT
    a.module_code,
    a.submoduletype_code,
    a.target_days,

    CASE
      WHEN f.approval_document_uploaded_date IS NULL THEN NULL
      ELSE
        EXTRACT(
          EPOCH FROM (
            f.approval_document_uploaded_date - a.approval_date
          )
        ) / 86400.0
    END AS processing_time_in_day

  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f
    ON f.ma_id = a.ma_id
)

SELECT
  module_code,
  submoduletype_code,
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
    WHEN 'VMIN' THEN 3
    WHEN 'VMAJ' THEN 4
    ELSE 5
  END;

