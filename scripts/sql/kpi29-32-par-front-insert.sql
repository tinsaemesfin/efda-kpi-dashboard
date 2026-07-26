-- PAR / MA-KPI-8 face reports (ids 29–32)
-- Generated from docs/guide.md — re-run: node scripts/generate-par-kpi-insert.js
-- Mapping:
--   29 Medicine (MDCN)
--   30 Medical Device (MD)
--   31 Food (FD)
--   32 Cosmetics (CO)
-- Requires a write-capable DB user (readonly_user cannot INSERT).

BEGIN;

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
) VALUES
(
  29,
  'MA-MDCN-Front-KPI8-PAR',
  NOW(),
  'MDCN-PAR-Front',
  $q29$
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
      WHEN v.module_code = 'VAR' THEN v.ma_type_code
      ELSE v.module_code
    END AS module_code,

    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.submoduletype_code = 'MDCN'
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
    AND (
      v.module_code <> 'VAR'
      OR v.ma_type_code IN ('VMIN', 'VMAJ')
    )
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
$q29$,
  NULL,
  '[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Date","Alias":"ship","OverridingFieldName":"created_date","ParameterName":"dateFilter","Type":"DateRange"}]',
  11,
  10,
  true,
  NOW(),
  'KPIMATest',
  newid(),
  4,
  100,
  false,
  '[]',
  NULL,
  'MA'
),
(
  30,
  'MA-MD-Front-KPI8-PAR',
  NOW(),
  'MD-PAR-Front',
  $q30$
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
$q30$,
  NULL,
  '[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Date","Alias":"ship","OverridingFieldName":"created_date","ParameterName":"dateFilter","Type":"DateRange"}]',
  11,
  10,
  true,
  NOW(),
  'KPIMATest',
  newid(),
  4,
  100,
  false,
  '[]',
  NULL,
  'MA'
),
(
  31,
  'MA-Food-Front-KPI8-PAR',
  NOW(),
  'FD-PAR-Front',
  $q31$
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
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'VFMIN' THEN 'VMIN'
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'VFMAJ' THEN 'VMAJ'
      ELSE v.module_code
    END AS module_code,

    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.submoduletype_code = 'FD'
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
    AND (
      v.module_code <> 'VAR'
      OR v.ma_type_code IN ('VFMIN', 'VFMAJ')
    )

    /* Exclude Food Notifications */
    AND NOT (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )
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
$q31$,
  NULL,
  '[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Date","Alias":"ship","OverridingFieldName":"created_date","ParameterName":"dateFilter","Type":"DateRange"}]',
  11,
  10,
  true,
  NOW(),
  'KPIMATest',
  newid(),
  4,
  100,
  false,
  '[]',
  NULL,
  'MA'
),
(
  32,
  'MA-CO-Front-KPI8-PAR',
  NOW(),
  'CO-PAR-Front',
  $q32$
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
      WHEN v.module_code = 'VAR' THEN v.ma_type_code
      ELSE v.module_code
    END AS module_code,

    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.submoduletype_code = 'CO'
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
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
    WHEN 'VAR' THEN 5
    ELSE 6
  END;
$q32$,
  NULL,
  '[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Date","Alias":"ship","OverridingFieldName":"created_date","ParameterName":"dateFilter","Type":"DateRange"}]',
  11,
  10,
  true,
  NOW(),
  'KPIMATest',
  newid(),
  4,
  100,
  false,
  '[]',
  NULL,
  'MA'
);

SELECT setval(
  'kpi.kpi_id_seq',
  GREATEST((SELECT MAX(id) FROM kpi.kpi), 32)
);

COMMIT;

-- Verify:
-- SELECT id, title, description, kpi_group FROM kpi.kpi WHERE id BETWEEN 29 AND 32 ORDER BY id;
