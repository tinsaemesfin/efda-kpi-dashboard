/*
 * Completes the non-FIR Market Authorization reporting catalogue.
 *
 * The migration is intentionally guarded: it locks kpi.kpi, requires the
 * current maximum id to be 88, inserts consecutive ids 89..113, validates the
 * resulting catalogue, and advances the sequence in one transaction.
 *
 * Usage:
 *   node scripts/complete-ma-kpi-reports.js --check
 *   node scripts/complete-ma-kpi-reports.js --validate
 *   node scripts/complete-ma-kpi-reports.js --apply
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg");
const { loadDatabaseUrl } = require("./load-database-url");

const mode = process.argv[2] ?? "--check";
if (!new Set(["--check", "--validate", "--apply"]).has(mode)) {
  console.error("Usage: node scripts/complete-ma-kpi-reports.js [--check|--validate|--apply]");
  process.exit(1);
}

const EXPECTED_CURRENT_MAX_ID = 88;
function buildFilterColumns(field = "created_date") {
  return JSON.stringify([{
    FieldName: "dateFilter",
    DType: { id: "6", name: "DateRange" },
    IsInnerFilter: true,
    Title: "Date",
    Alias: "v",
    OverridingFieldName: field,
    ParameterName: "dateFilter",
    Type: "DateRange",
  }]);
}

const productPredicates = {
  food: `
    v.submoduletype_code = 'FD'
    AND COALESCE(v.ma_type_code, '') <> 'FNT'
    AND COALESCE(v.is_food_notification, false) = false`,
  foodNotification: `
    v.submoduletype_code = 'FD'
    AND (
      TRIM(COALESCE(v.ma_type_code, '')) = 'FNT'
      OR COALESCE(v.is_food_notification, false) = true
    )`,
  medicalDevice: `v.submoduletype_code = 'MD'`,
  cosmetics: `v.submoduletype_code = 'CO'`,
  medicine: `v.submoduletype_code = 'MDCN'`,
};

function standardModulePredicate(product, kpiNumber) {
  if (kpiNumber === 1) return `v.module_code = 'NMR'`;
  if (kpiNumber === 2) return `v.module_code = 'REN'`;
  if (product === "foodNotification" && kpiNumber === 3) {
    return `v.module_code = 'VAR' AND v.ma_type_code = 'VFMIN'`;
  }
  if (product === "foodNotification" && kpiNumber === 4) {
    return `v.module_code = 'VAR' AND v.ma_type_code = 'VFMAJ'`;
  }
  return `v.module_code = 'VAR'`;
}

function outputModuleCode(product, kpiNumber) {
  if (kpiNumber === 1) return "NMR";
  if (kpiNumber === 2) return "REN";
  if (product === "cosmetics") return "VAR";
  return kpiNumber === 3 ? "VMIN" : "VMAJ";
}

function targetDays(kpiNumber) {
  return kpiNumber === 1 ? 270 : kpiNumber === 2 ? 90 : 60;
}

function standardDrilldownQuery(product, kpiNumber) {
  const moduleCode = outputModuleCode(product, kpiNumber);
  return `
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
    v.id,
    '${moduleCode}'::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    ${targetDays(kpiNumber)}::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE ${productPredicates[product]}
    AND ${standardModulePredicate(product, kpiNumber)}
    AND v.ma_status_code IN ('APR', 'REJ', 'ARCH', 'SUSP', 'CNCL')
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
    CASE
      WHEN application_type = 'New Application - Emergency Use Authorization' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN ('SRA', 'SRA''S', 'SRAS') THEN 'SRA''s'
      WHEN approval_pathway_norm = 'UNSPECIFIED' THEN 'Regular'
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN 'APR' THEN 'Approved'
      WHEN 'REJ' THEN 'Rejected'
      WHEN 'ARCH' THEN 'Archived'
      WHEN 'SUSP' THEN 'Suspended'
      WHEN 'CNCL' THEN 'Cancelled'
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''))) = 'EUA' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN 'No processing time'
      WHEN processing_time_in_day < 0 THEN 'Invalid negative time'
      WHEN processing_time_in_day <= 30 THEN '0-30 days'
      WHEN processing_time_in_day <= 90 THEN '31-90 days'
      WHEN processing_time_in_day <= 180 THEN '91-180 days'
      WHEN processing_time_in_day <= target_days THEN '181-' || target_days || ' days'
      ELSE 'Over ' || target_days || ' days'
    END AS processing_band
  FROM base
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
      ('Application type'::text, c.application_type_clean::text),
      ('Internal regulatory pathway'::text, CASE WHEN c.pathway_group = 'Internal regulatory pathway' THEN c.approval_pathway_clean::text END),
      ('Reliance pathway'::text, CASE WHEN c.pathway_group = 'Reliance pathway' THEN c.approval_pathway_clean::text END),
      ('Regulatory outcome'::text, c.regulatory_outcome_clean::text),
      ('MA type'::text, c.ma_type_clean::text),
      ('Processing time band'::text, c.processing_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT
  category_name,
  category_value,
  module_code,
  target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day >= 0)::numeric, 2) AS avg_processing_days
FROM categorized
GROUP BY category_name, category_value, module_code, target_days
ORDER BY category_name, category_value, module_code;
`;
}

function timeBase(product) {
  return `
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
  WHERE ${productPredicates[product]}
    AND v.module_code = 'NMR'
    AND v.ma_status_code IN ('APR', 'REJ', 'SUSP', 'CNCL')
    AND v.ma_number::text !~~ '%LD%'
    @dateFilter
)`;
}

function timeFaceQuery(product, submoduleCode) {
  return `
WITH ${timeBase(product)}
SELECT
  'NMR'::text AS module_code,
  '${submoduleCode}'::text AS submoduletype_code,
  270::int AS target_days,
  'Median Decision Time'::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  'NMR'::text,
  '${submoduleCode}'::text,
  270::int,
  'Average Decision Time'::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0;
`;
}

function timeDrilldownQuery(product, metric) {
  const isMedian = metric === "median";
  const primaryMetric = isMedian
    ? `ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days`
    : `ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days`;
  const overallColumn = isMedian ? "overall_median_days" : "overall_avg_days";
  const overallExpression = isMedian
    ? `ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2)`
    : `ROUND(AVG(decision_time_in_days)::numeric, 2)`;
  const analysisColumns = isMedian
    ? `
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days`
    : `
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct`;

  return `
WITH ${timeBase(product)},
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
  SELECT ${overallExpression} AS ${overallColumn}
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT
    /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = 'Reliance pathway' THEN 90 ELSE c.target_days END AS target_days,
    c.decision_time_in_days,
    x.category_name,
    x.category_value
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
  ${primaryMetric},
  ${analysisColumns}
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.${overallColumn}
ORDER BY category_name, category_value;
`;
}

function parModuleExpression(product) {
  if (product === "medicine") {
    return `CASE WHEN v.module_code = 'VAR' THEN v.ma_type_code ELSE v.module_code END`;
  }
  if (product === "medicalDevice") {
    return `CASE
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'MDVMIN' THEN 'VMIN'
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'MDVMAJ' THEN 'VMAJ'
      ELSE v.module_code
    END`;
  }
  if (product === "food") {
    return `CASE
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'VFMIN' THEN 'VMIN'
      WHEN v.module_code = 'VAR' AND v.ma_type_code = 'VFMAJ' THEN 'VMAJ'
      ELSE v.module_code
    END`;
  }
  return `v.module_code`;
}

function parVariationPredicate(product) {
  if (product === "medicine") return `AND (v.module_code <> 'VAR' OR v.ma_type_code IN ('VMIN', 'VMAJ'))`;
  if (product === "medicalDevice") return `AND (v.module_code <> 'VAR' OR v.ma_type_code IN ('MDVMIN', 'MDVMAJ'))`;
  if (product === "food") return `AND (v.module_code <> 'VAR' OR v.ma_type_code IN ('VFMIN', 'VFMAJ'))`;
  return "";
}

function parCommon(product) {
  return `
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN ('PSA', 'SPC', 'LBL', 'PIL')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.decision_date AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, 'UNSPECIFIED') AS application_type,
    TRIM(COALESCE(v.approval_pathway, 'UNSPECIFIED')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, 'UNSPECIFIED')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    ${parModuleExpression(product)} AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE ${productPredicates[product]}
    AND v.ma_status_code = 'APR'
    AND v.decision_date IS NOT NULL
    AND v.module_code IN ('NMR', 'REN', 'VAR')
    AND v.ma_number::text !~~ '%LD%'
    ${parVariationPredicate(product)}
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
)`;
}

function parFaceQuery(product) {
  return `
WITH ${parCommon(product)},
base AS (
  SELECT
    a.module_code,
    a.submoduletype_code,
    a.target_days,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT
  module_code,
  submoduletype_code,
  target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage
FROM base
GROUP BY module_code, submoduletype_code, target_days
ORDER BY module_code;
`;
}

function parDrilldownQuery(product) {
  return `
WITH ${parCommon(product)},
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
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
    CASE
      WHEN publication_date IS NULL THEN 'Not published'
      WHEN processing_time_in_day < 0 THEN 'Invalid publication date'
      WHEN processing_time_in_day <= 7 THEN '0-7 days'
      WHEN processing_time_in_day <= 14 THEN '8-14 days'
      WHEN processing_time_in_day <= 30 THEN '15-30 days'
      WHEN processing_time_in_day <= 60 THEN '31-60 days'
      ELSE 'Over 60 days'
    END AS publication_band
  FROM base
),
categorized AS (
  SELECT c.module_code, c.target_days, c.processing_time_in_day, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      ('Application type'::text, c.application_type_clean::text),
      ('Application module'::text, c.module_code::text),
      ('Internal regulatory pathway'::text, CASE WHEN c.pathway_group = 'Internal regulatory pathway' THEN c.approval_pathway_clean::text END),
      ('Reliance pathway'::text, CASE WHEN c.pathway_group = 'Reliance pathway' THEN c.approval_pathway_clean::text END),
      ('Regulatory outcome'::text, COALESCE(c.regulatory_outcome, 'Approved')::text),
      ('MA type'::text, c.ma_type_code::text),
      ('Publication time band'::text, c.publication_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT
  category_name,
  category_value,
  module_code,
  target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day >= 0)::numeric, 2) AS avg_processing_days
FROM categorized
GROUP BY category_name, category_value, module_code, target_days
ORDER BY category_name, category_value, module_code;
`;
}

const reports = [
  { id: 89, title: "MA-Food-Notification-DD-KPI-1 NEW", description: "Food Notification MA New drilldown", query: standardDrilldownQuery("foodNotification", 1) },
  { id: 90, title: "MA-Food-Notification-DD-KPI-2 REN", description: "Food Notification MA Renewal drilldown", query: standardDrilldownQuery("foodNotification", 2) },
  { id: 91, title: "MA-Food-Notification-DD-KPI-3 VMIN", description: "Food Notification MA Minor Variation drilldown", query: standardDrilldownQuery("foodNotification", 3) },
  { id: 92, title: "MA-Food-Notification-DD-KPI-4 VMAJ", description: "Food Notification MA Major Variation drilldown", query: standardDrilldownQuery("foodNotification", 4) },
  { id: 93, title: "MA-CO-DD-KPI-1 NEW", description: "Cosmetics MA New drilldown", query: standardDrilldownQuery("cosmetics", 1) },
  { id: 94, title: "MA-CO-DD-KPI-2 REN", description: "Cosmetics MA Renewal drilldown", query: standardDrilldownQuery("cosmetics", 2) },
  { id: 95, title: "MA-CO-DD-KPI-3 VAR", description: "Cosmetics MA Variation drilldown", query: standardDrilldownQuery("cosmetics", 3) },
  { id: 96, title: "MA-Food-Front-KPI6-7 mean-median", description: "Food MA decision-time face", query: timeFaceQuery("food", "FD") },
  { id: 97, title: "MA-Food-DD-KPI6-median", description: "Food MA median decision-time drilldown", query: timeDrilldownQuery("food", "median") },
  { id: 98, title: "MA-Food-DD-KPI7-average", description: "Food MA average decision-time drilldown", query: timeDrilldownQuery("food", "average") },
  { id: 99, title: "MA-Food-Notification-Front-KPI6-7 mean-median", description: "Food Notification MA decision-time face", query: timeFaceQuery("foodNotification", "FD") },
  { id: 100, title: "MA-Food-Notification-DD-KPI6-median", description: "Food Notification MA median decision-time drilldown", query: timeDrilldownQuery("foodNotification", "median") },
  { id: 101, title: "MA-Food-Notification-DD-KPI7-average", description: "Food Notification MA average decision-time drilldown", query: timeDrilldownQuery("foodNotification", "average") },
  { id: 102, title: "MA-MD-Front-KPI6-7 mean-median", description: "Medical Device MA decision-time face", query: timeFaceQuery("medicalDevice", "MD") },
  { id: 103, title: "MA-MD-DD-KPI6-median", description: "Medical Device MA median decision-time drilldown", query: timeDrilldownQuery("medicalDevice", "median") },
  { id: 104, title: "MA-MD-DD-KPI7-average", description: "Medical Device MA average decision-time drilldown", query: timeDrilldownQuery("medicalDevice", "average") },
  { id: 105, title: "MA-CO-Front-KPI6-7 mean-median", description: "Cosmetics MA decision-time face", query: timeFaceQuery("cosmetics", "CO") },
  { id: 106, title: "MA-CO-DD-KPI6-median", description: "Cosmetics MA median decision-time drilldown", query: timeDrilldownQuery("cosmetics", "median") },
  { id: 107, title: "MA-CO-DD-KPI7-average", description: "Cosmetics MA average decision-time drilldown", query: timeDrilldownQuery("cosmetics", "average") },
  { id: 108, title: "MA-Food-Notification-Front-KPI8-PAR", description: "Food Notification PAR face", query: parFaceQuery("foodNotification") },
  { id: 109, title: "MA-MDCN-DD-KPI8-PAR", description: "Medicine PAR drilldown", query: parDrilldownQuery("medicine") },
  { id: 110, title: "MA-Food-DD-KPI8-PAR", description: "Food PAR drilldown", query: parDrilldownQuery("food") },
  { id: 111, title: "MA-Food-Notification-DD-KPI8-PAR", description: "Food Notification PAR drilldown", query: parDrilldownQuery("foodNotification") },
  { id: 112, title: "MA-MD-DD-KPI8-PAR", description: "Medical Device PAR drilldown", query: parDrilldownQuery("medicalDevice") },
  { id: 113, title: "MA-CO-DD-KPI8-PAR", description: "Cosmetics PAR drilldown", query: parDrilldownQuery("cosmetics") },
];

function validateDefinitionSequence() {
  reports.forEach((report, index) => {
    const expectedId = EXPECTED_CURRENT_MAX_ID + index + 1;
    if (report.id !== expectedId) {
      throw new Error(`Report sequence is not consecutive: expected ${expectedId}, got ${report.id}`);
    }
    if (/\bFIR\b|fir_/i.test(report.query)) {
      throw new Error(`Report ${report.id} unexpectedly contains FIR-specific SQL`);
    }
    if (!report.query.includes("@dateFilter")) {
      throw new Error(`Report ${report.id} does not contain @dateFilter`);
    }
  });
}

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  validateDefinitionSequence();
  await client.connect();
  try {
    const maxResult = await client.query("SELECT COALESCE(MAX(id), 0)::int AS max_id FROM kpi.kpi");
    const currentMax = maxResult.rows[0].max_id;
    const existingResult = await client.query(
      "SELECT id, title FROM kpi.kpi WHERE id = ANY($1::int[]) ORDER BY id",
      [reports.map((report) => report.id)]
    );

    if (mode === "--check") {
      console.log(JSON.stringify({ currentMax, planned: reports.map(({ id, title }) => ({ id, title })), existing: existingResult.rows }, null, 2));
      return;
    }

    if (mode === "--validate") {
      const validated = [];
      for (const report of reports) {
        const sql = report.query.replaceAll(
          "@dateFilter",
          "AND v.created_date >= $1::date AND v.created_date < ($2::date + INTERVAL '1 day')"
        );
        const result = await client.query(sql, ["2026-01-01", "2026-12-31"]);
        validated.push({
          id: report.id,
          title: report.title,
          rowCount: result.rowCount,
          columns: result.fields.map((field) => field.name),
        });
      }
      console.log(JSON.stringify({ validatedCount: validated.length, validated }, null, 2));
      return;
    }

    await client.query("BEGIN");
    await client.query("LOCK TABLE kpi.kpi IN EXCLUSIVE MODE");
    const lockedMaxResult = await client.query("SELECT COALESCE(MAX(id), 0)::int AS max_id FROM kpi.kpi");
    const lockedMax = lockedMaxResult.rows[0].max_id;
    if (lockedMax !== EXPECTED_CURRENT_MAX_ID) {
      throw new Error(`Expected latest kpi.kpi id ${EXPECTED_CURRENT_MAX_ID}, found ${lockedMax}; no rows were inserted`);
    }

    for (const report of reports) {
      await client.query(
        `INSERT INTO kpi.kpi (
          id, title, created_date, description, query, series_columns,
          filter_columns, report_type_id, priority, is_active, modified_date,
          name, width, max_rows, is_mobile, column_definitions,
          report_group_id, kpi_group
        ) VALUES (
          $1, $2, NOW(), $3, $4, NULL,
          $5, 11, 10, true, NOW(),
          'KPIMA', 4, 500, false, '[]',
          NULL, 'MA'
        )`,
        [report.id, report.title, report.description, report.query, buildFilterColumns(report.id >= 96 ? "decision_date" : "created_date")]
      );
    }

    const finalId = reports.at(-1).id;
    await client.query("SELECT setval('kpi.kpi_id_seq', $1, true)", [finalId]);
    const verifyResult = await client.query(
      `SELECT COUNT(*)::int AS inserted_count,
              MIN(id)::int AS min_id,
              MAX(id)::int AS max_id,
              BOOL_AND(kpi_group = 'MA') AS all_ma,
              BOOL_AND(query !~* '\\mFIR\\M') AS excludes_fir_sql
       FROM kpi.kpi WHERE id BETWEEN $1 AND $2`,
      [reports[0].id, finalId]
    );
    const verification = verifyResult.rows[0];
    if (verification.inserted_count !== reports.length || !verification.all_ma || !verification.excludes_fir_sql) {
      throw new Error(`Post-insert verification failed: ${JSON.stringify(verification)}`);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ applied: true, ...verification }, null, 2));
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
