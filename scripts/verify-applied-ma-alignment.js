/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS script. */
// Executes the deployed definitions, without rebuilding or overwriting migration artifacts.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { loadDatabaseUrl } = require('./load-database-url');
const { PRODUCTS } = require('./ma-report-alignment');
const { comparisonBundle, verifyGroup } = require('./prepare-ma-report-alignment');
const directory = path.resolve(__dirname, '../analysis/ma-report-alignment');

async function main() {
  const year = Number(process.argv[2]);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Specify a year, e.g. 2025');
  const approved = JSON.parse(fs.readFileSync(path.join(directory, 'proposed-reports.json'), 'utf8'));
  const client = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000, options: '-c default_transaction_read_only=on -c statement_timeout=180000' });
  await client.connect();
  try {
    const readOnly = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
    if (readOnly !== 'on') throw new Error('Read-only verification required');
    const stored = (await client.query('SELECT id,title,query,filter_columns FROM kpi.kpi WHERE id=ANY($1::int[])', [approved.map(r => r.id)])).rows;
    const reports = approved.map(report => {
      const deployed = stored.find(r => r.id === report.id);
      if (!deployed || deployed.query !== report.query || deployed.filter_columns !== report.filter_columns) throw new Error(`Deployed report ${report.id} differs from the migration`);
      return { ...report, ...deployed };
    });
    const dates = [`${year}-01-01`, `${year + 1}-01-01`];
    const results = new Map();
    const checks = [];
    for (const product of PRODUCTS) for (const basis of ['submission', 'decision']) {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      try {
        const group = reports.filter(r => r.product === product.key && r.basis === basis);
        for (const row of (await client.query(comparisonBundle(group), dates)).rows) results.set(row.id, row.rows);
        checks.push(verifyGroup(reports, results, product, basis));
        await client.query('ROLLBACK');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      fs.writeFileSync(path.join(directory, `post-migration-verification-${year}.json`), JSON.stringify({ dates, readOnly, source: 'deployed report definitions', verifiedAt: new Date().toISOString(), checks, results: Object.fromEntries(results) }, null, 2));
      console.log(`PASS ${year} ${product.key} ${basis}`);
    }
    console.log(`Verified ${checks.reduce((n, group) => n + group.checks.length, 0)} checks against ${reports.length} stored reports for ${year}.`);
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
