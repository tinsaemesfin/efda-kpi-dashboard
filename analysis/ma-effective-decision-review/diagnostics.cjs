const fs=require('fs');
const {Client}=require('pg');
const {loadDatabaseUrl}=require('../../scripts/load-database-url');
const sample=fs.readFileSync('C:/Users/IE/Downloads/ss (1).txt','utf8');
const prefix=sample.slice(sample.indexOf('WITH status_log'),sample.indexOf('unified_processing_time AS')).replace('SELECT v.id, v.module_code','SELECT v.decision_date AS old_date, v.id, v.module_code');
const sql=prefix+`comparison AS (
 SELECT m.*,ed.decision_date AS new_date,ed.decision,p.has_logged_approval,p.first_susp_cncl,
 (m.old_date >= DATE '2025-01-01' AND m.old_date < DATE '2026-01-01') IS TRUE AS old_2025,
 (ed.decision_date::date >= DATE '2025-01-01' AND ed.decision_date::date < DATE '2026-01-01') IS TRUE AS new_2025
 FROM medicine_ma m LEFT JOIN effective_decision ed ON ed.ma_id=m.id LEFT JOIN per_ma p ON p.ma_id=m.id
)
SELECT count(*) AS eligible_all_years,
 count(*) FILTER(WHERE old_2025) AS old_2025,
 count(*) FILTER(WHERE new_2025) AS new_2025,
 count(*) FILTER(WHERE old_2025 AND NOT new_2025) AS leave_2025,
 count(*) FILTER(WHERE new_2025 AND NOT old_2025) AS enter_2025,
 count(*) FILTER(WHERE new_date IS NULL) AS missing_effective_date,
 count(*) FILTER(WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL) AS fallback_candidates,
 count(*) FILTER(WHERE new_2025 AND NOT has_logged_approval AND first_susp_cncl IS NOT NULL) AS fallback_2025,
 count(*) FILTER(WHERE (ma_status_code='REJ' AND decision='APR') OR (ma_status_code IN ('APR','SUSP','CNCL') AND decision='REJ')) AS outcome_mismatch,
 (SELECT count(*) FROM (SELECT ma_id,decided_at FROM decision_events GROUP BY ma_id,decided_at HAVING count(DISTINCT decision)>1) t) AS conflicting_event_ties
FROM comparison`;
const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},options:'-c default_transaction_read_only=on -c statement_timeout=180000'});
(async()=>{await c.connect();try{const rows=(await c.query(sql)).rows;fs.writeFileSync(__dirname+'/diagnostics.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
const details=(await c.query(prefix+`issues AS (
SELECT m.id,m.ma_status_code,m.old_date,ed.decision_date,ed.decision,p.has_logged_approval,p.first_susp_cncl
FROM medicine_ma m LEFT JOIN effective_decision ed ON ed.ma_id=m.id LEFT JOIN per_ma p ON p.ma_id=m.id
WHERE ed.decision_date IS NULL OR (m.ma_status_code='REJ' AND ed.decision='APR') OR (m.ma_status_code IN ('APR','SUSP','CNCL') AND ed.decision='REJ') OR (NOT p.has_logged_approval AND p.first_susp_cncl IS NOT NULL)
)
SELECT i.*, (SELECT json_agg(json_build_object('from',l.from_status_code,'to',l.to_status_code,'at',l.modified_date) ORDER BY l.modified_date) FROM license.vwma_log_status_new l WHERE l.ma_id=i.id AND l.to_status_code IN ('APR','REJ','SUSP','CNCL','VOID')) AS events FROM issues i`)).rows;
fs.writeFileSync(__dirname+'/edge-cases.json',JSON.stringify(details,null,2));console.log(JSON.stringify(details));
}finally{await c.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
