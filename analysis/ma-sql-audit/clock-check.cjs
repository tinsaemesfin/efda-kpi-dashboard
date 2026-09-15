const fs=require('fs');const {Client}=require('pg');const {loadDatabaseUrl}=require('../../scripts/load-database-url');
async function main(){const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},options:'-c default_transaction_read_only=on -c statement_timeout=120000'});await c.connect();try{
const a=fs.readFileSync(__dirname+'/attached-query.sql','utf8');const prefix=a.slice(a.indexOf('WITH base AS'),a.indexOf('req AS ('));
const sql=prefix+`dt AS (SELECT id,MAX(COALESCE(screener_assignment_time_days,0)+COALESCE(screening_time_days,0)+COALESCE(assessor_assignment_time_days,0)+COALESCE(assessment_time_days,0)+COALESCE(teamleader_decision_time_days,0)+COALESCE(leo_final_decision_time_days,0)) days FROM license.vwma_unified_processing_time GROUP BY id)
SELECT EXTRACT(YEAR FROM p.decision_date)::int yr,b.pathway_class,count(*)::int n,
round(avg(p.processing_time_in_day)::numeric,2) elapsed_avg,
round(avg(GREATEST(p.processing_time_in_day-COALESCE(al.applicant_days,0),0))::numeric,2) attached_net_avg,
round(avg(dt.days)::numeric,2) app_stage_avg,
count(*) FILTER(WHERE abs(dt.days-GREATEST(p.processing_time_in_day-COALESCE(al.applicant_days,0),0))>1)::int differs_over_one_day,
count(*) FILTER(WHERE dt.days>p.processing_time_in_day+1)::int stage_exceeds_elapsed
FROM base b JOIN license.vwma_processing_time p ON p.id=b.id JOIN license.ma ma ON ma.id=b.id JOIN common.ma_status mas ON mas.id=ma.ma_status_id JOIN dt ON dt.id=b.id LEFT JOIN applicant_lag al ON al.ma_id=b.id
WHERE p.decision_date >= '2024-01-01' AND p.decision_date < '2027-01-01' AND p.processing_time_in_day BETWEEN 0 AND 3000 AND mas.ma_status_code IN ('APR','REJ','SUSP','CNCL') AND dt.days>=0
GROUP BY 1,2 ORDER BY 1,2`;
fs.writeFileSync(__dirname+'/clock-check.sql',sql);let r=(await c.query(sql)).rows;fs.writeFileSync(__dirname+'/clock-check.json',JSON.stringify(r,null,2));console.log(r);
}finally{await c.end()}}main().catch(e=>{console.error(e.message);process.exitCode=1});
