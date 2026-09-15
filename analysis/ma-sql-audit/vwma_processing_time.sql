 WITH cte AS (
         SELECT ma.id,
            ma.ma_number,
            lg."RQST" AS submission_date,
            lg."RTA" AS return_to_agent_date,
            lg."RTAR" AS return_to_agent_replied_date,
            lg."FIR" AS fir_date,
            lg."FIRR" AS fir_replied_date,
            lg."FATCH" AS fee_attached_date,
            asa."PRSC" AS assigned_to_cso_date,
            lg."PRSC" AS prescreened_date,
            lg."VER" AS verified_date,
            asa."PRAS" AS primary_assigned_date,
            asa."SCAS" AS secondary_assigned_date,
            mar."PRAS" AS primary_reviewed_date,
            mar."SCAS" AS secondary_reviewed_date,
            lg."STL" AS sumbitted_to_team_leader_date,
            COALESCE(lg."SFA", lg."SFR") AS submitted_for_decision_date,
            COALESCE(lg."APR", lg."REJ") AS decision_date,
            ((date_part('day'::text, (COALESCE(lg."APR", lg."REJ") - lg."RQST")) * (24)::double precision) + date_part('hour'::text, (COALESCE(lg."APR", lg."REJ") - lg."RQST"))) AS processing_time_in_hour,
            date_part('day'::text, (COALESCE(lg."APR", lg."REJ") - lg."RQST")) AS processing_time_in_day
           FROM (((license.ma ma
             LEFT JOIN ( SELECT ct.ma_id,
                    ct."RQST",
                    ct."RTA",
                    ct."RTAR",
                    ct."FIR",
                    ct."FIRR",
                    ct."FATCH",
                    ct."PRSC",
                    ct."VER",
                    ct."ASD",
                    ct."RTAS",
                    ct."STL",
                    ct."RTL",
                    ct."SFR",
                    ct."SFA",
                    ct."APR",
                    ct."REJ"
                   FROM crosstab(' SELECT
				lg.ma_id,
				to_status_code,
				MAX (lg.modified_date) modified_date
			FROM
				license.vwma_log_status lg
			WHERE
				lg.to_status_code IN (
					''RQST'',
					''RTA'',
					''RTAR'',
					''FIR'',
					''FIRR'',
					''FATCH'',
					''PRSC'',
					''VER'',
					''ASD'',
					''RTAS'',
					''STL'',
					''RTL'',
					''SFR'',
					''SFA'',
					''APR'',
					''REJ''
				)
			GROUP BY
				ma_id,
				to_status_code
			ORDER BY
				ma_id,
				modified_date '::text, 'VALUES (''RQST''),
				(''RTA''),
				(''RTAR''),
				(''FIR''),
				(''FIRR''),
				(''FATCH''),
				(''PRSC''),
				(''VER''),
				(''ASD''),
				(''RTAS''),
				(''STL''),
				(''RTL''),
				(''SFR''),
				(''SFA''),
				(''APR''),
				(''REJ'') '::text) ct(ma_id integer, "RQST" timestamp without time zone, "RTA" timestamp without time zone, "RTAR" timestamp without time zone, "FIR" timestamp without time zone, "FIRR" timestamp without time zone, "FATCH" timestamp without time zone, "PRSC" timestamp without time zone, "VER" timestamp without time zone, "ASD" timestamp without time zone, "RTAS" timestamp without time zone, "STL" timestamp without time zone, "RTL" timestamp without time zone, "SFR" timestamp without time zone, "SFA" timestamp without time zone, "APR" timestamp without time zone, "REJ" timestamp without time zone)) lg ON ((ma.id = lg.ma_id)))
             LEFT JOIN ( SELECT ct.ma_id,
                    ct."PRSC",
                    ct."PRAS",
                    ct."SCAS"
                   FROM crosstab(' SELECT
				maa.ma_id,
				rt.responder_type_code,
				MAX (maa.created_date) assigned_date
			FROM
				license.ma_assignment maa
			JOIN common.responder_type rt ON maa.responder_type_id = rt. ID
			WHERE
				maa.is_active = TRUE
			GROUP BY
				maa.ma_id,
				rt.responder_type_code
            ORDER BY 1,2 '::text, 'VALUES (''PRSC''),
				(''PRAS''),
				(''SCAS'') '::text) ct(ma_id integer, "PRSC" timestamp without time zone, "PRAS" timestamp without time zone, "SCAS" timestamp without time zone)) asa ON ((ma.id = asa.ma_id)))
             LEFT JOIN ( SELECT ct.ma_id,
                    ct."PRAS",
                    ct."SCAS"
                   FROM crosstab(' SELECT
			ma_id,
			responder_type_code,
			MAX (mar.modified_date) modified_date
		FROM
			license.ma_review mar
		JOIN common.responder_type rt ON mar.responder_type_id = rt. ID
		WHERE
			rt.responder_type_code IN (''PRAS'', ''SCAS'')
		AND mar.is_active = TRUE
		AND mar.is_draft = FALSE
		GROUP BY
			ma_id,
			responder_type_code
        ORDER BY 1,2 '::text, 'VALUES (''PRAS''),
			(''SCAS'') '::text) ct(ma_id integer, "PRAS" timestamp without time zone, "SCAS" timestamp without time zone)) mar ON ((ma.id = mar.ma_id)))
        )
 SELECT id,
    ma_number,
    submission_date,
    return_to_agent_date,
    return_to_agent_replied_date,
    fir_date,
    fir_replied_date,
    fee_attached_date,
    assigned_to_cso_date,
    prescreened_date,
    verified_date,
    primary_assigned_date,
    secondary_assigned_date,
    primary_reviewed_date,
    secondary_reviewed_date,
    sumbitted_to_team_leader_date,
    submitted_for_decision_date,
    decision_date,
    processing_time_in_hour,
    processing_time_in_day,
    (COALESCE(date_part('hour'::text, (return_to_agent_replied_date - return_to_agent_date)), (0)::double precision) + COALESCE(date_part('hour'::text, (fir_replied_date - fir_date)), (0)::double precision)) AS lag_time_in_hours,
    (processing_time_in_hour - (COALESCE(date_part('hour'::text, (return_to_agent_replied_date - return_to_agent_date)), (0)::double precision) + COALESCE(date_part('hour'::text, (fir_replied_date - fir_date)), (0)::double precision))) AS processing_time_without_lag_time_in_hours
   FROM cte;