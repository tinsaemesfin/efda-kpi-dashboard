/* eslint-disable @typescript-eslint/no-require-imports -- Standalone database maintenance script. */
// Prepare/verify are read-only; apply requires the saved, validated proposal and backs up the full table.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { loadDatabaseUrl } = require('./load-database-url');
const { PRODUCTS } = require('./ma-report-alignment');
const { events, transform } = require('./ma-effective-decision');
const { executable, verifyGroup, migrationSql } = require('./prepare-ma-report-alignment');

const out = path.resolve(__dirname, '../analysis/ma-date-selector-2026-10-01');
const fields = 'id,module_code,submoduletype_code,ma_type_code,ma_status_code,ma_status_display_name,application_type,approval_pathway,approval_pathway_code,is_sra,is_food_notification,ma_number,created_date,submission_date';
function connection(readOnly = true) {
  const client = new Client({
    connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
    options: `-c statement_timeout=300000${readOnly ? ' -c default_transaction_read_only=on' : ''}`,
  });
  // Query promises still reject on connection errors; avoid an unhandled idle-client event.
  client.on('error', () => {});
  return client;
}
const save = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
const read = name => JSON.parse(fs.readFileSync(path.join(out, name), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const reportHash = reports => hash(JSON.stringify(reports.map(r => ({ id: r.id, query: r.query, filter_columns: r.filter_columns }))));
function durableWrite(filename, value) {
  const fd = fs.openSync(filename, 'wx');
  try { fs.writeFileSync(fd, value); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (hash(fs.readFileSync(filename)) !== hash(value)) throw Error('Backup readback failed');
}
function catalogReports(rows) {
  const reports = [];
  for (const p of PRODUCTS) for (const [index, basis] of ['submission', 'decision'].entries()) {
    const kinds = [['standard-face', p.face[index]], ...p.standard[index].map((id, i) => [`standard-${i + 1}`, id]),
      ...['time-face', 'median', 'average'].map((kind, i) => [kind, p.time[index][i]]),
      ...['par-face', 'par-drilldown'].map((kind, i) => [kind, p.par[index][i]])];
    for (const [kind, id] of kinds) {
      const row = rows.find(r => r.id === id);
      if (!row || row.kpi_group !== 'MA') throw Error(`Missing or non-MA report ${id}`);
      reports.push({ ...row, product: p.key, basis, kind });
    }
  }
  if (reports.length !== 98) throw Error('Unexpected active report count');
  return reports;
}
function restoreReport(row) {
  let query = row.query;
  const metadata = JSON.parse(row.filter_columns);
  const date = metadata.find(f => f.ParameterName === 'dateFilter');
  if (!date) throw Error(`Missing date filter ${row.id}`);
  const affectedProduct = row.product !== 'cosmetics';
  if (affectedProduct && row.kind.startsWith('standard') && row.basis === 'decision') {
    // The first medicine rollout assigned submission dates to decision_date for KPI 1-3.
    query = query.replace(/CASE WHEN m\.module_code IN \('NMR','REN'\) OR \(m\.module_code='VAR' AND m\.ma_type_code='VMIN'\) THEN m\.submission_date::date ELSE ed\.decided_at::date END AS decision_date/g,
      'ed.decided_at::date AS decision_date');
    query = query.replaceAll('m.submission_date::date AS decision_date', 'ed.decided_at::date AS decision_date');
    if (/CASE WHEN m\.module_code/.test(query)) throw Error(`Unexpected synthetic decision projection ${row.id}`);
    if (!query.includes('effective_ma_source AS MATERIALIZED')) {
      // Optimized MD reports need the same agreed log-event date as the other decision reports.
      query = transform({ ...row, query });
    } else {
      query = query.replaceAll('@dateFilter', 'AND decision_date IS NOT NULL\n    @dateFilter');
    }
    date.Title = 'Decision date'; date.OverridingFieldName = 'decision_date'; date.Alias = '';
  }
  if (affectedProduct && ['time-face', 'median', 'average'].includes(row.kind) && row.basis === 'submission') {
    query = query.replace(/^[ \t]*AND (?:[a-z]+\.)?decision_date IS NOT NULL\r?\n/gm, '');
    date.Title = 'Submission date'; date.OverridingFieldName = 'submission_date'; date.Alias = '';
  }
  if (affectedProduct && row.kind.startsWith('par') && row.basis === 'submission') {
    // Keep the real decision timestamp for the upload clock; only cohort selection changes.
    date.Title = 'Submission date'; date.OverridingFieldName = 'submission_date'; date.Alias = '';
  }
  const filter_columns = JSON.stringify(metadata);
  if (date.OverridingFieldName !== `${row.basis}_date`) throw Error(`Wrong restored date field ${row.id}`);
  return { ...row, query, filter_columns, previous_query: row.query, previous_filter_columns: row.filter_columns };
}
function bundle(reports) {
  const ctes = [`ma_snapshot AS MATERIALIZED (SELECT ${fields},decision_date FROM license.vwma)`,
    'time_snapshot AS MATERIALIZED (SELECT * FROM license.vwma_unified_processing_time)',
    'log_snapshot AS MATERIALIZED (SELECT ma_id,modified_date,from_status_code,to_status_code FROM license.vwma_log_status_new)'];
  for (const r of reports) {
    const sql = executable(r).trim().replace(/;$/, '').replace(/license\.vwma_unified_processing_time\b/g, 'time_snapshot')
      .replace(/license\.vwma_log_status_new\b/g, 'log_snapshot').replace(/license\.vwma\b/g, 'ma_snapshot');
    ctes.push(`report_${r.id} AS (${sql})`);
  }
  return `WITH ${ctes.join(',\n')} ` + reports.map(r => `SELECT ${r.id} AS id,COALESCE(jsonb_agg(to_jsonb(q)),'[]'::jsonb) AS rows FROM report_${r.id} q`).join(' UNION ALL ');
}
async function reconcile(reports, filename, year = 2025) {
  const saved = fs.existsSync(path.join(out, filename)) ? read(filename) : null;
  const resume = saved?.reportSha256 === reportHash(reports) && saved.year === year && saved.checks.length < 10;
  const results = new Map(resume ? Object.entries(saved.results).map(([id, rows]) => [Number(id), rows]) : []);
  const checks = resume ? saved.checks : [];
  for (const p of PRODUCTS) for (const basis of ['submission', 'decision']) {
    if (checks.some(group => group.product === p.key && group.basis === basis)) continue;
    const c = connection();
    await c.connect();
    try {
      await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const group = reports.filter(r => r.product === p.key && r.basis === basis);
      for (const row of (await c.query(bundle(group), [`${year}-01-01`, `${year + 1}-01-01`])).rows) results.set(row.id, row.rows);
      checks.push(verifyGroup(reports, results, p, basis));
      await c.query('ROLLBACK');
    } catch (error) { await c.query('ROLLBACK').catch(() => {}); throw error; }
    finally { await c.end(); }
    save(filename, { year, reportSha256: reportHash(reports), checkedAt: new Date().toISOString(), checks, results: Object.fromEntries(results) });
    console.log(`PASS ${p.key} ${basis}: face/drilldown reconciliation`);
  }
  return checks.reduce((n, group) => n + group.checks.length, 0);
}
async function prepare(c) {
  const rows = (await c.query('SELECT * FROM kpi.kpi ORDER BY id')).rows;
  const reports = catalogReports(rows).map(restoreReport);
  const changed = reports.filter(r => r.query !== r.previous_query || r.filter_columns !== r.previous_filter_columns);
  if (changed.length !== 40 || changed.some(r => r.product === 'cosmetics')) throw Error(`Unexpected update count ${changed.length}`);
  save('reports.json', reports); save('proposed-reports.json', changed);
  save('apply.sql', migrationSql(changed)); save('rollback.sql', migrationSql(changed, true));
  for (const r of changed) save(`report-${r.id}-proposed.sql`, r.query);
  for (const r of reports) {
    await c.query('EXPLAIN ' + executable(r), ['2025-01-01', '2026-01-01']);
    await c.query('EXPLAIN ' + r.query.replaceAll('@dateFilter', ''));
  }
  save('planning.json', { planned: reports.length, datedAndUnfiltered: true, changed: changed.length });
  console.log(`Prepared ${changed.length} updates; all ${reports.length} reports planned in both forms.`);
}
async function apply(c) {
  const reports = read('proposed-reports.json'), validation = read('candidate-2025.json');
  if (reports.length !== 40 || validation.checks.length !== 10 || validation.checks.reduce((n, g) => n + g.checks.length, 0) !== 350) throw Error('Complete proposal validation required');
  const expected = read('reports.json');
  if (validation.reportSha256 !== reportHash(expected)) throw Error('Validation belongs to a different proposal');
  if (reports.some(r => !expected.some(e => e.id === r.id && e.query === r.query && e.filter_columns === r.filter_columns))) throw Error('Proposal mismatch');
  await c.query('BEGIN');
  let committed = false;
  const receipt = { database: 'eris_dev_2026_22_06', status: 'not-applied', startedAt: new Date().toISOString(), reportSha256: reportHash(expected), reportIds: reports.map(r => r.id) };
  try {
    await c.query("SET LOCAL lock_timeout='15s'");
    await c.query('LOCK TABLE kpi.kpi IN SHARE ROW EXCLUSIVE MODE');
    const rows = (await c.query('SELECT id,query,filter_columns FROM kpi.kpi ORDER BY id')).rows;
    for (const r of expected) {
      const live = rows.find(s => s.id === r.id);
      if (!live || live.query !== r.previous_query || live.filter_columns !== r.previous_filter_columns) throw Error(`Catalogue drift ${r.id}`);
    }
    const raw = (await c.query("SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text AS data FROM kpi.kpi t")).rows[0].data;
    const metadata = (await c.query("SELECT attname AS name,format_type(atttypid,atttypmod) AS type,attgenerated AS generated FROM pg_attribute WHERE attrelid='kpi.kpi'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum")).rows;
    if (metadata.some(col => col.generated)) throw Error('Generated columns require a tailored full-table restore');
    const backup = path.join(out, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    fs.mkdirSync(backup);
    receipt.backupDir = backup; receipt.backupSha256 = hash(raw); receipt.backupRows = rows.length;
    durableWrite(path.join(backup, 'kpi-table.json'), raw);
    durableWrite(path.join(backup, 'columns.json'), JSON.stringify(metadata, null, 2));
    durableWrite(path.join(backup, 'rollback.sql'), migrationSql(reports, true));
    const quote = s => '"' + s.replaceAll('"', '""') + '"';
    const names = metadata.map(col => quote(col.name)).join(', ');
    const tag = '$backup_' + hash(raw) + '$';
    const restore = `-- Full data restore into the existing table, preserving rows added after the snapshot.\nBEGIN;\nINSERT INTO kpi.kpi (${names}) OVERRIDING SYSTEM VALUE SELECT ${names} FROM jsonb_populate_recordset(NULL::kpi.kpi,${tag}${raw}${tag}::jsonb) ON CONFLICT(id) DO UPDATE SET ${metadata.filter(col => col.name !== 'id').map(col => `${quote(col.name)}=EXCLUDED.${quote(col.name)}`).join(', ')};\nCOMMIT;\n`;
    durableWrite(path.join(backup, 'restore-table.sql'), restore);
    const fromDisk = fs.readFileSync(path.join(backup, 'kpi-table.json'), 'utf8');
    const roundtrip = (await c.query("WITH restored AS (SELECT * FROM jsonb_populate_recordset(NULL::kpi.kpi,$1::jsonb)), diffs AS ((SELECT to_jsonb(t) FROM kpi.kpi t EXCEPT SELECT to_jsonb(r) FROM restored r) UNION ALL (SELECT to_jsonb(r) FROM restored r EXCEPT SELECT to_jsonb(t) FROM kpi.kpi t)) SELECT COUNT(*)::int AS n FROM diffs", [fromDisk])).rows[0].n;
    if (roundtrip !== 0) throw Error('Backup roundtrip mismatch');
    console.log(`Verified full table backup: ${rows.length} rows.`);
    for (const r of reports) {
      const result = await c.query('UPDATE kpi.kpi SET query=$1,filter_columns=$2,modified_date=NOW() WHERE id=$3 AND query=$4 AND filter_columns IS NOT DISTINCT FROM $5', [r.query, r.filter_columns, r.id, r.previous_query, r.previous_filter_columns]);
      if (result.rowCount !== 1) throw Error(`Concurrent change ${r.id}`);
    }
    const diff = (await c.query("WITH before AS (SELECT * FROM jsonb_populate_recordset(NULL::kpi.kpi,$1::jsonb)) SELECT COUNT(*)::int AS n FROM before b FULL JOIN kpi.kpi a USING(id) WHERE CASE WHEN COALESCE(a.id,b.id)=ANY($2::int[]) THEN (to_jsonb(a)-ARRAY['query','filter_columns','modified_date']) IS DISTINCT FROM (to_jsonb(b)-ARRAY['query','filter_columns','modified_date']) ELSE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) END", [fromDisk, reports.map(r => r.id)])).rows[0].n;
    if (diff) throw Error('Unrelated data changed');
    const after = (await c.query('SELECT id,query,filter_columns FROM kpi.kpi')).rows;
    if (reports.some(r => !after.some(s => s.id === r.id && s.query === r.query && s.filter_columns === r.filter_columns))) throw Error('Readback mismatch');
    await c.query('COMMIT'); committed = true;
    receipt.status = 'committed'; receipt.committedAt = new Date().toISOString(); receipt.unrelatedDifferences = 0;
  } finally {
    if (!committed) await c.query('ROLLBACK');
    save('deployment.json', receipt);
  }
  console.log('Committed 40 date-mode updates.');
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const mode = process.argv[2];
  if (!['prepare', 'candidate', 'apply', 'verify'].includes(mode)) throw Error('Usage: node scripts/restore-ma-date-selector.js prepare|candidate|apply|verify [year]');
  const c = connection(mode !== 'apply');
  await c.connect();
  try {
    if ((await c.query('SELECT current_database() AS name')).rows[0].name !== 'eris_dev_2026_22_06') throw Error('Unexpected database');
    if (mode === 'prepare') return await prepare(c);
    if (mode === 'apply') return await apply(c);
    const reports = read('reports.json');
    if (mode === 'verify') {
      const rows = (await c.query('SELECT id,query,filter_columns FROM kpi.kpi')).rows;
      if (reports.some(r => !rows.some(s => s.id === r.id && s.query === r.query && s.filter_columns === r.filter_columns))) throw Error('Fresh connection persistence mismatch');
      save('persistence.json', { verifiedAt: new Date().toISOString(), matched: reports.length });
    }
    const year = Number(process.argv[3] || 2025);
    console.log(`Passed ${await reconcile(reports, `${mode === 'candidate' ? 'candidate' : 'deployed'}-${year}.json`, year)} checks.`);
  } finally { await c.end(); }
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { restoreReport, catalogReports, bundle, events };
