 WITH status_transitions AS (
         SELECT ls.ma_id,
            ls.from_status_code,
            ls.to_status_code,
            lag(ls.modified_date) OVER (PARTITION BY ls.ma_id ORDER BY ls.modified_date) AS status_start_date,
            ls.modified_date AS status_end_date,
            row_number() OVER (PARTITION BY ls.ma_id, ls.from_status_code, ls.to_status_code ORDER BY ls.modified_date) AS occurrence_order,
            ls.created_date
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
                END AS duration_days,
                CASE
                    WHEN (status_transitions.status_start_date IS NOT NULL) THEN (date_part('epoch'::text, (status_transitions.status_end_date - status_transitions.status_start_date)) / (60)::double precision)
                    ELSE (0)::double precision
                END AS duration_minutes,
            status_transitions.created_date
           FROM status_transitions
        ), aggregated_transitions AS (
         SELECT transition_durations.ma_id,
            max(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RQST'::text) AND (transition_durations.to_status_code = 'RTA'::text)) THEN transition_durations.created_date
                    ELSE NULL::timestamp without time zone
                END) AS rqst_to_rta_date,
            max(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RQST'::text) AND (transition_durations.to_status_code = 'VER'::text)) THEN transition_durations.created_date
                    ELSE NULL::timestamp without time zone
                END) AS rqst_to_ver_date,
            max(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RQST'::text) AND (transition_durations.to_status_code = 'PRSC'::text)) THEN transition_durations.created_date
                    ELSE NULL::timestamp without time zone
                END) AS rqst_to_prsc_date,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAR'::text) AND (transition_durations.to_status_code = 'VER'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtar_to_ver_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAR'::text) AND (transition_durations.to_status_code = 'VER'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtar_to_ver_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAR'::text) AND (transition_durations.to_status_code = 'PRSC'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtar_to_prsc_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAR'::text) AND (transition_durations.to_status_code = 'PRSC'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtar_to_prsc_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAR'::text) AND (transition_durations.to_status_code = 'RTA'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtar_to_rta_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAR'::text) AND (transition_durations.to_status_code = 'RTA'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtar_to_rta_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FATCH'::text) AND (transition_durations.to_status_code = 'VER'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS fatch_to_ver_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FATCH'::text) AND (transition_durations.to_status_code = 'VER'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS fatch_to_ver_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FATCH'::text) AND (transition_durations.to_status_code = 'RTA'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS fatch_to_rta_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FATCH'::text) AND (transition_durations.to_status_code = 'RTA'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS fatch_to_rta_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'PRSC'::text) AND (transition_durations.to_status_code = 'RTA'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS prsc_to_rta_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'PRSC'::text) AND (transition_durations.to_status_code = 'RTA'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS prsc_to_rta_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTA'::text) AND (transition_durations.to_status_code = 'RTAR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rta_to_rtar_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTA'::text) AND (transition_durations.to_status_code = 'RTAR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rta_to_rtar_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'PRSC'::text) AND (transition_durations.to_status_code = 'FATCH'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS prsc_to_fatch_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'PRSC'::text) AND (transition_durations.to_status_code = 'FATCH'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS prsc_to_fatch_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FATCH'::text) AND (transition_durations.to_status_code = 'PRSC'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS fatch_to_prsc_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FATCH'::text) AND (transition_durations.to_status_code = 'PRSC'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS fatch_to_prsc_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FIR'::text) AND (transition_durations.to_status_code = 'FIRR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS fir_to_firr_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FIR'::text) AND (transition_durations.to_status_code = 'FIRR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS fir_to_firr_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'ASD'::text) AND (transition_durations.to_status_code = 'STL'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS asd_to_stl_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'ASD'::text) AND (transition_durations.to_status_code = 'STL'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS asd_to_stl_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FIRR'::text) AND (transition_durations.to_status_code = 'STL'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS firr_to_stl_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'FIRR'::text) AND (transition_durations.to_status_code = 'STL'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS firr_to_stl_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAS'::text) AND (transition_durations.to_status_code = 'STL'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtas_to_stl_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTAS'::text) AND (transition_durations.to_status_code = 'STL'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtas_to_stl_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS stl_to_fir_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS stl_to_fir_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'SFA'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS stl_to_sfa_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'SFA'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS stl_to_sfa_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'SFR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS stl_to_sfr_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'SFR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS stl_to_sfr_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'RTAS'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS stl_to_rtas_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'STL'::text) AND (transition_durations.to_status_code = 'RTAS'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS stl_to_rtas_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtl_to_fir_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtl_to_fir_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'SFA'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtl_to_sfa_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'SFA'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtl_to_sfa_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'SFR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtl_to_sfr_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'SFR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtl_to_sfr_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'RTAS'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rtl_to_rtas_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'RTL'::text) AND (transition_durations.to_status_code = 'RTAS'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rtl_to_rtas_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'APR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS sfa_to_apr_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'APR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS sfa_to_apr_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'RTL'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS sfa_to_rtl_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'RTL'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS sfa_to_rtl_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS sfa_to_fir_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFA'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS sfa_to_fir_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'REJ'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS sfr_to_rej_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'REJ'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS sfr_to_rej_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'RTL'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS sfr_to_rtl_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'RTL'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS sfr_to_rtl_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS sfr_to_fir_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'SFR'::text) AND (transition_durations.to_status_code = 'FIR'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS sfr_to_fir_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'APR'::text) AND (transition_durations.to_status_code = 'VOID'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS apr_to_void_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'APR'::text) AND (transition_durations.to_status_code = 'VOID'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS apr_to_void_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'REJ'::text) AND (transition_durations.to_status_code = 'VOID'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS rej_to_void_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'REJ'::text) AND (transition_durations.to_status_code = 'VOID'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS rej_to_void_minutes,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'VOID'::text) AND (transition_durations.to_status_code = 'RTL'::text)) THEN transition_durations.duration_days
                    ELSE (0)::double precision
                END) AS void_to_rtl_days,
            sum(
                CASE
                    WHEN ((transition_durations.from_status_code = 'VOID'::text) AND (transition_durations.to_status_code = 'RTL'::text)) THEN transition_durations.duration_minutes
                    ELSE (0)::double precision
                END) AS void_to_rtl_minutes
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
            max(ma.created_date) AS rqst_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'RQST'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS max_rqst_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'VER'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS verified_date,
            min(
                CASE
                    WHEN (ls.to_status_code = 'VER'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS min_verified_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'RTA'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS rta_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'RTAR'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS rtar_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'FIR'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS fir_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'FIRR'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS firr_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'STL'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS stl_date,
            min(
                CASE
                    WHEN (ls.to_status_code = 'STL'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS first_stl_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'RTAS'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS rtas_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'ASD'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS asd_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'SFA'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS sfa_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'SFR'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS sfr_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'RTL'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS rtl_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'REJ'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS rej_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'ARR'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS arr_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'APR'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS apr_date,
            max(
                CASE
                    WHEN (ls.to_status_code = 'VOID'::text) THEN ls.modified_date
                    ELSE NULL::timestamp without time zone
                END) AS void_date
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
        ), calculated_times AS (
         SELECT ma.id,
            ma.ma_number,
            ma.rowguid,
            ma.created_date,
            ma.modified_date,
            ma.is_active,
            subt.submodule_type_code,
            mas.ma_status_code,
            (date_part('epoch'::text, (fca.first_cso_assigned_date - st.rqst_date)) / (86400)::double precision) AS screener_assignment_days,
            (date_part('epoch'::text, (fca.first_cso_assigned_date - st.rqst_date)) / (60)::double precision) AS screener_assignment_minutes,
            COALESCE((((((((((COALESCE((date_part('epoch'::text, (at.rqst_to_rta_date - fca.first_cso_assigned_date)) / (86400)::double precision), (0)::double precision) + COALESCE((date_part('epoch'::text, (at.rqst_to_ver_date - fca.first_cso_assigned_date)) / (86400)::double precision), (0)::double precision)) + COALESCE((date_part('epoch'::text, (at.rqst_to_prsc_date - fca.first_cso_assigned_date)) / (86400)::double precision), (0)::double precision)) + COALESCE(at.rtar_to_ver_days, (0)::double precision)) + COALESCE(at.rtar_to_prsc_days, (0)::double precision)) + COALESCE(at.rtar_to_rta_days, (0)::double precision)) + COALESCE(at.fatch_to_ver_days, (0)::double precision)) + COALESCE(at.fatch_to_rta_days, (0)::double precision)) + COALESCE(at.prsc_to_rta_days, (0)::double precision)) + COALESCE(at.fatch_to_prsc_days, (0)::double precision)), (0)::double precision) AS screening_days,
            COALESCE(COALESCE(((((((COALESCE(at.rtar_to_ver_minutes, (0)::double precision) + COALESCE(at.rtar_to_prsc_minutes, (0)::double precision)) + COALESCE(at.rtar_to_rta_minutes, (0)::double precision)) + COALESCE(at.fatch_to_ver_minutes, (0)::double precision)) + COALESCE(at.fatch_to_rta_minutes, (0)::double precision)) + COALESCE(at.prsc_to_rta_minutes, (0)::double precision)) + COALESCE(at.fatch_to_prsc_minutes, (0)::double precision)), (0)::double precision), (0)::double precision) AS screening_minutes,
            COALESCE((COALESCE(at.rta_to_rtar_days, (0)::double precision) + COALESCE(at.prsc_to_fatch_days, (0)::double precision)), (0)::double precision) AS applicant_response_screening_days,
            COALESCE((COALESCE(at.rta_to_rtar_minutes, (0)::double precision) + COALESCE(at.prsc_to_fatch_minutes, (0)::double precision)), (0)::double precision) AS applicant_response_screening_minutes,
            COALESCE(
                CASE
                    WHEN ((st.min_verified_date IS NOT NULL) AND (LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) IS NOT NULL)) THEN (date_part('epoch'::text, (LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) - st.min_verified_date)) / (86400)::double precision)
                    ELSE (0)::double precision
                END, (0)::double precision) AS assessor_assignment_days,
            COALESCE(
                CASE
                    WHEN ((st.verified_date IS NOT NULL) AND (LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) IS NOT NULL)) THEN (date_part('epoch'::text, (LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) - st.verified_date)) / (60)::double precision)
                    ELSE (0)::double precision
                END, (0)::double precision) AS assessor_assignment_minutes,
            COALESCE(((
                CASE
                    WHEN ((LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) IS NOT NULL) AND (st.first_stl_date IS NOT NULL)) THEN (date_part('epoch'::text, (st.first_stl_date - LEAST(psa.first_primary_assigned, psa.first_secondary_assigned))) / (86400)::double precision)
                    ELSE (0)::double precision
                END + COALESCE(at.firr_to_stl_days, (0)::double precision)) + COALESCE(at.rtas_to_stl_days, (0)::double precision)), (0)::double precision) AS assessment_days,
            COALESCE(((
                CASE
                    WHEN ((LEAST(psa.first_primary_assigned, psa.first_secondary_assigned) IS NOT NULL) AND (st.first_stl_date IS NOT NULL)) THEN (date_part('epoch'::text, (st.first_stl_date - LEAST(psa.first_primary_assigned, psa.first_secondary_assigned))) / (60)::double precision)
                    ELSE (0)::double precision
                END + COALESCE(at.firr_to_stl_minutes, (0)::double precision)) + COALESCE(at.rtas_to_stl_minutes, (0)::double precision)), (0)::double precision) AS assessment_minutes,
            COALESCE((((((((COALESCE(at.stl_to_fir_days, (0)::double precision) + COALESCE(at.stl_to_sfa_days, (0)::double precision)) + COALESCE(at.stl_to_sfr_days, (0)::double precision)) + COALESCE(at.rtl_to_fir_days, (0)::double precision)) + COALESCE(at.rtl_to_sfa_days, (0)::double precision)) + COALESCE(at.rtl_to_sfr_days, (0)::double precision)) + COALESCE(at.stl_to_rtas_days, (0)::double precision)) + COALESCE(at.rtl_to_rtas_days, (0)::double precision)), (0)::double precision) AS teamleader_decision_days,
            COALESCE((((((((COALESCE(at.stl_to_fir_minutes, (0)::double precision) + COALESCE(at.stl_to_sfa_minutes, (0)::double precision)) + COALESCE(at.stl_to_sfr_minutes, (0)::double precision)) + COALESCE(at.rtl_to_fir_minutes, (0)::double precision)) + COALESCE(at.rtl_to_sfa_minutes, (0)::double precision)) + COALESCE(at.rtl_to_sfr_minutes, (0)::double precision)) + COALESCE(at.stl_to_rtas_minutes, (0)::double precision)) + COALESCE(at.rtl_to_rtas_minutes, (0)::double precision)), (0)::double precision) AS teamleader_decision_minutes,
            COALESCE(at.fir_to_firr_days, (0)::double precision) AS applicant_response_fir_days,
            COALESCE(at.fir_to_firr_minutes, (0)::double precision) AS applicant_response_fir_minutes,
            COALESCE(((((((((COALESCE(at.sfa_to_apr_days, (0)::double precision) + COALESCE(at.sfa_to_rtl_days, (0)::double precision)) + COALESCE(at.sfa_to_fir_days, (0)::double precision)) + COALESCE(at.sfr_to_rej_days, (0)::double precision)) + COALESCE(at.sfr_to_rtl_days, (0)::double precision)) + COALESCE(at.sfr_to_fir_days, (0)::double precision)) + COALESCE(at.apr_to_void_days, (0)::double precision)) + COALESCE(at.rej_to_void_days, (0)::double precision)) + COALESCE(at.void_to_rtl_days, (0)::double precision)), (0)::double precision) AS leo_final_decision_days,
            COALESCE(((((((((COALESCE(at.sfa_to_apr_minutes, (0)::double precision) + COALESCE(at.sfa_to_rtl_minutes, (0)::double precision)) + COALESCE(at.sfa_to_fir_minutes, (0)::double precision)) + COALESCE(at.sfr_to_rej_minutes, (0)::double precision)) + COALESCE(at.sfr_to_rtl_minutes, (0)::double precision)) + COALESCE(at.sfr_to_fir_minutes, (0)::double precision)) + COALESCE(at.apr_to_void_minutes, (0)::double precision)) + COALESCE(at.rej_to_void_minutes, (0)::double precision)) + COALESCE(at.void_to_rtl_minutes, (0)::double precision)), (0)::double precision) AS leo_final_decision_minutes,
            at.rqst_to_rta_date,
            at.rqst_to_ver_date,
            at.rqst_to_prsc_date,
            fca.first_cso_assigned_date,
            sp.registration_date AS decision_date,
            mat.name AS submodule,
            app.name AS approval_pathway
           FROM (((((((((license.ma ma
             LEFT JOIN first_cso_assignment fca ON ((ma.id = fca.ma_id)))
             LEFT JOIN status_timestamps st ON ((ma.id = st.ma_id)))
             LEFT JOIN primary_secondary_assignments psa ON ((ma.id = psa.ma_id)))
             LEFT JOIN aggregated_transitions at ON ((ma.id = at.ma_id)))
             JOIN common.ma_type mat ON ((ma.ma_type_id = mat.id)))
             JOIN common.submodule_type subt ON ((mat.submodule_type_id = subt.id)))
             JOIN common.ma_status mas ON ((ma.ma_status_id = mas.id)))
             LEFT JOIN common.approval_pathway app ON ((ma.approval_pathway_id = app.id)))
             JOIN commodity.supplier_product sp ON ((ma.id = sp.ma_id)))
        )
 SELECT id,
    ma_number,
    rowguid,
    created_date,
    modified_date,
    is_active,
    submodule_type_code,
    ma_status_code,
    screener_assignment_days AS screener_assignment_time_days,
    screener_assignment_minutes AS screener_assignment_time_minutes,
    screening_days AS screening_time_days,
    screening_minutes AS screening_time_minutes,
    applicant_response_screening_days,
    applicant_response_screening_minutes,
    assessor_assignment_days AS assessor_assignment_time_days,
    assessor_assignment_minutes AS assessor_assignment_time_minutes,
    assessment_days AS assessment_time_days,
    assessment_minutes AS assessment_time_minutes,
    teamleader_decision_days AS teamleader_decision_time_days,
    teamleader_decision_minutes AS teamleader_decision_time_minutes,
    applicant_response_fir_days,
    applicant_response_fir_minutes,
    leo_final_decision_days AS leo_final_decision_time_days,
    leo_final_decision_minutes AS leo_final_decision_time_minutes,
    rqst_to_ver_date,
    first_cso_assigned_date,
    (date_part('epoch'::text, (rqst_to_ver_date - first_cso_assigned_date)) / (86400)::double precision) AS screeing,
    decision_date AS approval_date,
    submodule,
    approval_pathway
   FROM calculated_times
  WHERE ((ma_status_code <> ALL (ARRAY['WITH'::text, 'DEL'::text])) AND ((ma_number)::text !~~ '%LD%'::text))
  ORDER BY created_date;