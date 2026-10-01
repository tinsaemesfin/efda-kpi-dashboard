/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { loadDatabaseUrl } = require('./load-database-url');
const { events } = require('./ma-effective-decision');
const out = path.resolve(__dirname, '../analysis/ma-fir-restoration-2026-10-01');
const original = fs.readFileSync(path.join(out, 'original-fir.sql'), 'utf8').split('$q$')[1];
const definitions = ['submission', 'decision'].map((basis, index) => ({
  id: 250 + index, basis, name: `KPIMA-FIRR-STL-${basis.toUpperCase()}`,
  query: basis === 'submission' ? original : original.replace('WITH target AS (', `WITH ${events}, target AS (`)
    .replace('FROM license.vwma v', 'FROM license.vwma v JOIN effective_decision ed ON ed.ma_id=v.id'),
  filter_columns: JSON.stringify([{ FieldName: 'dateFilter', DType: { id: '6', name: 'DateRange' }, IsInnerFilter: true,
    Title: basis === 'submission' ? 'Submission date' : 'Decision date', Alias: basis === 'submission' ? 'v' : 'ed',
    OverridingFieldName: basis === 'submission' ? 'submission_date' : 'decided_at', ParameterName: 'dateFilter', Type: 'DateRange' }]),
}));
async function main() {
  const apply = process.argv[2] === 'apply';
  const c = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false }, options: '-c statement_timeout=300000' });
  await c.connect();
  try {
    await c.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
    if (apply) await c.query('LOCK TABLE kpi.kpi IN SHARE ROW EXCLUSIVE MODE');
    const before = (await c.query('SELECT * FROM kpi.kpi ORDER BY id')).rows;
    if (apply) {
      const file = path.join(out, `catalogue-backup-${Date.now()}.json`);
      const backup = JSON.stringify(before, null, 2);
      const fd = fs.openSync(file, 'wx');
      try { fs.writeFileSync(fd, backup); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      if (fs.readFileSync(file, 'utf8') !== backup) throw Error('Backup readback failed');
    }
    const results = [];
    for (const def of definitions) {
      const existing = before.find(r => r.id === def.id);
      if (existing && (existing.name !== def.name || existing.query !== def.query || existing.filter_columns !== def.filter_columns)) throw Error(`Report ID collision: ${def.id}`);
      fs.writeFileSync(path.join(out, `${def.basis}.sql`), def.query);
      const f = JSON.parse(def.filter_columns)[0];
      const dated = def.query.replace('@dateFilter', `AND ${f.Alias}.${f.OverridingFieldName} >= $1::date AND ${f.Alias}.${f.OverridingFieldName} < $2::date`);
      await c.query('EXPLAIN ' + def.query.replace('@dateFilter', ''));
      results.push({ id: def.id, basis: def.basis, rows: (await c.query(dated, ['2025-01-01', '2026-01-01'])).rows });
      if (apply && !existing) await c.query(`INSERT INTO kpi.kpi (id,title,created_date,description,query,series_columns,filter_columns,report_type_id,priority,is_active,modified_date,name,rowguid,width,max_rows,is_mobile,column_definitions,report_group_id,kpi_group)
        SELECT $1,$2,NOW(),$3,$4,series_columns,$5,report_type_id,priority,true,NOW(),$6,gen_random_uuid(),width,max_rows,is_mobile,'[]',report_group_id,'MA' FROM kpi.kpi WHERE id=8`,
      [def.id, `MA FIR response to team leader (${def.basis} date)`, 'Original FIRR to STL calculation: every completed immediate cycle within the configured target.', def.query, def.filter_columns, def.name]);
    }
    const legacy = (await c.query(original.replace('@dateFilter', 'AND v.created_date >= $1::date AND v.created_date < $2::date'), ['2025-01-01', '2026-01-01'])).rows;
    const after = (await c.query('SELECT * FROM kpi.kpi ORDER BY id')).rows;
    if (before.some(r => JSON.stringify(r) !== JSON.stringify(after.find(a => a.id === r.id)))) throw Error('Existing report changed');
    if (apply && after.length !== before.length + definitions.filter(d => !before.some(r => r.id === d.id)).length) throw Error('Unexpected catalogue row count');
    if (apply) {
      const seq = (await c.query("SELECT pg_get_serial_sequence('kpi.kpi','id') AS seq")).rows[0].seq;
      if (seq) await c.query('SELECT setval($1::regclass, GREATEST((SELECT MAX(id) FROM kpi.kpi), (SELECT last_value FROM ' + seq + ')))', [seq]);
    }
    await c.query(apply ? 'COMMIT' : 'ROLLBACK');
    fs.writeFileSync(path.join(out, apply ? 'deployment.json' : 'verification.json'), JSON.stringify({ timestamp: new Date().toISOString(), applied: apply, originalCreatedDate2025: legacy, results, existingReportsUnchanged: before.length }, null, 2));
    fs.writeFileSync(path.join(out, 'reports.json'), JSON.stringify(definitions, null, 2));
    console.log(JSON.stringify({ applied: apply, results, originalCreatedDate2025: legacy, existingReportsUnchanged: before.length }, null, 2));
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { await c.end(); }
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { definitions, original };
