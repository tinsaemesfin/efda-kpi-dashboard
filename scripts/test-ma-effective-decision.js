/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('assert/strict');const fs=require('fs');const {Client}=require('pg');
const {events}=require('./ma-effective-decision');const {loadDatabaseUrl}=require('./load-database-url');
const fixture=`(VALUES
 (1,'2023-06-01'::timestamp,'SFA','APR'),(1,'2025-01-01'::timestamp,'SUSP','APR'),(1,'2025-02-01'::timestamp,'APR','APR'),
 (2,'2023-01-01'::timestamp,'SFA','APR'),(2,'2025-12-31 23:59:59'::timestamp,'SFR','REJ'),(2,'2026-01-01'::timestamp,'REJ','REJ'),
 (3,'2022-01-01'::timestamp,'SFR','REJ'),(3,'2025-02-06'::timestamp,'APR','CNCL'),
 (4,'2025-01-01'::timestamp,NULL,'APR'),
 (5,'2025-01-01'::timestamp,'SUSP','APR'),
 (6,'2025-01-01'::timestamp,'SFA','APR'),(6,'2025-02-01'::timestamp,'APR','REJ'),
 (7,'2025-01-01'::timestamp,'APR','SUSP'),(7,'2025-03-01'::timestamp,'SFR','REJ')
 ) AS fixture(ma_id,modified_date,from_status_code,to_status_code)`;
const c=new Client({connectionString:loadDatabaseUrl(),ssl:{rejectUnauthorized:false},options:'-c default_transaction_read_only=on'});
(async()=>{await c.connect();try{
 const rows=(await c.query('WITH '+events.replace('license.vwma_log_status_new',fixture)+" SELECT ma_id,decided_at::date::text AS day,decision FROM effective_decision ORDER BY ma_id")).rows;
 assert.deepEqual(rows,[{ma_id:1,day:'2023-06-01',decision:'APR'},{ma_id:2,day:'2025-12-31',decision:'REJ'},{ma_id:3,day:'2025-02-06',decision:'APR'},{ma_id:4,day:'2025-01-01',decision:'APR'},{ma_id:6,day:'2025-01-01',decision:'APR'},{ma_id:7,day:'2025-03-01',decision:'REJ'}]);
 const boundary=(await c.query("SELECT '2025-12-31 23:59:59'::timestamp::date <= DATE '2025-12-31' AS included, '2026-01-01'::timestamp::date <= DATE '2025-12-31' AS excluded, EXTRACT(EPOCH FROM ('2025-12-31 23:59:59'::timestamp-'2025-12-31 12:00:00'::timestamp))/86400 AS publication_days")).rows[0];
 assert.equal(boundary.included,true);assert.equal(boundary.excluded,false);assert.ok(Number(boundary.publication_days)<0.5);
 const reports=JSON.parse(fs.readFileSync('analysis/ma-effective-decision/all-reports.json','utf8'));
 assert.equal(reports.filter(r=>r.basis==='submission'&&!r.kind.startsWith('par-')).every(r=>r.query===r.previous_query),true);
 assert.equal(reports.filter(r=>r.kind.startsWith('par-')).every(r=>r.query.includes('v.effective_decision_at AS approval_date')),true);
 console.log('PASS event selection, fallback, repeated statuses, missing event, year boundary, timestamp precision and submission invariants');
}finally{await c.end();}})().catch(e=>{console.error(e);process.exitCode=1;});
