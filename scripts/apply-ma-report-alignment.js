/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS script. */
// Explicitly authorized on 2026-09-14. Backs up the complete report table before any UPDATE.
// Usage: node scripts/apply-ma-report-alignment.js --apply <absolute Downloads directory>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { loadDatabaseUrl } = require('./load-database-url');
const { migrationSql } = require('./prepare-ma-report-alignment');

const artifactDir = path.resolve(__dirname, '../analysis/ma-report-alignment');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
function durableWrite(filename, content) {
  const fd = fs.openSync(filename, 'wx');
  try { fs.writeFileSync(fd, content, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (digest(fs.readFileSync(filename)) !== digest(content)) throw new Error(`Backup readback failed: ${filename}`);
}
const connection = () => new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

async function main() {
  const downloads = process.argv[3];
  if (process.argv[2] !== '--apply' || !downloads || !path.isAbsolute(downloads) || !fs.statSync(downloads).isDirectory()) {
    throw new Error('Usage: node scripts/apply-ma-report-alignment.js --apply <existing absolute Downloads directory>');
  }
  const reports = JSON.parse(fs.readFileSync(path.join(artifactDir, 'proposed-reports.json'), 'utf8'));
  if (reports.length !== 98 || new Set(reports.map(r => r.id)).size !== 98) throw new Error('Expected 98 distinct approved reports');
  const sql = fs.readFileSync(path.join(artifactDir, 'apply-reviewed-alignment.sql'), 'utf8');
  if (sql !== migrationSql(reports)) throw new Error('Saved migration differs from approved report definitions');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(downloads, `EFDA-kpi-table-backup-${stamp}`);
  fs.mkdirSync(backupDir);
  const receipt = { startedAt: new Date().toISOString(), status: 'not-applied', backupDir, migrationSha256: digest(sql), reportIds: reports.map(r => r.id) };
  const c = connection();
  let committed = false;
  try {
    await c.connect();
    await c.query('BEGIN');
    await c.query("SET LOCAL lock_timeout = '15s'");
    await c.query("SET LOCAL statement_timeout = '90s'");
    // Reads remain available; concurrent catalogue writes cannot race the backup.
    await c.query('LOCK TABLE kpi.kpi IN SHARE ROW EXCLUSIVE MODE');
    receipt.database = (await c.query('SELECT current_database() AS name')).rows[0].name;
    const current = (await c.query('SELECT id,query,filter_columns FROM kpi.kpi ORDER BY id')).rows;
    for (const proposed of reports) {
      const stored = current.find(row => row.id === proposed.id);
      if (!stored || stored.query !== proposed.previous_query || stored.filter_columns !== proposed.previous_filter_columns) {
        throw new Error(`Report ${proposed.id} changed since review; migration aborted`);
      }
    }
    const raw = (await c.query("SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id), '[]'::jsonb)::text AS data FROM kpi.kpi t")).rows[0].data;
    const columns = (await c.query("SELECT a.attname AS name, format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,a.attidentity AS identity,a.attgenerated AS generated,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid='kpi.kpi'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum")).rows;
    const constraints = (await c.query("SELECT conname AS name,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='kpi.kpi'::regclass")).rows;
    const indexes = (await c.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='kpi' AND tablename='kpi'")).rows;
    const triggers = (await c.query("SELECT tgname,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='kpi.kpi'::regclass AND NOT tgisinternal")).rows;
    if (columns.some(column => column.generated)) throw new Error('Generated columns require a tailored restore; aborting before updates');
    receipt.backupRowCount = current.length;
    receipt.backupSha256 = digest(raw);
    durableWrite(path.join(backupDir, 'kpi.kpi-data.json'), raw);
    durableWrite(path.join(backupDir, 'table-metadata.json'), JSON.stringify({ database: receipt.database, table: 'kpi.kpi', columns, constraints, indexes, triggers }, null, 2));
    const quote = name => '"' + name.replaceAll('"', '""') + '"';
    const names = columns.map(col => quote(col.name)).join(', ');
    const tag = '$backup_' + receipt.backupSha256 + '$';
    if (raw.includes(tag)) throw new Error('Backup delimiter collision');
    const restore = `-- Data-only restore into the existing kpi.kpi table. Review before execution.\n-- Restores every backed-up row/column by id; does not remove newer rows or change schema.\nBEGIN;\nINSERT INTO kpi.kpi (${names}) OVERRIDING SYSTEM VALUE\nSELECT ${names} FROM jsonb_populate_recordset(NULL::kpi.kpi, ${tag}${raw}${tag}::jsonb)\nON CONFLICT (id) DO UPDATE SET ${columns.filter(col => col.name !== 'id').map(col => `${quote(col.name)}=EXCLUDED.${quote(col.name)}`).join(', ')};\nCOMMIT;\n`;
    durableWrite(path.join(backupDir, 'restore-table-data.sql'), restore);
    durableWrite(path.join(backupDir, 'applied-migration.sql'), sql);
    durableWrite(path.join(backupDir, 'rollback-ma-reports.sql'), fs.readFileSync(path.join(artifactDir, 'rollback-reviewed-alignment.sql'), 'utf8'));
    durableWrite(path.join(backupDir, 'README.txt'), `Database: ${receipt.database}\nTable: kpi.kpi\nRows: ${current.length}\nCaptured: ${receipt.startedAt}\n\nFull data-only snapshot taken while catalogue writes were locked. JSON preserves all columns, and table-metadata.json records types, defaults, constraints, indexes and triggers.\nrestore-table-data.sql restores backed-up rows into the EXISTING table by id; it is not a schema/full-database restore and does not delete rows added after this backup.\nrollback-ma-reports.sql reverses only the approved migration's query/filter changes with drift guards.\nNo restore or rollback was run.\n`);
    const backupFromDisk = fs.readFileSync(path.join(backupDir, 'kpi.kpi-data.json'), 'utf8');
    // Test the exact restore conversion without writing to the table.
    const roundtrip = (await c.query("WITH restored AS (SELECT * FROM jsonb_populate_recordset(NULL::kpi.kpi,$1::jsonb)), differences AS ((SELECT to_jsonb(t) FROM kpi.kpi t EXCEPT SELECT to_jsonb(r) FROM restored r) UNION ALL (SELECT to_jsonb(r) FROM restored r EXCEPT SELECT to_jsonb(t) FROM kpi.kpi t)) SELECT COUNT(*)::int AS differences FROM differences", [backupFromDisk])).rows[0];
    if (roundtrip.differences !== 0) throw new Error('Backup restore round-trip mismatch');
    durableWrite(path.join(backupDir, 'backup-verification.json'), JSON.stringify({ rowCount: current.length, sha256: receipt.backupSha256, roundTripDifferences: 0, verifiedAt: new Date().toISOString() }, null, 2));
    console.log(`Verified backup: ${current.length} rows saved to ${backupDir}`);
    // Use the exact reviewed statements inside our existing backup transaction.
    await c.query(sql.slice(sql.indexOf('BEGIN;') + 'BEGIN;'.length, sql.lastIndexOf('COMMIT;')));
    const after = (await c.query('SELECT id,query,filter_columns FROM kpi.kpi ORDER BY id')).rows;
    if (after.length !== current.length || reports.some(p => !after.some(r => r.id === p.id && r.query === p.query && r.filter_columns === p.filter_columns))) throw new Error('Updated report definitions failed validation');
    const unchanged = (await c.query("WITH before AS (SELECT * FROM jsonb_populate_recordset(NULL::kpi.kpi,$1::jsonb)) SELECT COUNT(*)::int AS differences FROM before b FULL JOIN kpi.kpi a USING(id) WHERE CASE WHEN COALESCE(a.id,b.id)=ANY($2::int[]) THEN (to_jsonb(a)-ARRAY['query','filter_columns','modified_date']) IS DISTINCT FROM (to_jsonb(b)-ARRAY['query','filter_columns','modified_date']) ELSE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) END", [backupFromDisk, reports.map(r => r.id)])).rows[0];
    if (unchanged.differences !== 0) throw new Error('Unrelated table data changed; rolling back');
    receipt.unrelatedDifferences = 0;
    await c.query('COMMIT');
    committed = true;
    receipt.status = 'committed';
    receipt.committedAt = new Date().toISOString();
    console.log('Committed 98 report updates; unrelated rows and fields unchanged.');
  } catch (error) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    receipt.status = committed ? 'committed-follow-up-error' : 'failed-check-database-before-retrying';
    receipt.error = error.message;
    throw error;
  } finally {
    await c.end();
    fs.writeFileSync(path.join(backupDir, 'migration-receipt.json'), JSON.stringify(receipt, null, 2));
    fs.writeFileSync(path.join(artifactDir, 'migration-receipt.json'), JSON.stringify(receipt, null, 2));
  }
  const verify = connection();
  try {
    await verify.connect();
    await verify.query('BEGIN READ ONLY');
    const stored = (await verify.query('SELECT id,query,filter_columns FROM kpi.kpi WHERE id=ANY($1::int[])', [reports.map(r => r.id)])).rows;
    if (stored.length !== 98 || reports.some(p => !stored.some(r => r.id === p.id && r.query === p.query && r.filter_columns === p.filter_columns))) throw new Error('Fresh-connection persistence check failed');
    receipt.persistedReportsVerified = stored.length;
    await verify.query('ROLLBACK');
    console.log('Fresh connection confirms all 98 migrated reports are persisted.');
  } finally {
    await verify.end();
    fs.writeFileSync(path.join(backupDir, 'migration-receipt.json'), JSON.stringify(receipt, null, 2));
    fs.writeFileSync(path.join(artifactDir, 'migration-receipt.json'), JSON.stringify(receipt, null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
