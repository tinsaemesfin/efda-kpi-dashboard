 SELECT mls.id,
    mls.ma_id,
    mls.from_status_id,
    mls.to_status_id,
    mls.is_current,
    mls.comment,
    mls.modified_by_user_id,
    mls.suspension_date,
    mls.created_date,
    mls.modified_date,
    mls.rowguid,
    mls.is_active,
    from_status.ma_status_code AS from_status_code,
    to_status.ma_status_code AS to_status_code
   FROM ((license.ma_log_status mls
     LEFT JOIN common.ma_status from_status ON ((mls.from_status_id = from_status.id)))
     JOIN common.ma_status to_status ON ((mls.to_status_id = to_status.id)))
  ORDER BY mls.ma_id, mls.modified_date;