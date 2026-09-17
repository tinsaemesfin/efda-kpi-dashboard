-- Prepared locally only. Not applied. Preconditions prevent overwriting changed reports.

BEGIN;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MDCN''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=194 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MDCN''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 194 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=195 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 195 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    ma.id,
    ma.module_code,
    ma.submoduletype_code,
    ma.ma_type_code,
    COALESCE(ma.application_type, ''UNSPECIFIED'') AS application_type,
    ma.ma_status_code,
    COALESCE(ma.ma_status_display_name, ma.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(ma.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(ma.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(ma.is_sra, false) AS is_sra,

    /*
      Uses the same processing_time_in_day field name used by
      the rest of your original script.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM effective_ma ma
  LEFT JOIN unified_processing_time upt
    ON upt.id = ma.id
  WHERE ma.submoduletype_code = ''MDCN''
    AND ma.module_code = ''NMR''
    AND ma.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND ma.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This now uses processing_time_in_day calculated from
      vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''Over 270 days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      vwma_unified_processing_time.
    */
    upt.processing_time_in_day AS current_processing_time_in_day,

    270 AS target_days

  FROM effective_ma v

  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id

  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
    prev_m.id AS ma_id,
    prev_m.original_ma_id,
    mc.depth + 1 AS depth
  FROM ma_chain mc
  JOIN license.ma prev_m
    ON prev_m.id = mc.original_ma_id
),

root_ma AS (
  SELECT DISTINCT ON (current_id)
    current_id,
    ma_id AS root_id
  FROM ma_chain
  WHERE original_ma_id IS NULL
  ORDER BY current_id, depth DESC
),

root_details AS (
  SELECT
    rm.current_id,
    rv.id AS root_id,
    rv.module_code AS root_module_code,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_ma rm
  LEFT JOIN effective_ma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,

    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This is the updated value used for:
      - On-time count
      - Percentage
      - Average processing days
      - Processing time band
    */
    bc.current_processing_time_in_day AS processing_time_in_day,

    rd.root_id,
    rd.root_module_code,
    rd.root_application_type,
    rd.root_approval_pathway_norm,
    rd.root_approval_pathway_code_norm,
    rd.root_is_sra,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.current_processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.current_processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.current_processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN bc.current_processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.current_processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
      THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id

  WHERE rd.root_module_code = ''NMR''
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time used for:
      - Processing bands
      - On-time count
      - Percentage
      - Average processing days
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.module_code = ''VAR''
    AND v.ma_type_code = ''VMIN''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')

    /*
      Exclude legacy CURRENT VMIN applications only.

      Root NMR records may be legacy because it is expected that
      many current variations originated from legacy NMR records.
    */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  ORDER BY
    current_id,
    depth DESC
),

/*
  Do not filter the root MA by:
  - root module = NMR
  - root MA number not containing LD

  This allows all 1,787 current non-legacy VMIN records
  to remain in the report.
*/
root_details AS (
  SELECT
    rm.current_id,
    rm.root_id,

    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra

  FROM root_ma rm
  LEFT JOIN effective_ma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,
    bc.processing_time_in_day,

    CASE
      WHEN COALESCE(rd.root_application_type, ''UNSPECIFIED'')
           = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE COALESCE(rd.root_application_type, ''UNSPECIFIED'')
    END AS application_type_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'') = ''UNSPECIFIED''
        THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%reliance%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%REL%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%CRP%''
        OR COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band

  FROM base_current bc
  LEFT JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.ma_type_code = ''VMAJ''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = ''NMR''
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated value drives:
      - Processing time band
      - On-time count
      - Percentage
      - Average processing days
    */
    bc.processing_time_in_day,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''MDCN''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=155 AND query='/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    ma.id,
    ma.module_code,
    ma.submoduletype_code,
    ma.ma_type_code,
    COALESCE(ma.application_type, ''UNSPECIFIED'') AS application_type,
    ma.ma_status_code,
    COALESCE(ma.ma_status_display_name, ma.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(ma.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(ma.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
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
  WHERE ma.submoduletype_code = ''MDCN''
    AND ma.module_code = ''NMR''
    AND ma.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND ma.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This now uses processing_time_in_day calculated from
      vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''Over 270 days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      vwma_unified_processing_time.
    */
    upt.processing_time_in_day AS current_processing_time_in_day,

    270 AS target_days

  FROM license.vwma v

  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id

  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
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
    prev_m.id AS ma_id,
    prev_m.original_ma_id,
    mc.depth + 1 AS depth
  FROM ma_chain mc
  JOIN license.ma prev_m
    ON prev_m.id = mc.original_ma_id
),

root_ma AS (
  SELECT DISTINCT ON (current_id)
    current_id,
    ma_id AS root_id
  FROM ma_chain
  WHERE original_ma_id IS NULL
  ORDER BY current_id, depth DESC
),

root_details AS (
  SELECT
    rm.current_id,
    rv.id AS root_id,
    rv.module_code AS root_module_code,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_ma rm
  LEFT JOIN license.vwma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,

    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This is the updated value used for:
      - On-time count
      - Percentage
      - Average processing days
      - Processing time band
    */
    bc.current_processing_time_in_day AS processing_time_in_day,

    rd.root_id,
    rd.root_module_code,
    rd.root_application_type,
    rd.root_approval_pathway_norm,
    rd.root_approval_pathway_code_norm,
    rd.root_is_sra,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.current_processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.current_processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.current_processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN bc.current_processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.current_processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
      THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id

  WHERE rd.root_module_code = ''NMR''
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time used for:
      - Processing bands
      - On-time count
      - Percentage
      - Average processing days
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.module_code = ''VAR''
    AND v.ma_type_code = ''VMIN''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')

    /*
      Exclude legacy CURRENT VMIN applications only.

      Root NMR records may be legacy because it is expected that
      many current variations originated from legacy NMR records.
    */
    AND v.ma_number::text !~~ ''%LD%''
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
  ORDER BY
    current_id,
    depth DESC
),

/*
  Do not filter the root MA by:
  - root module = NMR
  - root MA number not containing LD

  This allows all 1,787 current non-legacy VMIN records
  to remain in the report.
*/
root_details AS (
  SELECT
    rm.current_id,
    rm.root_id,

    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra

  FROM root_ma rm
  LEFT JOIN license.vwma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,
    bc.processing_time_in_day,

    CASE
      WHEN COALESCE(rd.root_application_type, ''UNSPECIFIED'')
           = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE COALESCE(rd.root_application_type, ''UNSPECIFIED'')
    END AS application_type_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'') = ''UNSPECIFIED''
        THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%reliance%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%REL%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%CRP%''
        OR COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band

  FROM base_current bc
  LEFT JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.ma_type_code = ''VMAJ''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
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
   AND root_v.module_code = ''NMR''
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN license.vwma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated value drives:
      - Processing time band
      - On-time count
      - Percentage
      - Average processing days
    */
    bc.processing_time_in_day,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''MDCN''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 155 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
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
    COALESCE(ma.application_type, ''UNSPECIFIED'') AS application_type,
    ma.ma_status_code,
    COALESCE(ma.ma_status_display_name, ma.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(ma.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(ma.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(ma.is_sra, false) AS is_sra,

    /*
      Uses the same processing_time_in_day field name used by
      the rest of your original script.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM effective_ma ma
  LEFT JOIN unified_processing_time upt
    ON upt.id = ma.id
  WHERE ma.submoduletype_code = ''MDCN''
    AND ma.module_code = ''NMR''
    AND ma.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND ma.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This now uses processing_time_in_day calculated from
      vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''Over 270 days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=160 AND query='/* MA face/drilldown alignment v1 */
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
    COALESCE(ma.application_type, ''UNSPECIFIED'') AS application_type,
    ma.ma_status_code,
    COALESCE(ma.ma_status_display_name, ma.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(ma.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(ma.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
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
  WHERE ma.submoduletype_code = ''MDCN''
    AND ma.module_code = ''NMR''
    AND ma.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND ma.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This now uses processing_time_in_day calculated from
      vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''Over 270 days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 160 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      vwma_unified_processing_time.
    */
    upt.processing_time_in_day AS current_processing_time_in_day,

    270 AS target_days

  FROM effective_ma v

  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id

  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
    prev_m.id AS ma_id,
    prev_m.original_ma_id,
    mc.depth + 1 AS depth
  FROM ma_chain mc
  JOIN license.ma prev_m
    ON prev_m.id = mc.original_ma_id
),

root_ma AS (
  SELECT DISTINCT ON (current_id)
    current_id,
    ma_id AS root_id
  FROM ma_chain
  WHERE original_ma_id IS NULL
  ORDER BY current_id, depth DESC
),

root_details AS (
  SELECT
    rm.current_id,
    rv.id AS root_id,
    rv.module_code AS root_module_code,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_ma rm
  LEFT JOIN effective_ma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,

    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This is the updated value used for:
      - On-time count
      - Percentage
      - Average processing days
      - Processing time band
    */
    bc.current_processing_time_in_day AS processing_time_in_day,

    rd.root_id,
    rd.root_module_code,
    rd.root_application_type,
    rd.root_approval_pathway_norm,
    rd.root_approval_pathway_code_norm,
    rd.root_is_sra,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.current_processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.current_processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.current_processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN bc.current_processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.current_processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
      THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id

  WHERE rd.root_module_code = ''NMR''
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=161 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      vwma_unified_processing_time.
    */
    upt.processing_time_in_day AS current_processing_time_in_day,

    270 AS target_days

  FROM license.vwma v

  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id

  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
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
    prev_m.id AS ma_id,
    prev_m.original_ma_id,
    mc.depth + 1 AS depth
  FROM ma_chain mc
  JOIN license.ma prev_m
    ON prev_m.id = mc.original_ma_id
),

root_ma AS (
  SELECT DISTINCT ON (current_id)
    current_id,
    ma_id AS root_id
  FROM ma_chain
  WHERE original_ma_id IS NULL
  ORDER BY current_id, depth DESC
),

root_details AS (
  SELECT
    rm.current_id,
    rv.id AS root_id,
    rv.module_code AS root_module_code,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_ma rm
  LEFT JOIN license.vwma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,

    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This is the updated value used for:
      - On-time count
      - Percentage
      - Average processing days
      - Processing time band
    */
    bc.current_processing_time_in_day AS processing_time_in_day,

    rd.root_id,
    rd.root_module_code,
    rd.root_application_type,
    rd.root_approval_pathway_norm,
    rd.root_approval_pathway_code_norm,
    rd.root_is_sra,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.current_processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.current_processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.current_processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN bc.current_processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.current_processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
      THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id

  WHERE rd.root_module_code = ''NMR''
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 161 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time used for:
      - Processing bands
      - On-time count
      - Percentage
      - Average processing days
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.module_code = ''VAR''
    AND v.ma_type_code = ''VMIN''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')

    /*
      Exclude legacy CURRENT VMIN applications only.

      Root NMR records may be legacy because it is expected that
      many current variations originated from legacy NMR records.
    */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  ORDER BY
    current_id,
    depth DESC
),

/*
  Do not filter the root MA by:
  - root module = NMR
  - root MA number not containing LD

  This allows all 1,787 current non-legacy VMIN records
  to remain in the report.
*/
root_details AS (
  SELECT
    rm.current_id,
    rm.root_id,

    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra

  FROM root_ma rm
  LEFT JOIN effective_ma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,
    bc.processing_time_in_day,

    CASE
      WHEN COALESCE(rd.root_application_type, ''UNSPECIFIED'')
           = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE COALESCE(rd.root_application_type, ''UNSPECIFIED'')
    END AS application_type_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'') = ''UNSPECIFIED''
        THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%reliance%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%REL%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%CRP%''
        OR COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band

  FROM base_current bc
  LEFT JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=162 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time used for:
      - Processing bands
      - On-time count
      - Percentage
      - Average processing days
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.module_code = ''VAR''
    AND v.ma_type_code = ''VMIN''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')

    /*
      Exclude legacy CURRENT VMIN applications only.

      Root NMR records may be legacy because it is expected that
      many current variations originated from legacy NMR records.
    */
    AND v.ma_number::text !~~ ''%LD%''
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
  ORDER BY
    current_id,
    depth DESC
),

/*
  Do not filter the root MA by:
  - root module = NMR
  - root MA number not containing LD

  This allows all 1,787 current non-legacy VMIN records
  to remain in the report.
*/
root_details AS (
  SELECT
    rm.current_id,
    rm.root_id,

    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra

  FROM root_ma rm
  LEFT JOIN license.vwma rv
    ON rv.id = rm.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,
    bc.processing_time_in_day,

    CASE
      WHEN COALESCE(rd.root_application_type, ''UNSPECIFIED'')
           = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE COALESCE(rd.root_application_type, ''UNSPECIFIED'')
    END AS application_type_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'') = ''UNSPECIFIED''
        THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN COALESCE(rd.root_is_sra, false) = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(COALESCE(rd.root_approval_pathway_norm, ''UNSPECIFIED'')))
           IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%reliance%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%REL%''
        OR COALESCE(rd.root_approval_pathway_code_norm, '''') ILIKE ''%CRP%''
        OR COALESCE(rd.root_approval_pathway_norm, '''') ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band

  FROM base_current bc
  LEFT JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 162 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.ma_type_code = ''VMAJ''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = ''NMR''
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated value drives:
      - Processing time band
      - On-time count
      - Percentage
      - Average processing days
    */
    bc.processing_time_in_day,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=163 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.ma_type_code = ''VMAJ''
    AND v.submoduletype_code = ''MDCN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
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
   AND root_v.module_code = ''NMR''
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN license.vwma rv
    ON rv.id = rn.root_id
),

classified AS (
  SELECT
    bc.current_id AS id,
    bc.module_code,
    bc.target_days,
    bc.current_ma_type_code AS ma_type_code,
    bc.current_ma_status_code AS ma_status_code,
    bc.current_regulatory_outcome AS regulatory_outcome,

    /*
      This updated value drives:
      - Processing time band
      - On-time count
      - Percentage
      - Average processing days
    */
    bc.processing_time_in_day,

    CASE
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN LOWER(TRIM(COALESCE(bc.current_regulatory_outcome, ''''))) = ''archived''
        OR bc.current_ma_status_code = ''ARCH''
        THEN NULL
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      WHEN bc.processing_time_in_day <= 90 THEN ''61-90 days''
      WHEN bc.processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN bc.processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 163 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''MDCN''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''MDCN''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=118 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''MDCN''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''MDCN''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 118 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=119 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 119 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=120 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MDCN''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 120 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MDCN''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=114 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MDCN''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 114 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=109 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE WHEN v.module_code = ''VAR'' THEN v.ma_type_code ELSE v.module_code END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MDCN''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VMIN'', ''VMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 109 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=196 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 196 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=197 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 197 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy data */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This processing band now uses the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''FNT'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    90 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the processing time calculated
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'')
        THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMIN'' THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMAJ'' THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''FD''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=156 AND query='/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy data */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This processing band now uses the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''FNT'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    90 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the processing time calculated
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'')
        THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMIN'' THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMAJ'' THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''FD''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 156 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy data */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This processing band now uses the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''FNT'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=164 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    v.module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy data */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      This processing band now uses the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''FNT'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 164 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    90 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the processing time calculated
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'')
        THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=165 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    90 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the processing time calculated
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'')
        THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 165 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMIN'' THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=166 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands now use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMIN'' THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 166 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMAJ'' THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=167 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''FD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false

    /* Exclude legacy MA records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Processing bands use the updated processing time
      from vwma_unified_processing_time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''VFMAJ'' THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) IN (''EUA'', ''FNT'') THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 167 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''FD''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''FD''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=96 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''FD''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''FD''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 96 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=97 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 97 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=98 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 98 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=115 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 115 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=110 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND TRIM(COALESCE(v.ma_type_code, '''')) <> ''FNT''
    AND COALESCE(v.is_food_notification, false) = false
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''VFMIN'', ''VFMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 110 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=198 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 198 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=199 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 199 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMIN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMAJ''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''FD''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=157 AND query='/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMIN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VMAJ''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''FD''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 157 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=168 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 168 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=169 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 169 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=170 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 170 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=171 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''VAR'' AND v.ma_type_code = ''VFMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 171 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''FD''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''FD''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=99 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''FD''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''FD''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 99 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=100 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 100 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=101 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 101 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=108 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''FD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 108 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=111 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE 
    v.submoduletype_code = ''FD''
    AND (
      TRIM(COALESCE(v.ma_type_code, '''')) = ''FNT''
      OR COALESCE(v.is_food_notification, false) = true
    )
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 111 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=200 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 200 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=201 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 201 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''NMR''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Uses the unified regulatory processing time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    upt.processing_time_in_day,

    90 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMIN''::text AS module_code,
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
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = ''NMR''

   /* Exclude root legacy records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMIN''
        THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy variation records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = ''NMR''

   /* Exclude legacy root NMR records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMAJ''
        THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''MD''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=158 AND query='/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''NMR''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Uses the unified regulatory processing time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    upt.processing_time_in_day,

    90 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMIN''::text AS module_code,
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
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy records */
    AND v.ma_number::text !~~ ''%LD%''
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
   AND root_v.module_code = ''NMR''

   /* Exclude root legacy records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMIN''
        THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_3 AS (WITH RECURSIVE base_current AS (
  SELECT
    v.id AS current_id,
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy variation records */
    AND v.ma_number::text !~~ ''%LD%''
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
   AND root_v.module_code = ''NMR''

   /* Exclude legacy root NMR records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMAJ''
        THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_3
)
SELECT module_code, ''MD''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 158 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''NMR''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Uses the unified regulatory processing time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=172 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''NMR''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time
    */
    upt.processing_time_in_day,

    270 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    /*
      Uses the unified regulatory processing time.
    */
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= 270 THEN ''181-270 days''
      ELSE ''270+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 172 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    upt.processing_time_in_day,

    90 AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=173 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,

    upt.processing_time_in_day,

    90 AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),

classified AS (
  SELECT
    *,

    CASE
      WHEN is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      ELSE ''90+ days''
    END AS processing_band,

    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE application_type
    END AS application_type_clean,

    CASE
      WHEN is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN ma_status_code = ''APR'' THEN ''Approved''
      WHEN ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL
      ELSE ma_type_code
    END AS ma_type_clean
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 173 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
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
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = ''NMR''

   /* Exclude root legacy records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMIN''
        THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=174 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMIN''::text AS module_code,
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
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMIN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy records */
    AND v.ma_number::text !~~ ''%LD%''
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
   AND root_v.module_code = ''NMR''

   /* Exclude root legacy records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMIN''
        THEN ''VMIN''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band

  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 174 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy variation records */
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
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
  JOIN effective_ma root_v
    ON root_v.id = rm.root_id
   AND root_v.module_code = ''NMR''

   /* Exclude legacy root NMR records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
    COALESCE(rv.is_sra, false) AS root_is_sra
  FROM root_nmr rn
  JOIN effective_ma rv
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMAJ''
        THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=175 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VMAJ''::text AS module_code,
    v.submoduletype_code,
    v.ma_type_code AS current_ma_type_code,
    v.ma_status_code AS current_ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS current_regulatory_outcome,

    /*
      Updated regulatory processing time from
      license.vwma_unified_processing_time.
    */
    upt.processing_time_in_day,

    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt
    ON upt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''VAR''
    AND v.ma_type_code = ''MDVMAJ''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')

    /* Exclude current legacy variation records */
    AND v.ma_number::text !~~ ''%LD%''
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
   AND root_v.module_code = ''NMR''

   /* Exclude legacy root NMR records */
   AND root_v.ma_number::text !~~ ''%LD%''
),

root_details AS (
  SELECT
    rn.current_id,
    rv.id AS root_id,
    COALESCE(rv.application_type, ''UNSPECIFIED'') AS root_application_type,
    TRIM(COALESCE(rv.approval_pathway, ''UNSPECIFIED'')) AS root_approval_pathway_norm,
    TRIM(COALESCE(rv.approval_pathway_code, ''UNSPECIFIED'')) AS root_approval_pathway_code_norm,
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
      WHEN rd.root_application_type = ''New Application - Emergency Use Authorization''
        THEN NULL
      ELSE rd.root_application_type
    END AS application_type_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''SRA''''s''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''SRA''''s''
      WHEN rd.root_approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE rd.root_approval_pathway_norm
    END AS approval_pathway_clean,

    CASE
      WHEN rd.root_is_sra = true THEN ''Reliance pathway''
      WHEN UPPER(TRIM(rd.root_approval_pathway_norm)) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        THEN ''Reliance pathway''
      WHEN rd.root_approval_pathway_norm ILIKE ''%reliance%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%REL%''
        OR rd.root_approval_pathway_code_norm ILIKE ''%CRP%''
        OR rd.root_approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
        THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,

    CASE
      WHEN bc.current_ma_status_code = ''APR'' THEN ''Approved''
      WHEN bc.current_ma_status_code = ''ARCH'' THEN ''Archived''
      WHEN bc.current_ma_status_code = ''REJ'' THEN ''Rejected''
      WHEN bc.current_ma_status_code = ''SUSP'' THEN ''Suspended''
      WHEN bc.current_ma_status_code = ''CNCL'' THEN ''Cancelled''
      ELSE bc.current_regulatory_outcome
    END AS regulatory_outcome_clean,

    CASE
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''MDVMAJ''
        THEN ''VMAJ''
      WHEN UPPER(TRIM(COALESCE(bc.current_ma_type_code, ''''))) = ''EUA''
        THEN NULL
      ELSE bc.current_ma_type_code
    END AS ma_type_clean,

    CASE
      WHEN bc.processing_time_in_day IS NULL THEN ''No processing time''
      WHEN bc.processing_time_in_day < 0 THEN ''Invalid processing time''
      WHEN bc.processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN bc.processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''60+ days''
    END AS processing_band
  FROM base_current bc
  JOIN root_details rd
    ON rd.current_id = bc.current_id
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 175 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''MD''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''MD''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=102 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''MD''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''MD''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 102 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=103 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 103 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=104 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''MD''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 104 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=116 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''MD''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 116 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=112 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    CASE
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMIN'' THEN ''VMIN''
      WHEN v.module_code = ''VAR'' AND v.ma_type_code = ''MDVMAJ'' THEN ''VMAJ''
      ELSE v.module_code
    END AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''MD''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    AND (v.module_code <> ''VAR'' OR v.ma_type_code IN (''MDVMIN'', ''MDVMAJ''))
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 112 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''CO''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=202 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''CO''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 202 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]', modified_date=NOW()
  WHERE id=203 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Submission date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"submission_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 203 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VAR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''VAR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
)
SELECT module_code, ''CO''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=159 AND query='/* MA face/drilldown alignment v1 */
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
part_0 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_1 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records),
part_2 AS (WITH RECURSIVE base AS (
  SELECT
    v.id,
    ''VAR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''VAR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), records AS (
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_0
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_1
UNION ALL
SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_2
)
SELECT module_code, ''CO''::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 159 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=176 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''NMR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    270::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 176 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=177 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''REN''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    90::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''REN''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 177 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VAR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM effective_ma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''VAR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]', modified_date=NOW()
  WHERE id=178 AND query='/* MA face/drilldown alignment v1 */
WITH records AS (
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
    ''VAR''::text AS module_code,
    v.ma_type_code,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    upt.processing_time_in_day,
    60::int AS target_days
  FROM license.vwma v
  LEFT JOIN unified_processing_time upt ON upt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''VAR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''ARCH'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE
      WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL
      ELSE application_type
    END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''ARCH'' THEN ''Archived''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN processing_time_in_day IS NULL THEN ''No processing time''
      WHEN processing_time_in_day < 0 THEN ''Invalid negative time''
      WHEN processing_time_in_day <= 30 THEN ''0-30 days''
      WHEN processing_time_in_day <= 90 THEN ''31-90 days''
      WHEN processing_time_in_day <= 180 THEN ''91-180 days''
      WHEN processing_time_in_day <= target_days THEN ''181-'' || target_days || '' days''
      ELSE ''Over '' || target_days || '' days''
    END AS processing_band
  FROM base
),
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = ''NMR'' AND c.pathway_group = ''Reliance pathway''
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = ''Reliance pathway'' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome_clean, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')),
      (''Processing time band'', c.processing_band)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"FieldName":"dateFilter","DType":{"id":"6","name":"DateRange"},"IsInnerFilter":true,"Title":"Decision date","Alias":"","OverridingFieldName":"decision_date","ParameterName":"dateFilter","Type":"DateRange"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 178 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''CO''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''CO''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=105 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
)
SELECT
  ''NMR''::text AS module_code,
  ''CO''::text AS submoduletype_code,
  270::int AS target_days,
  ''Median Completion Time''::text AS metric,
  COUNT(*) AS total_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS decision_time_in_days
FROM base
WHERE decision_time_in_days >= 0
UNION ALL
SELECT
  ''NMR''::text,
  ''CO''::text,
  270::int,
  ''Average Completion Time''::text,
  COUNT(*),
  ROUND(AVG(decision_time_in_days)::numeric, 2)
FROM base
WHERE decision_time_in_days >= 0;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 105 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=106 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
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
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS median_decision_days,
  
  o.overall_median_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p25_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p75_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS p90_days,
  ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days) - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS iqr_days,
  ROUND((AVG(decision_time_in_days) - PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days))::numeric, 2) AS mean_median_skew_days
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_median_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 106 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM effective_ma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    AND decision_date IS NOT NULL
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=107 AND query='/* MA face/drilldown alignment v1 */

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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    dt.decision_time_in_days,
    270::int AS target_days
  FROM license.vwma v
  JOIN decision_time_per_ma dt ON dt.id = v.id
  WHERE v.submoduletype_code = ''CO''
    AND v.module_code = ''NMR''
    AND v.ma_status_code IN (''APR'', ''REJ'', ''SUSP'', ''CNCL'')
    AND v.ma_number::text !~~ ''%LD%''
    @dateFilter
),
classified AS (
  SELECT
    *,
    CASE
      WHEN is_sra = true
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE ma_status_code
      WHEN ''APR'' THEN ''Approved''
      WHEN ''REJ'' THEN ''Rejected''
      WHEN ''SUSP'' THEN ''Suspended''
      WHEN ''CNCL'' THEN ''Cancelled''
      ELSE regulatory_outcome
    END AS regulatory_outcome_clean,
    CASE WHEN UPPER(TRIM(COALESCE(ma_type_code, ''''))) = ''EUA'' THEN NULL ELSE ma_type_code END AS ma_type_clean,
    CASE
      WHEN decision_time_in_days < 0 THEN ''Invalid negative time''
      WHEN decision_time_in_days <= 30 THEN ''0-30 days''
      WHEN decision_time_in_days <= 90 THEN ''31-90 days''
      WHEN decision_time_in_days <= 180 THEN ''91-180 days''
      WHEN decision_time_in_days <= 270 THEN ''181-270 days''
      WHEN decision_time_in_days <= 540 THEN ''271-540 days''
      ELSE ''Over 540 days''
    END AS decision_band
  FROM base
),
overall AS (
  SELECT ROUND(AVG(decision_time_in_days)::numeric, 2) AS overall_avg_days
  FROM classified
  WHERE decision_time_in_days >= 0
),
categorized AS (
  SELECT /* Reliance SLA: 90 days */
    CASE WHEN x.category_name = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN 90 ELSE c.target_days END AS effective_target_days, c.decision_time_in_days, x.category_name, x.category_value
  FROM classified c
  CROSS JOIN LATERAL (
    VALUES
      (''Application type''::text, COALESCE(c.application_type_clean, c.application_type, ''Unspecified'')::text),
      (''Internal regulatory pathway''::text, CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN c.approval_pathway_clean::text END),
      (''Reliance pathway''::text, CASE WHEN c.pathway_group = ''Reliance pathway'' THEN c.approval_pathway_clean::text END),
      (''Regulatory outcome''::text, c.regulatory_outcome_clean::text),
      (''MA type''::text, COALESCE(c.ma_type_clean, c.ma_type_code, ''Unspecified'')::text),
      (''Decision time band''::text, c.decision_band::text)
  ) AS x(category_name, category_value)
  WHERE x.category_value IS NOT NULL AND c.decision_time_in_days >= 0
)
SELECT
  category_name,
  category_value,
  ''NMR''::text AS module_code,
  target_days,
  COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days <= effective_target_days) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS percentage,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS avg_decision_days,
  
  o.overall_avg_days,
  ROUND((AVG(decision_time_in_days) - o.overall_avg_days)::numeric, 2) AS gap_vs_overall_avg_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS max_decision_days,
  COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) AS extreme_outlier_count,
  ROUND((COUNT(*) FILTER (WHERE decision_time_in_days > effective_target_days * 2) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS extreme_outlier_pct
,
  ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days,
  ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days,
  ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days
FROM categorized
CROSS JOIN overall o
GROUP BY category_name, category_value, target_days, o.overall_avg_days
ORDER BY category_name, category_value;
' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 107 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''CO''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=117 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
base AS (
  SELECT
    a.*,
    f.publication_date,
    EXTRACT(EPOCH FROM (f.publication_date - a.approval_date)) / 86400.0 AS processing_time_in_day
  FROM approved_ma a
  LEFT JOIN first_approval_document_upload f ON f.ma_id = a.ma_id
)
SELECT module_code,''CO''::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 117 changed since preparation; aborting'; END IF;
END $alignment$;

DO $alignment$
BEGIN
  UPDATE kpi.kpi SET query='/* MA effective decision v2: agreed status-log dates; current outcomes retained. */
WITH effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN (''APR'',''REJ'',''SUSP'',''CNCL'')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code=''APR'') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN (''SUSP'',''CNCL'')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN (''APR'',''REJ'') AND COALESCE(from_status_code,'''') NOT IN (''SUSP'',''APR'',''REJ'')
 UNION ALL SELECT ma_id,first_susp_cncl,''APR'' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
),
effective_ma_source AS MATERIALIZED (SELECT id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 ), effective_report AS (
/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
),
approved_ma AS (
  SELECT
    v.id AS ma_id,
    v.ma_number,
    v.effective_decision_at AS approval_date,
    v.created_date,
    v.ma_type_code,
    v.ma_status_code,
    COALESCE(v.ma_status_display_name, v.ma_status_code) AS regulatory_outcome,
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM effective_ma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    AND decision_date IS NOT NULL
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code
) SELECT * FROM effective_report;', filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]', modified_date=NOW()
  WHERE id=113 AND query='/* MA face/drilldown alignment v1 */

WITH 
params AS (SELECT 60::int AS target_days),
approval_documents AS (
  SELECT md.id AS module_document_id
  FROM document.module_document md
  JOIN common.document_type dt ON dt.id = md.document_type_id
  WHERE dt.document_type_code IN (''PSA'', ''SPC'', ''LBL'', ''PIL'')
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
    COALESCE(v.application_type, ''UNSPECIFIED'') AS application_type,
    TRIM(COALESCE(v.approval_pathway, ''UNSPECIFIED'')) AS approval_pathway_norm,
    TRIM(COALESCE(v.approval_pathway_code, ''UNSPECIFIED'')) AS approval_pathway_code_norm,
    COALESCE(v.is_sra, false) AS is_sra,
    v.module_code AS module_code,
    v.submoduletype_code,
    p.target_days
  FROM license.vwma v
  CROSS JOIN params p
  WHERE v.submoduletype_code = ''CO''
    AND v.ma_status_code = ''APR''
    AND v.decision_date IS NOT NULL
    AND v.module_code IN (''NMR'', ''REN'', ''VAR'')
    AND v.ma_number::text !~~ ''%LD%''
    
    @dateFilter
),
first_approval_document_upload AS (
  SELECT a.ma_id, MIN(d.created_date) AS publication_date
  FROM approved_ma a
  JOIN document.document d ON d.reference_id::text = a.ma_id::text
  JOIN approval_documents ad ON ad.module_document_id = d.module_document_id
  WHERE d.created_date >= a.approval_date
  GROUP BY a.ma_id
),
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
        OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'')
        OR approval_pathway_norm ILIKE ''%reliance%''
        OR approval_pathway_code_norm ILIKE ''%REL%''
        OR approval_pathway_code_norm ILIKE ''%CRP%''
        OR approval_pathway_norm ILIKE ''%WHO Pre Qualified%''
      THEN ''Reliance pathway''
      ELSE ''Internal regulatory pathway''
    END AS pathway_group,
    CASE WHEN application_type = ''New Application - Emergency Use Authorization'' THEN NULL ELSE application_type END AS application_type_clean,
    CASE
      WHEN is_sra = true OR UPPER(approval_pathway_norm) IN (''SRA'', ''SRA''''S'', ''SRAS'') THEN ''SRA''''s''
      WHEN approval_pathway_norm = ''UNSPECIFIED'' THEN ''Regular''
      ELSE approval_pathway_norm
    END AS approval_pathway_clean,
    CASE
      WHEN publication_date IS NULL THEN ''Not published''
      WHEN processing_time_in_day < 0 THEN ''Invalid publication date''
      WHEN processing_time_in_day <= 7 THEN ''0-7 days''
      WHEN processing_time_in_day <= 14 THEN ''8-14 days''
      WHEN processing_time_in_day <= 30 THEN ''15-30 days''
      WHEN processing_time_in_day <= 60 THEN ''31-60 days''
      ELSE ''Over 60 days''
    END AS publication_band
  FROM base
), categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES (''Application type''::text, COALESCE(c.application_type_clean, ''Unspecified'')::text),
      (''Internal regulatory pathway'', CASE WHEN c.pathway_group = ''Internal regulatory pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Reliance pathway'', CASE WHEN c.pathway_group = ''Reliance pathway'' THEN COALESCE(c.approval_pathway_clean, ''Unspecified'') END),
      (''Regulatory outcome'', COALESCE(c.regulatory_outcome, c.ma_status_code, ''Unspecified'')),
      (''MA type'', COALESCE(c.ma_type_code, c.ma_type_code, ''Unspecified'')),
      (''Publication time band'', c.publication_band),
      (''Application module'', c.module_code)) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;' AND filter_columns='[{"Type":"DateRange","Alias":"","DType":{"id":"6","name":"DateRange"},"Title":"Decision date","FieldName":"dateFilter","IsInnerFilter":true,"ParameterName":"dateFilter","OverridingFieldName":"decision_date"}]';
  IF NOT FOUND THEN RAISE EXCEPTION 'Report 113 changed since preparation; aborting'; END IF;
END $alignment$;

COMMIT;