 SELECT ma.id,
    ma.branch_id,
    br.name AS branch_name,
    ma.agent_id,
    ma.created_by_user_id,
    ma.created_date,
    ma.expiry_date,
    ma.is_active,
    ma.is_sra,
    ma.ma_number,
    ma.ma_status_id,
    ma.ma_type_id,
    ma.modified_by_user_id,
    ma.modified_date,
    ma.registration_date,
    ma.rowguid,
    ma.supplier_id,
    ma.sra,
    ma.original_ma_id,
    ma.verification_number,
    ma.is_premarket_lab_request,
    ma.is_notification_type,
    ma.remark,
    ma.certificate_number,
    ma.is_legacy_updated,
    ma.is_food_notification,
    ma.is_food_type,
    ma.approval_pathway_id,
    ma.receipt_number,
    ma.supplier_lookup_id,
    sl.name AS supplier_lookup_name,
    ag.name AS agent_name,
    sup.name AS supplier_name,
    mas.name AS ma_status,
    mas.priority AS ma_status_priority,
    mas.display_name AS ma_status_display_name,
    mas.ma_status_code,
    mat.name AS ma_type,
    mat.ma_type_code,
    ((m.name || ' - '::text) || s.name) AS application_type,
    date_part('day'::text, (now() - (ma.expiry_date)::timestamp with time zone)) AS expiry_days,
    ft.is_fast_tracking,
    ms."PRSC" AS prescreener_user_id,
    ms."PRAS" AS primary_assessor_user_id,
    ms."SCAS" AS secondary_assessor_user_id,
    ms."CPRAS" AS clinical_primary_assessor_user_id,
    ms."CSCAS" AS clinical_secondary_assessor_user_id,
    ms."QPRAS" AS quality_primary_assessor_user_id,
    ms."QSCAS" AS quality_secondary_assessor_user_id,
    md."PRSC" AS prescreener_due_date,
    md."PRAS" AS primary_assessor_due_date,
    md."SCAS" AS secondary_assessor_due_date,
    md."CPRAS" AS clinical_primary_assessor_due_date,
    md."CSCAS" AS clinical_secondary_assessor_due_date,
    md."QPRAS" AS quality_primary_assessor_due_date,
    md."QSCAS" AS quality_secondary_assessor_due_date,
    ((prcus.first_name || ' '::text) || prcus.last_name) AS prescreener,
    ((praus.first_name || ' '::text) || praus.last_name) AS primary_assessor,
    ((scaus.first_name || ' '::text) || scaus.last_name) AS secondary_assessor,
    ((qpraus.first_name || ' '::text) || qpraus.last_name) AS quality_primary_assessor,
    ((qscaus.first_name || ' '::text) || qscaus.last_name) AS quality_secondary_assessor,
    ((cpraus.first_name || ' '::text) || cpraus.last_name) AS clinical_primary_assessor,
    ((cscaus.first_name || ' '::text) || cscaus.last_name) AS clinical_secondary_assessor,
    mr.is_primary_assessed,
    mr.is_secondary_assessed,
    mr.is_primary_clinical_assessed,
    mr.is_secondary_clinical_assessed,
    mr.is_primary_quality_assessed,
    mr.is_secondary_quality_assessed,
    prt.submission_date,
    prt.prescreened_date,
    prt.decision_date,
    prt.processing_time_in_day,
    false AS is_lab_requested,
    false AS is_lab_result_uploaded,
    false AS is_clinical_review_uploaded,
    prd.id AS product_id,
    prd.full_item_name,
    prd.brand_name,
    prd.generic_name,
    fir.fir_replied_date,
    false AS is_gmp_result_uploaded,
    false AS is_gmp_result_requested,
    ap.name AS approval_pathway,
    ap.approval_pathway_code,
    COALESCE(maf.is_active, false) AS is_fir_extension_requested,
    (((('-1'::integer * ( SELECT (system_setting.value)::integer AS value
           FROM settings.system_setting
          WHERE (system_setting.system_setting_code = 'MANET'::text))))::double precision < date_part('day'::text, (now() - (ma.expiry_date)::timestamp with time zone))) AND (date_part('day'::text, (now() - (ma.expiry_date)::timestamp with time zone)) < (0)::double precision)) AS is_near_expiry,
    sut.submodule_type_code AS submoduletype_code,
    ma.is_new_application,
    m.module_code,
    ma.registration_number,
    (mas.ma_status_code = ANY (ARRAY['ASD'::text, 'FATCH'::text, 'FIRR'::text, 'FIR'::text, 'PRSC'::text, 'RQST'::text, 'RTA'::text, 'RTAS'::text, 'RTL'::text, 'RTAR'::text, 'SFA'::text, 'SFIR'::text, 'SFR'::text, 'STL'::text, 'VER'::text, 'VOID'::text, 'WITH'::text])) AS is_pending,
    (mas.ma_status_code = ANY (ARRAY['APR'::text, 'ARCH'::text, 'REJ'::text, 'SUSP'::text, 'CNCL'::text])) AS is_finished
   FROM (((((((((((((((((((((((((license.ma ma
     JOIN customer.agent ag ON ((ma.agent_id = ag.id)))
     LEFT JOIN common.branch br ON ((br.id = ma.branch_id)))
     JOIN customer.supplier sup ON ((ma.supplier_id = sup.id)))
     JOIN common.ma_status mas ON ((ma.ma_status_id = mas.id)))
     JOIN common.ma_type mat ON ((ma.ma_type_id = mat.id)))
     JOIN common.submodule_type sut ON ((mat.submodule_type_id = sut.id)))
     LEFT JOIN agency.supplier_lookup sl ON ((sl.id = ma.supplier_lookup_id)))
     LEFT JOIN common.submodule s ON ((mat.ma_type_code = s.submodule_code)))
     LEFT JOIN common.module m ON ((s.module_id = m.id)))
     LEFT JOIN common.approval_pathway ap ON ((ma.approval_pathway_id = ap.id)))
     LEFT JOIN ( SELECT vwproduct.id,
            vwproduct.created_date,
            vwproduct.is_active,
            vwproduct.modified_date,
            vwproduct.product_id,
            vwproduct.rowguid,
            vwproduct.supplier_id,
            vwproduct.agent_id,
            vwproduct.expiry_date,
            vwproduct.registration_date,
            vwproduct.supplier_name,
            vwproduct.agent_name,
            vwproduct.brand_name,
            vwproduct.generic_name,
            vwproduct.dosage_strength,
            vwproduct.dosage_unit,
            vwproduct.dosage_form,
            vwproduct.full_item_name,
            vwproduct.shelf_life,
            vwproduct.presentation,
            vwproduct.manufacturer_name,
            vwproduct.ma_id,
            vwproduct.ma_number,
            vwproduct.ma_status_display_name,
            vwproduct.ma_status,
            vwproduct.ma_status_code,
            vwproduct.submodule_type_code,
            vwproduct.product_type_code,
            vwproduct.device_class_name,
            vwproduct.device_class_id,
            vwproduct.md_grouping_name,
            vwproduct.md_grouping_id,
            vwproduct.classification_rule_name,
            vwproduct.classification_rule_id,
            vwproduct.use_period,
            vwproduct.is_edited,
            vwproduct.is_renewed,
            vwproduct.description
           FROM commodity.vwproduct
          WHERE (vwproduct.product_id IN ( SELECT min(vwproduct_1.product_id) AS min
                   FROM commodity.vwproduct vwproduct_1
                  GROUP BY vwproduct_1.ma_id))) prd ON ((ma.id = prd.ma_id)))
     LEFT JOIN license.vwma_processing_time prt ON ((ma.id = prt.id)))
     LEFT JOIN ( SELECT sp.ma_id,
                CASE
                    WHEN (count(DISTINCT ft_1.inn_id) > 0) THEN true
                    ELSE false
                END AS is_fast_tracking
           FROM (( SELECT DISTINCT spr.ma_id,
                    p.inn_id
                   FROM (commodity.supplier_product spr
                     JOIN commodity.product p ON ((spr.product_id = p.id)))
                  WHERE (spr.ma_id IS NOT NULL)) sp
             LEFT JOIN commodity.fast_tracking_item ft_1 ON ((sp.inn_id = ft_1.inn_id)))
          WHERE (ft_1.is_active = true)
          GROUP BY sp.ma_id) ft ON ((ma.id = ft.ma_id)))
     LEFT JOIN ( SELECT ct.ma_id,
            ct."PRSC",
            ct."PRAS",
            ct."SCAS",
            ct."CPRAS",
            ct."CSCAS",
            ct."QPRAS",
            ct."QSCAS"
           FROM crosstab('
		select ma_id, rt.responder_type_code, assigned_to_user_id from license.ma_assignment mas
		join common.responder_type rt on mas.responder_type_id = rt.id
		where mas.is_active = true
		order by 1,2
		'::text, 'VALUES(''PRSC''),(''PRAS''),(''SCAS''),(''QPRAS''),(''QSCAS''),(''CPRAS''),(''CSCAS'')'::text) ct(ma_id integer, "PRSC" integer, "PRAS" integer, "SCAS" integer, "QPRAS" integer, "QSCAS" integer, "CPRAS" integer, "CSCAS" integer)) ms ON ((ma.id = ms.ma_id)))
     LEFT JOIN ( SELECT ct.ma_id,
            ct."PRSC",
            ct."PRAS",
            ct."SCAS",
            ct."QPRAS",
            ct."QSCAS",
            ct."CPRAS",
            ct."CSCAS"
           FROM crosstab('
		select ma_id, rt.responder_type_code, due_date from license.ma_assignment mas
		join common.responder_type rt on mas.responder_type_id = rt.id
		where mas.is_active = true
		order by 1,2
		'::text, 'VALUES(''PRSC''),(''PRAS''),(''SCAS''),(''CPRAS''),(''CSCAS''),(''QPRAS''),(''QSCAS'')'::text) ct(ma_id integer, "PRSC" timestamp without time zone, "PRAS" timestamp without time zone, "SCAS" timestamp without time zone, "CPRAS" timestamp without time zone, "CSCAS" timestamp without time zone, "QPRAS" timestamp without time zone, "QSCAS" timestamp without time zone)) md ON ((ma.id = md.ma_id)))
     LEFT JOIN ( SELECT ct.ma_id,
                CASE
                    WHEN (ct."PRAS" IS NULL) THEN false
                    ELSE true
                END AS is_primary_assessed,
                CASE
                    WHEN (ct."SCAS" IS NULL) THEN false
                    ELSE true
                END AS is_secondary_assessed,
                CASE
                    WHEN (ct."CPRAS" IS NULL) THEN false
                    ELSE true
                END AS is_primary_clinical_assessed,
                CASE
                    WHEN (ct."CSCAS" IS NULL) THEN false
                    ELSE true
                END AS is_secondary_clinical_assessed,
                CASE
                    WHEN (ct."QPRAS" IS NULL) THEN false
                    ELSE true
                END AS is_primary_quality_assessed,
                CASE
                    WHEN (ct."QSCAS" IS NULL) THEN false
                    ELSE true
                END AS is_secondary_quality_assessed
           FROM crosstab('
		select ma_id, rt.responder_type_code, responder_id
		from license.ma_review mar
		join common.responder_type rt on mar.responder_type_id = rt.id
		join license.ma m on mar.ma_id = m.ID
		join common.ma_status mas on m.ma_status_id = mas.id
		where mar.is_active = true and mar.is_draft = false
		order by 1,2
		'::text, 'VALUES (''PRAS''),(''SCAS''),(''QPRAS''),(''QSCAS''),(''CPRAS''),(''CSCAS'')'::text) ct(ma_id integer, "PRAS" integer, "SCAS" integer, "QPRAS" integer, "QSCAS" integer, "CPRAS" integer, "CSCAS" integer)) mr ON ((ma.id = mr.ma_id)))
     LEFT JOIN ( SELECT vwma_log_status.ma_id,
            max(vwma_log_status.created_date) AS fir_replied_date
           FROM license.vwma_log_status
          WHERE (vwma_log_status.to_status_code = 'FIRR'::text)
          GROUP BY vwma_log_status.ma_id) fir ON ((ma.id = fir.ma_id)))
     LEFT JOIN account."user" prcus ON ((ms."PRSC" = prcus.id)))
     LEFT JOIN account."user" praus ON ((ms."PRAS" = praus.id)))
     LEFT JOIN account."user" scaus ON ((ms."SCAS" = scaus.id)))
     LEFT JOIN account."user" qpraus ON ((ms."QPRAS" = qpraus.id)))
     LEFT JOIN account."user" qscaus ON ((ms."QSCAS" = qscaus.id)))
     LEFT JOIN account."user" cpraus ON ((ms."CPRAS" = cpraus.id)))
     LEFT JOIN account."user" cscaus ON ((ms."CSCAS" = cscaus.id)))
     LEFT JOIN ( SELECT ma_fir_extension_log.ma_id,
            ma_fir_extension_log.is_active
           FROM license.ma_fir_extension_log
          WHERE (ma_fir_extension_log.is_active = true)) maf ON ((maf.ma_id = ma.id)));