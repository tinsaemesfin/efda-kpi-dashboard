/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('fs');const path=require('path');const {Client}=require('pg');
const {loadDatabaseUrl}=require('./load-database-url');
const {executable,migrationSql,verifyGroup}=require('./prepare-ma-report-alignment');
const {PRODUCTS}=require('./ma-report-alignment');
const out=path.resolve(__dirname,'../analysis/ma-effective-decision');
const fields='id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date';
const events=`effective_status_log AS MATERIALIZED (
 SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new
 WHERE to_status_code IN ('APR','REJ','SUSP','CNCL')
), effective_per_ma AS (
 SELECT ma_id,BOOL_OR(to_status_code='APR') AS has_logged_approval,
 MIN(modified_date) FILTER(WHERE to_status_code IN ('SUSP','CNCL')) AS first_susp_cncl
 FROM effective_status_log GROUP BY ma_id
), effective_events AS (
 SELECT ma_id,modified_date AS decided_at,to_status_code AS decision FROM effective_status_log
 WHERE to_status_code IN ('APR','REJ') AND COALESCE(from_status_code,'') NOT IN ('SUSP','APR','REJ')
 UNION ALL SELECT ma_id,first_susp_cncl,'APR' FROM effective_per_ma
 WHERE NOT has_logged_approval AND first_susp_cncl IS NOT NULL
), effective_decision AS MATERIALIZED (
 SELECT DISTINCT ON(ma_id) ma_id,decided_at,decision FROM effective_events ORDER BY ma_id,decided_at DESC
)`;
function transform(r){
 const par=r.kind.startsWith('par-');
 if(r.basis==='submission'&&!par)return r.query;
 let q=r.query.replace(/license\.vwma\b/g,'effective_ma');
 if(par)q=q.replaceAll('v.decision_date AS approval_date','v.effective_decision_at AS approval_date');
 if(r.basis==='decision')q=q.replaceAll('@dateFilter','AND decision_date IS NOT NULL\n    @dateFilter');
 const source=`effective_ma_source AS MATERIALIZED (SELECT ${fields} FROM license.vwma),
 effective_ma AS MATERIALIZED (
 SELECT m.*,ed.decided_at::date AS decision_date,ed.decided_at AS effective_decision_at
 FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id
 )`;
 return `/* MA effective decision v2: agreed status-log dates; current outcomes retained. */\nWITH ${events},\n${source}, effective_report AS (\n${q.trim().replace(/;$/,'')}\n) SELECT * FROM effective_report;`;
}
function bundle(reports){
 const ctes=[`ma_snapshot AS MATERIALIZED (SELECT ${fields},decision_date FROM license.vwma)`,
 `time_snapshot AS MATERIALIZED (SELECT * FROM license.vwma_unified_processing_time)`,
 `log_snapshot AS MATERIALIZED (SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new)`];
 for(const r of reports)ctes.push(`report_${r.id} AS (${executable(r).trim().replace(/;$/,'').replace(/license\.vwma_unified_processing_time\b/g,'time_snapshot').replace(/license\.vwma_log_status_new\b/g,'log_snapshot').replace(/license\.vwma\b/g,'ma_snapshot')})`);
 return `WITH ${ctes.join(',\n')} `+reports.map(r=>`SELECT ${r.id} AS id,COALESCE(jsonb_agg(to_jsonb(q)),'[]'::jsonb) AS rows FROM report_${r.id} q`).join(' UNION ALL ');
}
const save=(name,data)=>fs.writeFileSync(path.join(out,name),typeof data==='string'?data:JSON.stringify(data,null,2));
async function main(){
 fs.mkdirSync(out,{recursive:true});const mode=process.argv[2];const year=Number(process.argv[3]||2025);
 const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},options:'-c default_transaction_read_only=on -c statement_timeout=300000'});await c.connect();
 try{
 let reports;
 if(mode==='prepare'){
 const templates=JSON.parse(fs.readFileSync(path.resolve(out,'../ma-report-alignment/proposed-reports.json'),'utf8'));
 const current=(await c.query("SELECT id,title,query,filter_columns FROM kpi.kpi WHERE kpi_group='MA' ORDER BY id")).rows;
 const extra=current.filter(r=>!templates.some(t=>t.id===r.id));save('historical-reports-not-used-by-dashboard.json',extra);
 if(extra.some(r=>![1,2,3,4,5,6,7,26,27,28,29,30,31,32,88].includes(r.id)))throw Error('Unexpected MA catalogue additions');
 reports=templates.map(t=>{const r=current.find(x=>x.id===t.id);if(!r||r.query!==t.query||r.filter_columns!==t.filter_columns)throw Error('Baseline drift '+t.id);const proposed={...t,...r,previous_query:r.query,previous_filter_columns:r.filter_columns};proposed.query=transform(proposed);return proposed;});
 save('all-reports.json',reports);const changed=reports.filter(r=>r.query!==r.previous_query);save('proposed-reports.json',changed);
 save('apply-reviewed-alignment.sql',migrationSql(changed));save('rollback-reviewed-alignment.sql',migrationSql(changed,true));
 for(const r of reports)save(`report-${r.id}.sql`,r.query);
 for(const r of changed){await c.query('EXPLAIN '+executable(r),[`${year}-01-01`,`${year+1}-01-01`]);await c.query('EXPLAIN '+r.query.replaceAll('@dateFilter',''));}
 save('planning.json',{changed:changed.length,unchanged:reports.length-changed.length,datedAndUnfilteredPlans:true});console.log('Prepared and planned '+changed.length+' updates');return;
 }
 reports=JSON.parse(fs.readFileSync(path.join(out,'all-reports.json'),'utf8'));
 if(mode==='deployed'){
 const stored=(await c.query('SELECT id,query,filter_columns FROM kpi.kpi')).rows;
 for(const r of reports){const s=stored.find(x=>x.id===r.id);if(!s||s.query!==r.query||s.filter_columns!==r.filter_columns)throw Error('Persistence mismatch '+r.id);}
 }
 const results=new Map(),checks=[];
 for(const p of PRODUCTS)for(const basis of ['submission','decision']){
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{for(const row of (await c.query(bundle(reports.filter(r=>r.product===p.key&&r.basis===basis)),[`${year}-01-01`,`${year+1}-01-01`])).rows)results.set(row.id,row.rows);
 checks.push(verifyGroup(reports,results,p,basis));await c.query('ROLLBACK');}catch(e){await c.query('ROLLBACK');throw e;}
 save(`${mode}-${year}.json`,{year,checks,results:Object.fromEntries(results)});console.log(`PASS ${mode} ${year} ${p.key} ${basis}`);
 }
 console.log('Checks: '+checks.reduce((n,g)=>n+g.checks.length,0));
 }finally{await c.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={transform,events};
