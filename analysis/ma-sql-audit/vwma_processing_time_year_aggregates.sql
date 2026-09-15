 WITH status_transitions AS (
         SELECT ls.ma_id,
            ls.from_status_code,
            ls.to_status_code,
            lag(ls.modified_date) OVER (PARTITION BY ls.ma_id ORDER BY ls.modified_date) AS status_start_date,
            ls.modified_date AS status_end_date
           FROM license.vwma_log_status_new ls
          WHERE ((ls.from_status_code IS NOT NULL) AND (ls.to_status_code IS NOT NULL))
        ), transition_durations AS (
         SELECT status_transitions.ma_id,
            status_transitions.from_status_code,
            status_transitions.to_status_code,
            status_transitions.status_start_date,
            status_transitions.status_end_date,
                CASE
                    WHEN (status_transitions.status_start_date IS NOT NULL) THEN (date_part('epoch'::text, (status_transitions.status_end_date - status_transitions.status_start_date)) / (86400)::double precision)
                    ELSE (0)::double precision
                END AS duration_days
           FROM status_transitions
          WHERE (status_transitions.status_start_date IS NOT NULL)
        ), aggregated_transitions AS (
         SELECT transition_durations.ma_id,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'RTA'::text) AND (transition_durations.to_status_code = 'RTAR'::text))), (0)::double precision) AS rta_to_rtar_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'FIR'::text) AND (transition_durations.to_status_code = 'FIRR'::text))), (0)::double precision) AS fir_to_firr_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'FIRR'::text) AND (transition_durations.to_status_code = 'STL'::text))), (0)::double precision) AS firr_to_stl_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'RTAS'::text) AND (transition_durations.to_status_code = 'STL'::text))), (0)::double precision) AS rtas_to_stl_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'FIR'::text))), (0)::double precision) AS stl_to_fir_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'SFA'::text))), (0)::double precision) AS stl_to_sfa_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'SFR'::text))), (0)::double precision) AS stl_to_sfr_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'RTAS'::text))), (0)::double precision) AS stl_to_rtas_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'FIR'::text))), (0)::double precision) AS rtl_to_fir_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'SFA'::text))), (0)::double precision) AS rtl_to_sfa_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'SFR'::text))), (0)::double precision) AS rtl_to_sfr_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'RTAS'::text))), (0)::double precision) AS rtl_to_rtas_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'APR'::text))), (0)::double precision) AS sfa_to_apr_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'RTL'::text))), (0)::double precision) AS sfa_to_rtl_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'FIR'::text))), (0)::double precision) AS sfa_to_fir_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'REJ'::text))), (0)::double precision) AS sfr_to_rej_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'RTL'::text))), (0)::double precision) AS sfr_to_rtl_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'FIR'::text))), (0)::double precision) AS sfr_to_fir_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'APR'::text) AND (transition_durations.to_status_code = 'VOID'::text))), (0)::double precision) AS apr_to_void_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'REJ'::text) AND (transition_durations.to_status_code = 'VOID'::text))), (0)::double precision) AS rej_to_void_days,
            COALESCE(sum(transition_durations.duration_days) FILTER (WHERE ((transition_durations.from_status_code = 'VOID'::text) AND (transition_durations.to_status_code = 'RTL'::text))), (0)::double precision) AS void_to_rtl_days
           FROM transition_durations
          GROUP BY transition_durations.ma_id
        ), first_cso_assignment AS (
         SELECT maa.ma_id,
            min(maa.created_date) AS first_cso_assigned_date
           FROM (license.ma_assignment maa
             JOIN common.responder_type rt ON ((maa.responder_type_id = rt.id)))
          WHERE ((rt.responder_type_code)::text = 'PRSC'::text)
          GROUP BY maa.ma_id
        ), status_timestamps AS (
         SELECT ls.ma_id,
            COALESCE(min(
                CASE
                    WHEN (ls.to_status_code = 'RQST'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END), max(ma.created_date)) AS rqst_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'VER'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS verified_date,
            min(
                CASE
                    WHEN (ls.to_status_code = 'STL'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS first_stl_date
           FROM (license.vwma_log_status_new ls
             JOIN license.ma ma ON ((ls.ma_id = ma.id)))
          GROUP BY ls.ma_id
        ), primary_secondary_assignments AS (
         SELECT maa.ma_id,
            min(
                CASE
                    WHEN ((rt.responder_type_code)::text = 'PRAS'::text) THEN maa.created_date
                    ELSE NULL::timestamp without time zone
                END) AS first_primary_assigned,
            min(
                CASE
                    WHEN ((rt.responder_type_code)::text = 'SCAS'::text) THEN maa.created_date
                    ELSE NULL::timestamp without time zone
                END) AS first_secondary_assigned
           FROM (license.ma_assignment maa
             JOIN common.responder_type rt ON ((maa.responder_type_id = rt.id)))
          WHERE ((rt.responder_type_code)::text = ANY (ARRAY[('PRAS'::character varying)::text, ('SCAS'::character varying)::text]))
          GROUP BY maa.ma_id
        ), base_ma_data AS (
         SELECT DISTINCT ma.id,
            ma.ma_number,
            (date_part('year'::text, vwma.submission_date))::integer AS submission_year,
            subt.submodule_type_code,
            mod.module_code,
            ma.ma_status_id,
                CASE
                    WHEN ((subt.submodule_type_code)::text = 'MDCN'::text) THEN
                    CASE
                        WHEN (app.approval_pathway_code IS NOT NULL) THEN app.approval_pathway_code
                        WHEN (ma.is_sra = true) THEN 'SRA'::character varying
                        ELSE 'NSRA'::character varying
                    END
                    ELSE COALESCE(app.approval_pathway_code, 'N/A'::character varying)
                END AS approval_pathway_code,
            ma.is_sra
           FROM ((((((license.ma ma
             JOIN license.vwma vwma ON ((vwma.id = ma.id)))
             JOIN common.ma_type mat ON ((ma.ma_type_id = mat.id)))
             JOIN common.submodule_type subt ON ((mat.submodule_type_id = subt.id)))
             JOIN common.submodule sb ON ((mat.ma_type_code = sb.submodule_code)))
             JOIN common.module mod ON ((sb.module_id = mod.id)))
             LEFT JOIN common.approval_pathway app ON ((ma.approval_pathway_id = app.id)))
        ), calculated_times AS (
         SELECT bmd.id,
            bmd.ma_number,
            bmd.submission_year,
            bmd.submodule_type_code,
            bmd.module_code,
            bmd.approval_pathway_code,
            bmd.is_sra,
            COALESCE((date_part('epoch'::text, (fca.first_cso_assigned_date - st.rqst_date)) / (86400)::double precision), (0)::double precision) AS screener_assignment_days,
            COALESCE((
                CASE
                    WHEN ((fca.first_cso_assigned_date IS NOT NULL) AND (st.verified_date IS NOT NULL)) THEN (date_part('epoch'::text, (st.verified_date - fca.first_cso_assigned_date)) / (86400)::double precision)
                    ELSE (0)::double precision
                END - COALESCE(at.rta_to_rtar_days, (0)::double precision)), (0)::double precision) AS screening_days,
            COALESCE(at.rta_to_rtar_days, (0)::double precision) AS applicant_response_screening_days,
            COALESCE(
                CASE
                    WHEN ((st.verified_date IS NOT NULL) AND (LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) IS NOT NULL)) THEN (date_part('epoch'::text, (LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) - st.verified_date)) / (86400)::double precision)
                    ELSE (0)::double precision
                END, (0)::double precision) AS assessor_assignment_days,
            COALESCE(((
                CASE
                    WHEN ((LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) IS NOT NULL) AND (st.first_stl_date IS NOT NULL)) THEN (date_part('epoch'::text, (st.first_stl_date - LEAST(psa.first_primary_assigned, psa.first_secondary_assigned))) / (86400)::double precision)
                    ELSE (0)::double precision
                END + COALESCE(at.firr_to_stl_days, (0)::double precision)) + COALESCE(at.rtas_to_stl_days, (0)::double precision)), (0)::double precision) AS assessment_days,
            COALESCE((((((((COALESCE(at.stl_to_fir_days, (0)::double precision) + COALESCE(at.stl_to_sfa_days, (0)::double precision)) + COALESCE(at.stl_to_sfr_days, (0)::double precision)) + COALESCE(at.rtl_to_fir_days, (0)::double precision)) + COALESCE(at.rtl_to_sfa_days, (0)::double precision)) + COALESCE(at.rtl_to_sfr_days, (0)::double precision)) + COALESCE(at.stl_to_rtas_days, (0)::double precision)) + COALESCE(at.rtl_to_rtas_days, (0)::double precision)), (0)::double precision) AS teamleader_decision_days,
            COALESCE(at.fir_to_firr_days, (0)::double precision) AS applicant_response_fir_days,
            COALESCE(((((((((COALESCE(at.sfa_to_apr_days, (0)::double precision) + COALESCE(at.sfa_to_rtl_days, (0)::double precision)) + COALESCE(at.sfa_to_fir_days, (0)::double precision)) + COALESCE(at.sfr_to_rej_days, (0)::double precision)) + COALESCE(at.sfr_to_rtl_days, (0)::double precision)) + COALESCE(at.sfr_to_fir_days, (0)::double precision)) + COALESCE(at.apr_to_void_days, (0)::double precision)) + COALESCE(at.rej_to_void_days, (0)::double precision)) + COALESCE(at.void_to_rtl_days, (0)::double precision)), (0)::double precision) AS leo_final_decision_days
           FROM (((((base_ma_data bmd
             LEFT JOIN first_cso_assignment fca ON ((bmd.id = fca.ma_id)))
             LEFT JOIN status_timestamps st ON ((bmd.id = st.ma_id)))
             LEFT JOIN primary_secondary_assignments psa ON ((bmd.id = psa.ma_id)))
             LEFT JOIN aggregated_transitions at ON ((bmd.id = at.ma_id)))
             JOIN common.ma_status mas ON ((bmd.ma_status_id = mas.id)))
          WHERE (mas.ma_status_code <> ALL (ARRAY['DEL'::text, 'WITH'::text, 'VOID'::text]))
        ), processing_times_with_totals AS (
         SELECT calculated_times.id,
            calculated_times.ma_number,
            calculated_times.submission_year,
            calculated_times.submodule_type_code,
            calculated_times.module_code,
            calculated_times.approval_pathway_code,
            calculated_times.is_sra,
            calculated_times.screener_assignment_days,
            calculated_times.screening_days,
            calculated_times.applicant_response_screening_days,
            calculated_times.assessor_assignment_days,
            calculated_times.assessment_days,
            calculated_times.teamleader_decision_days,
            calculated_times.applicant_response_fir_days,
            calculated_times.leo_final_decision_days,
            (((((((COALESCE(calculated_times.screener_assignment_days, (0)::double precision) + COALESCE(calculated_times.screening_days, (0)::double precision)) + COALESCE(calculated_times.applicant_response_screening_days, (0)::double precision)) + COALESCE(calculated_times.assessor_assignment_days, (0)::double precision)) + COALESCE(calculated_times.assessment_days, (0)::double precision)) + COALESCE(calculated_times.teamleader_decision_days, (0)::double precision)) + COALESCE(calculated_times.applicant_response_fir_days, (0)::double precision)) + COALESCE(calculated_times.leo_final_decision_days, (0)::double precision)) AS total_processing_time_days
           FROM calculated_times
        )
 SELECT 0 AS id,
    true AS is_active,
    newid() AS rowguid,
    now() AS created_date,
    now() AS modified_date,
    'Submission Year + Submodule Type Aggregation'::text AS aggregation_type,
    processing_times_with_totals.submission_year,
    processing_times_with_totals.submodule_type_code,
    NULL::text AS approval_pathway_code,
    NULL::text AS module_code,
    count(*) AS total_records,
    round((avg(processing_times_with_totals.screener_assignment_days))::numeric, 2) AS avg_screener_assignment_days,
    round((avg(processing_times_with_totals.screening_days))::numeric, 2) AS avg_screening_days,
    round((avg(processing_times_with_totals.applicant_response_screening_days))::numeric, 2) AS avg_applicant_response_screening_days,
    round((avg(processing_times_with_totals.assessor_assignment_days))::numeric, 2) AS avg_assessor_assignment_days,
    round((avg(processing_times_with_totals.assessment_days))::numeric, 2) AS avg_assessment_days,
    round((avg(processing_times_with_totals.teamleader_decision_days))::numeric, 2) AS avg_teamleader_decision_days,
    round((avg(processing_times_with_totals.applicant_response_fir_days))::numeric, 2) AS avg_applicant_response_fir_days,
    round((avg(processing_times_with_totals.leo_final_decision_days))::numeric, 2) AS avg_leo_final_decision_days,
    round((avg(processing_times_with_totals.total_processing_time_days))::numeric, 2) AS avg_total_processing_time_days
   FROM processing_times_with_totals
  GROUP BY processing_times_with_totals.submission_year, processing_times_with_totals.submodule_type_code
UNION ALL
 SELECT 0 AS id,
    true AS is_active,
    newid() AS rowguid,
    now() AS created_date,
    now() AS modified_date,
    'Submission Year + Approval Pathway Aggregation'::text AS aggregation_type,
    processing_times_with_totals.submission_year,
    processing_times_with_totals.submodule_type_code,
    processing_times_with_totals.approval_pathway_code,
    NULL::text AS module_code,
    count(*) AS total_records,
    round((avg(processing_times_with_totals.screener_assignment_days))::numeric, 2) AS avg_screener_assignment_days,
    round((avg(processing_times_with_totals.screening_days))::numeric, 2) AS avg_screening_days,
    round((avg(processing_times_with_totals.applicant_response_screening_days))::numeric, 2) AS avg_applicant_response_screening_days,
    round((avg(processing_times_with_totals.assessor_assignment_days))::numeric, 2) AS avg_assessor_assignment_days,
    round((avg(processing_times_with_totals.assessment_days))::numeric, 2) AS avg_assessment_days,
    round((avg(processing_times_with_totals.teamleader_decision_days))::numeric, 2) AS avg_teamleader_decision_days,
    round((avg(processing_times_with_totals.applicant_response_fir_days))::numeric, 2) AS avg_applicant_response_fir_days,
    round((avg(processing_times_with_totals.leo_final_decision_days))::numeric, 2) AS avg_leo_final_decision_days,
    round((avg(processing_times_with_totals.total_processing_time_days))::numeric, 2) AS avg_total_processing_time_days
   FROM processing_times_with_totals
  GROUP BY processing_times_with_totals.submission_year, processing_times_with_totals.submodule_type_code, processing_times_with_totals.approval_pathway_code
UNION ALL
 SELECT 0 AS id,
    true AS is_active,
    newid() AS rowguid,
    now() AS created_date,
    now() AS modified_date,
    'Submission Year + Module Aggregation'::text AS aggregation_type,
    processing_times_with_totals.submission_year,
    processing_times_with_totals.submodule_type_code,
    NULL::text AS approval_pathway_code,
    processing_times_with_totals.module_code,
    count(*) AS total_records,
    round((avg(processing_times_with_totals.screener_assignment_days))::numeric, 2) AS avg_screener_assignment_days,
    round((avg(processing_times_with_totals.screening_days))::numeric, 2) AS avg_screening_days,
    round((avg(processing_times_with_totals.applicant_response_screening_days))::numeric, 2) AS avg_applicant_response_screening_days,
    round((avg(processing_times_with_totals.assessor_assignment_days))::numeric, 2) AS avg_assessor_assignment_days,
    round((avg(processing_times_with_totals.assessment_days))::numeric, 2) AS avg_assessment_days,
    round((avg(processing_times_with_totals.teamleader_decision_days))::numeric, 2) AS avg_teamleader_decision_days,
    round((avg(processing_times_with_totals.applicant_response_fir_days))::numeric, 2) AS avg_applicant_response_fir_days,
    round((avg(processing_times_with_totals.leo_final_decision_days))::numeric, 2) AS avg_leo_final_decision_days,
    round((avg(processing_times_with_totals.total_processing_time_days))::numeric, 2) AS avg_total_processing_time_days
   FROM processing_times_with_totals
  GROUP BY processing_times_with_totals.submission_year, processing_times_with_totals.submodule_type_code, processing_times_with_totals.module_code
  ORDER BY 6, 7, 8, 10;