const fs = require('fs');
const {Client} = require('pg');
const {loadDatabaseUrl} = require('../../scripts/load-database-url');
const dir=__dirname;
const save=(n,v)=>fs.writeFileSync(`${dir}/${n}`,typeof v==='string'?v:JSON.stringify(v,null,2));
async function main(){
 const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on -c statement_timeout=120000'});
 await c.connect();
 try {
 console.log((await c.query('SHOW transaction_read_only')).rows);
 const reports=(await c.query('SELECT id,title,query,filter_columns FROM kpi.kpi WHERE id IN (8,9,10,11,13,118,119,120,155,160,179,180,181) ORDER BY id')).rows;
 save('stored-reports.json',reports);
 for(const r of reports)save(`report-${r.id}.sql`,r.query);
 const views=(await c.query("SELECT schemaname,viewname,definition FROM pg_views WHERE schemaname='license' AND (viewname LIKE '%processing%' OR viewname IN ('vwma','vwma_log_status_new'))")).rows;
 save('views.json',views);for(const v of views)save(`${v.viewname}.sql`,v.definition);
 console.log('Saved reports and views');
 const attachment=fs.readFileSync('C:/Users/IE/.codex/attachments/5a18e6f3-3178-4a96-9a97-f12578603487/pasted-text.txt','utf8');
 save('attached-query.sql',attachment);
 save('attached-results.json',(await c.query(attachment)).rows);console.log('Attached query complete');
 const results=[];
 for(const year of [2024,2025,2026])for(const r of reports.filter(r=>[8,9,118,119,155,160,179,180].includes(r.id))){
 const f=JSON.parse(r.filter_columns).find(x=>x.ParameterName==='dateFilter');
 const field=(f.Alias?f.Alias+'.':'')+f.OverridingFieldName;
 const sql=r.query.replaceAll('@dateFilter',`AND ${field} >= $1::date AND ${field} < $2::date`);
 const rows=(await c.query(sql,[`${year}-01-01`,`${year+1}-01-01`])).rows;
 results.push({year,id:r.id,dateField:field,rows});save('app-results.json',results);console.log(year,r.id,rows.length);
 }
 }finally{await c.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
