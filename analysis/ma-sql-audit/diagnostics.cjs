const fs=require('fs');const {Client}=require('pg');const {loadDatabaseUrl}=require('../../scripts/load-database-url');
async function main(){const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},options:'-c default_transaction_read_only=on -c statement_timeout=120000'});await c.connect();try{
const a=fs.readFileSync(__dirname+'/attached-query.sql','utf8');const prefix=a.slice(a.indexOf('WITH base AS'),a.indexOf('req AS ('));
const sql=prefix+`data AS (SELECT b.*, e.first_rqst,e.first_apr,e.first_fir,p.submission_date,p.decision_date,p.processing_time_in_day,al.applicant_days,mas.ma_status_code,ma.is_sra,ap.approval_pathway_code
FROM base b LEFT JOIN ev e ON e.ma_id=b.id LEFT JOIN license.vwma_processing_time p ON p.id=b.id LEFT JOIN applicant_lag al ON al.ma_id=b.id JOIN license.ma ma ON ma.id=b.id JOIN common.ma_status mas ON mas.id=ma.ma_status_id LEFT JOIN common.approval_pathway ap ON ap.id=ma.approval_pathway_id)
SELECT pathway_class,ma_status_code,approval_pathway_code,is_sra,EXTRACT(YEAR FROM COALESCE(first_rqst,created_date))::int request_year,EXTRACT(YEAR FROM first_apr)::int first_approval_year,EXTRACT(YEAR FROM submission_date)::int submission_year,EXTRACT(YEAR FROM decision_date)::int decision_year,
count(*)::int n,count(*) FILTER(WHERE first_rqst IS NULL)::int missing_rqst,count(*) FILTER(WHERE processing_time_in_day<0 OR processing_time_in_day>3000)::int outliers,count(*) FILTER(WHERE applicant_days>processing_time_in_day)::int lag_exceeds_total,
round(avg(processing_time_in_day)::numeric,2) avg_elapsed
FROM data GROUP BY 1,2,3,4,5,6,7,8`;
fs.writeFileSync(__dirname+'/diagnostics.sql',sql);const r=(await c.query(sql)).rows;fs.writeFileSync(__dirname+'/diagnostics.json',JSON.stringify(r,null,2));console.log('Diagnostic groups',r.length);
const dup=(await c.query(`SELECT count(*)::int rows,count(DISTINCT id)::int distinct_ids FROM license.vwma WHERE module_code='NMR' AND submoduletype_code='MDCN' AND ma_number NOT LIKE '%LD%' AND ma_status_code IN ('APR','REJ','SUSP','CNCL')`)).rows;console.log(dup);fs.writeFileSync(__dirname+'/duplicate-check.json',JSON.stringify(dup,null,2));
}finally{await c.end()}}main().catch(e=>{console.error(e.message);process.exitCode=1});
