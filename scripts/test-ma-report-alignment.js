/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS script. */
/* Database-backed regression cases using VALUES only; no persistent fixtures. */
const assert=require('node:assert/strict');const {Client}=require('pg');
const {loadDatabaseUrl}=require('./load-database-url');
const {standardSource,standardDrilldown,standardFace,throughCte}=require('./ma-report-alignment');
async function main(){
 assert.equal(throughCte("WITH classified AS (SELECT '(' AS value /* nested ( ) */) SELECT 1",'classified'),"WITH classified AS (SELECT '(' AS value /* nested ( ) */)");
 const query=`WITH classified AS (
 SELECT * FROM (VALUES
 (1,'NMR','Reliance pathway',100::numeric,270,'2024-12-31'::date,'2025-01-01'::date),
 (2,'NMR','Internal regulatory pathway',100,270,'2025-01-01','2025-01-02'),
 (3,'NMR','Reliance pathway',90,270,'2025-12-31','2026-01-01'),
 (4,'NMR','Internal regulatory pathway',-1,270,'2025-06-01','2025-06-02'),
 (5,'NMR','Internal regulatory pathway',NULL,270,'2025-06-01','2025-06-02'),
 (6,'VMIN','Reliance pathway',75,60,'2025-06-01','2025-06-02'),
 (7,'VMIN','Reliance pathway',60,60,'2025-06-01','2025-06-02')
 ) v(id,module_code,pathway_group,processing_time_in_day,target_days,submission_date,decision_date)
 CROSS JOIN (SELECT NULL::text application_type_clean,'Regular'::text approval_pathway_clean,
 NULL::text regulatory_outcome_clean,'APR'::text ma_status_code,NULL::text ma_type_clean,
 'Test'::text ma_type_code,'Test band'::text processing_band) labels
 WHERE true @dateFilter
)
SELECT * FROM classified`;
 const source=standardSource({id:0,query});const face=standardFace([source],'MDCN');const drill=standardDrilldown(source);
 const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},options:'-c default_transaction_read_only=on -c statement_timeout=30000'});
 await c.connect();try{
 assert.equal((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');
 for(const basis of ['submission','decision']){
  const sql=q=>q.replaceAll('@dateFilter',`AND ${basis}_date >= $1::date AND ${basis}_date < $2::date`);
  const dates=['2025-01-01','2026-01-01'];const f=(await c.query(sql(face),dates)).rows;const d=(await c.query(sql(drill),dates)).rows;
  const nmr=f.find(r=>r.module_code==='NMR');const minor=f.find(r=>r.module_code==='VMIN');
  assert.equal(Number(nmr.total_count),4);assert.equal(Number(nmr.on_time_count),basis==='submission'?2:1);
  assert.equal(Number(minor.total_count),2);assert.equal(Number(minor.on_time_count),1);
  for(const r of f)for(const category of ['Application type','Regulatory outcome','MA type','Processing time band','pathways']){
   const rows=d.filter(x=>x.module_code===r.module_code&&(category==='pathways'?x.category_name.includes('pathway'):x.category_name===category));
   assert.equal(rows.reduce((s,x)=>s+Number(x.total_count),0),Number(r.total_count));
   assert.equal(rows.reduce((s,x)=>s+Number(x.on_time_count),0),Number(r.on_time_count));
  }
  assert.deepEqual((await c.query(sql(face),['2030-01-01','2031-01-01'])).rows,[]);
  assert.deepEqual((await c.query(sql(drill),['2030-01-01','2031-01-01'])).rows,[]);
 }
 console.log('PASS: date boundaries, cross-year decisions, 90/270/60-day targets, missing/negative times, complete categories, empty ranges');
 }finally{await c.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
