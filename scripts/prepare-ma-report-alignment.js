/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS script. */
/* Generates reviewable SQL locally; --verify executes SELECTs in a read-only session.
 * Usage: node scripts/prepare-ma-report-alignment.js [--verify] [year]
 * Preparation is read-only. The authorized apply operation has its own backup-first script.
 * After migration use verify-applied-ma-alignment.js; do not rebuild from aligned SQL.
 */
const fs=require('fs');const path=require('path');const {Client}=require('pg');
const {loadDatabaseUrl}=require('./load-database-url');const {buildAlignment,PRODUCTS}=require('./ma-report-alignment');
const out=path.join(__dirname,'..','analysis','ma-report-alignment');
const save=(name,value)=>fs.writeFileSync(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2));
function executable(r){const f=JSON.parse(r.filter_columns).find(x=>x.ParameterName==='dateFilter');return r.query.replaceAll('@dateFilter',`AND ${f.Alias?f.Alias+'.':''}${f.OverridingFieldName} >= $1::date AND ${f.Alias?f.Alias+'.':''}${f.OverridingFieldName} < $2::date`);}
function sums(rows){return rows.reduce((a,r)=>({n:a.n+Number(r.total_count),on:a.on+Number(r.on_time_count||0)}),{n:0,on:0});}
// Materialize the unchanged source views once per comparison. Each report still
// executes its own candidate SQL, but costly log/pivot views are not expanded
// repeatedly for each category, KPI and face component.
function comparisonBundle(reports) {
 const maFields='id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date,decision_date';
 const timeFields='id,screener_assignment_time_days,screening_time_days,assessor_assignment_time_days,assessment_time_days,teamleader_decision_time_days,leo_final_decision_time_days';
 const ctes=[`ma_snapshot AS MATERIALIZED (SELECT ${maFields} FROM license.vwma)`, `time_snapshot AS MATERIALIZED (SELECT ${timeFields} FROM license.vwma_unified_processing_time)`];
 for(const r of reports){const sql=executable(r).trim().replace(/;$/,'').replaceAll('license.vwma_unified_processing_time','time_snapshot').replaceAll('license.vwma','ma_snapshot');ctes.push(`report_${r.id} AS (${sql})`);}
 return `WITH ${ctes.join(',\n')}\n`+reports.map(r=>`SELECT ${r.id} AS id, COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) AS rows FROM report_${r.id} q`).join('\nUNION ALL\n');
}
function migrationSql(reports,reverse=false) {
 const literal=s=>"'"+s.replaceAll("'","''")+"'";
 const statements=['-- Prepared locally only. Not applied. Preconditions prevent overwriting changed reports.','BEGIN;'];
 for(const r of reports){
  const query=reverse?r.previous_query:r.query, filters=reverse?r.previous_filter_columns:r.filter_columns;
  const expectedQuery=reverse?r.query:r.previous_query, expectedFilters=reverse?r.filter_columns:r.previous_filter_columns;
  if([query,filters,expectedQuery,expectedFilters].some(s=>s.includes('$alignment$')))throw new Error('SQL delimiter collision');
  statements.push(`DO $alignment$\nBEGIN\n  UPDATE kpi.kpi SET query=${literal(query)}, filter_columns=${literal(filters)}, modified_date=NOW()\n  WHERE id=${r.id} AND query=${literal(expectedQuery)} AND filter_columns=${literal(expectedFilters)};\n  IF NOT FOUND THEN RAISE EXCEPTION 'Report ${r.id} changed since preparation; aborting'; END IF;\nEND $alignment$;`);
 }
 statements.push('COMMIT;');return statements.join('\n\n');
}
function verifyGroup(reports,results,p,basis){
 const find=kind=>results.get(reports.find(r=>r.product===p.key&&r.basis===basis&&r.kind===kind).id);
 const checks=[];
 function check(label,actual,expected){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${p.key}/${basis}/${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);checks.push({label,...actual});}
 for(let i=0;i<p.standard[0].length;i++){
  const moduleCode=p.key==='cosmetics'&&i===2?'VAR':['NMR','REN','VMIN','VMAJ'][i];
  const expected=sums(find('standard-face').filter(r=>r.module_code===moduleCode));
  const dd=find(`standard-${i+1}`);
  for(const category of ['Application type','Regulatory outcome','MA type','Processing time band'])check(`${moduleCode}/${category}`,sums(dd.filter(r=>r.category_name===category)),expected);
  check(`${moduleCode}/pathways`,sums(dd.filter(r=>r.category_name.includes('pathway'))),expected);
 }
 for(const kind of ['median','average']){
  const face=find('time-face').find(r=>r.metric.startsWith(kind==='median'?'Median':'Average'));
  const dd=find(kind);const overall=kind==='median'?'overall_median_days':'overall_avg_days';
  if(dd.some(r=>Number(r[overall])!==Number(face.decision_time_in_days)))throw new Error(`${p.key}/${basis}/${kind}: overall mismatch`);
  const pathTotals=sums(dd.filter(r=>r.category_name.includes('pathway')));
  for(const category of ['Application type','Regulatory outcome','MA type','Decision time band'])check(`${kind}/${category}`,sums(dd.filter(r=>r.category_name===category)),pathTotals);
  check(`${kind}/pathways`,{n:pathTotals.n},{n:Number(face.total_count)});
 }
 const parExpected=sums(find('par-face'));const par=find('par-drilldown');
 for(const category of ['Application type','Regulatory outcome','MA type','Publication time band','Application module'])check(`PAR/${category}`,sums(par.filter(r=>r.category_name===category)),parExpected);
 check('PAR/pathways',sums(par.filter(r=>r.category_name.includes('pathway'))),parExpected);
 return {product:p.key,basis,checks};
}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on -c statement_timeout=180000'});
 await c.connect();try{
  const mode=(await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only;if(mode!=='on')throw new Error('Read-only required');
  const catalog=(await c.query("SELECT id,title,query,filter_columns FROM kpi.kpi WHERE kpi_group='MA' ORDER BY id")).rows;
  if(catalog.some(r=>r.query.startsWith('/* MA face/drilldown alignment v1 */')))throw new Error('Catalogue is already aligned. Use verify-applied-ma-alignment.js; preserve the original migration and rollback artifacts.');
  const reports=buildAlignment(catalog);save('proposed-reports.json',reports);
  for(const r of reports)save(`report-${r.id}.sql`,r.query);
  save('apply-reviewed-alignment.sql',migrationSql(reports));
  save('rollback-reviewed-alignment.sql',migrationSql(reports,true));
  console.log(`Prepared ${reports.length} reports; database read-only=${mode}`);
  // Parse and plan every candidate without executing it or changing the catalogue.
  const year=Number(process.argv[3]||2025);if(!Number.isInteger(year)||year<1900||year>2100)throw new Error('Invalid year');
  const dates=[`${year}-01-01`,`${year+1}-01-01`];
  for(const r of reports)await c.query('EXPLAIN '+executable(r),dates);
  save('planning.json',{count:reports.length,readOnly:mode,dates});console.log(`All ${reports.length} SQL plans passed`);
  if(process.argv[2]!=='--verify')return;
  const results=new Map();const checks=[];
  for(const p of PRODUCTS)for(const basis of ['submission','decision']){
    // One consistent snapshot per product/date-basis comparison.
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try{const group=reports.filter(r=>r.product===p.key&&r.basis===basis);
    for(const row of (await c.query(comparisonBundle(group),dates)).rows)results.set(row.id,row.rows);
    checks.push(verifyGroup(reports,results,p,basis));await c.query('ROLLBACK');}
    catch(e){await c.query('ROLLBACK');throw e;}
    save(`verification-${year}.json`,{dates,readOnly:mode,checks,results:Object.fromEntries(results)});
    console.log(`PASS ${p.key} ${basis}`);
  }
 }finally{await c.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={executable,verifyGroup,migrationSql,comparisonBundle};
