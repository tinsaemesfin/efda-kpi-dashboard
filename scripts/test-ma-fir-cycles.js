/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { loadDatabaseUrl } = require('./load-database-url');
const { original } = require('./restore-ma-fir');
// Run the recovered SQL against values only. No application data or schema writes.
const fixture = `WITH test_settings(system_setting_code,value,is_active) AS (VALUES ('KPI_MA_FIRR_TO_STL_TARGET_DAYS','30',true)),
test_status(id,ma_status_code) AS (VALUES (1,'FIRR'),(2,'STL'),(3,'OTHER')),
test_ma(id,module_code,submoduletype_code,ma_number,submission_date,decision_date) AS (
 VALUES (1,'NMR','MDCN','MA1',DATE '2025-01-01',DATE '2025-02-01'),
 (2,'NMR','MDCN','MA2',DATE '2025-01-01',DATE '2025-02-01'),
 (3,'NMR','MDCN','MA3',DATE '2025-01-01',NULL),
 (4,'NMR','MDCN','MA4',DATE '2025-01-01',NULL),
 (5,'NMR','MDCN','MA5',DATE '2025-01-01',NULL)),
test_log(id,ma_id,from_status_id,to_status_id,modified_date) AS (
 VALUES (1,1,3,1,TIMESTAMP '2025-01-01'),(2,1,1,2,TIMESTAMP '2025-01-31'),
 (3,2,3,1,TIMESTAMP '2025-01-01'),(4,2,1,2,TIMESTAMP '2025-01-02'),
 (5,2,2,1,TIMESTAMP '2025-02-01'),(6,2,1,2,TIMESTAMP '2025-03-04'),
 (7,3,3,1,TIMESTAMP '2025-01-01'),
 (8,4,3,1,TIMESTAMP '2025-01-01'),(9,4,1,3,TIMESTAMP '2025-01-02'),
 (10,5,3,1,TIMESTAMP '2025-01-01'),(11,5,1,2,TIMESTAMP '2025-01-02')),
`;
async function main() {
 const c = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized:false }, options:'-c default_transaction_read_only=on' });
 await c.connect();
 try {
  for (const basis of ['submission', 'decision']) {
   const q = original.replace('WITH target AS (', fixture+'target AS (')
    .replaceAll('settings.system_setting','test_settings').replaceAll('common.ma_status','test_status')
    .replaceAll('license.ma_log_status','test_log').replaceAll('license.vwma','test_ma')
    .replace('@dateFilter', `AND v.${basis}_date >= DATE '2025-01-01' AND v.${basis}_date < DATE '2026-01-01'`);
   const row = (await c.query(q)).rows[0];
   assert.equal(Number(row.on_time_count),basis === 'submission' ? 2 : 1);
   assert.equal(Number(row.total_count),basis === 'submission' ? 3 : 2);
   console.log(`PASS ${basis}: target boundary, repeated late cycle, pending cycle, other transition, undecided cohort`);
  }
 } finally { await c.end(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
