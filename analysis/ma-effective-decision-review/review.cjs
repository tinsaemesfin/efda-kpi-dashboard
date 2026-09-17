const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { loadDatabaseUrl } = require('../../scripts/load-database-url');
const dir = __dirname;
const sample = fs.readFileSync('C:/Users/IE/Downloads/ss (1).txt', 'utf8');
const client = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false }, options: '-c default_transaction_read_only=on -c statement_timeout=180000' });
(async () => {
 await client.connect();
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const meta = (await client.query('SELECT current_database() AS database, current_setting(\'transaction_read_only\') AS read_only')).rows[0];
  const reports = (await client.query('SELECT id,title,query,filter_columns FROM kpi.kpi ORDER BY id')).rows;
  fs.writeFileSync(path.join(dir,'current-reports.json'),JSON.stringify(reports,null,2));
  const matches = reports.filter(r=>fs.existsSync(path.join(dir,'../ma-report-alignment/report-'+r.id+'.sql'))).map(r=>({id:r.id,same:r.query.trim()===fs.readFileSync(path.join(dir,'../ma-report-alignment/report-'+r.id+'.sql'),'utf8').trim(),filter:r.filter_columns}));
  console.log(JSON.stringify({meta,total:reports.length,compared:matches.length,changed:matches.filter(x=>!x.same),filters:matches.filter(x=>[155,160].includes(x.id))}));
  const output = {meta,matches};
  for(const id of [155,160]) {
   const r=reports.find(r=>r.id===id);
   const filters=typeof r.filter_columns==='string'?JSON.parse(r.filter_columns):r.filter_columns;
   const f=filters.find(x=>x.ParameterName==='dateFilter');
   const replacement=`AND ${f.Alias ? f.Alias+'.':''}${f.OverridingFieldName} >= DATE '2025-01-01' AND ${f.Alias ? f.Alias+'.':''}${f.OverridingFieldName} < DATE '2026-01-01'`;
   output[id]=(await client.query(r.query.replaceAll('@dateFilter',replacement))).rows;
   console.log(JSON.stringify({id,rows:output[id]}));
  }
  output.sample=(await client.query(sample)).rows;
  console.log(JSON.stringify({sample:output.sample}));
  fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(output,null,2));
  await client.query('ROLLBACK');
 } finally { await client.end(); }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
