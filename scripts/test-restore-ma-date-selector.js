/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node regression tests. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { restoreReport } = require('./restore-ma-date-selector');

const filter = field => JSON.stringify([{ ParameterName: 'dateFilter', OverridingFieldName: field, Alias: '', Title: 'Date', Type: 'DateRange' }]);
test('medicine decision mode removes the mixed submission/decision projection without dropping the completed-only numerator', () => {
  const row = { id: 155, product: 'medicine', basis: 'decision', kind: 'standard-face', filter_columns: filter('submission_date'),
    query: `WITH effective_ma_source AS MATERIALIZED (SELECT id FROM license.vwma), effective_ma AS (SELECT m.*,CASE WHEN m.module_code IN ('NMR','REN') OR (m.module_code='VAR' AND m.ma_type_code='VMIN') THEN m.submission_date::date ELSE ed.decided_at::date END AS decision_date FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id) SELECT CASE WHEN ma.ma_status_code IN ('APR','REJ','SUSP','CNCL') THEN duration END AS duration FROM effective_ma ma WHERE 1=1 @dateFilter` };
  const result = restoreReport(row);
  assert.match(result.query, /ed\.decided_at::date AS decision_date/);
  assert.doesNotMatch(result.query, /THEN m\.submission_date/);
  assert.match(result.query, /AND decision_date IS NOT NULL/);
  assert.match(result.query, /CASE WHEN ma\.ma_status_code IN \('APR','REJ','SUSP','CNCL'\)/);
  assert.equal(JSON.parse(result.filter_columns)[0].OverridingFieldName, 'decision_date');
});
test('optimized medical device decision reports acquire the agreed effective event date', () => {
  const result = restoreReport({ id: 158, product: 'medicalDevice', basis: 'decision', kind: 'standard-face', filter_columns: filter('submission_date'),
    query: "WITH received AS (SELECT v.id FROM license.vwma v WHERE v.submoduletype_code='MD' @dateFilter) SELECT COUNT(*) AS total_count FROM received;" });
  assert.match(result.query, /FROM effective_ma v/);
  assert.match(result.query, /COALESCE\(from_status_code,''\) NOT IN \('SUSP','APR','REJ'\)/);
  assert.match(result.query, /AND decision_date IS NOT NULL/);
  assert.match(result.query, /COUNT\(\*\) AS total_count/);
});
test('medicine KPI 1 drilldown also replaces the submission date masquerading as a decision date', () => {
  const result = restoreReport({ id: 160, product: 'medicine', basis: 'decision', kind: 'standard-1', filter_columns: filter('submission_date'),
    query: 'WITH effective_ma_source AS MATERIALIZED (SELECT id FROM license.vwma), effective_ma AS (SELECT m.*,m.submission_date::date AS decision_date FROM effective_ma_source m LEFT JOIN effective_decision ed ON ed.ma_id=m.id) SELECT * FROM effective_ma WHERE 1=1 @dateFilter' });
  assert.doesNotMatch(result.query, /m\.submission_date::date AS decision_date/);
  assert.match(result.query, /ed\.decided_at::date AS decision_date/);
});
test('submission time mode retains completed records with missing decision history', () => {
  const result = restoreReport({ id: 179, product: 'medicine', basis: 'submission', kind: 'time-face', filter_columns: filter('decision_date'),
    query: "SELECT * FROM effective_ma v WHERE v.ma_status_code IN ('APR','REJ','SUSP','CNCL')\n    AND decision_date IS NOT NULL\n    @dateFilter" });
  assert.doesNotMatch(result.query, /decision_date IS NOT NULL/);
  assert.match(result.query, /ma_status_code IN/);
  assert.equal(JSON.parse(result.filter_columns)[0].OverridingFieldName, 'submission_date');
});
test('submission PAR mode changes the cohort field and preserves the effective upload clock and EtPAR-only predicate', () => {
  const query = "SELECT v.effective_decision_at AS approval_date FROM effective_ma v JOIN documents dt ON dt.document_type_code = 'PSA' WHERE v.decision_date IS NOT NULL @dateFilter";
  const result = restoreReport({ id: 194, product: 'medicine', basis: 'submission', kind: 'par-face', filter_columns: filter('decision_date'), query });
  assert.equal(result.query, query);
  assert.equal(JSON.parse(result.filter_columns)[0].OverridingFieldName, 'submission_date');
});
test('cosmetics report definitions are preserved', () => {
  const row = { id: 159, product: 'cosmetics', basis: 'decision', kind: 'standard-face', filter_columns: filter('decision_date'), query: 'SELECT * FROM cosmetics WHERE 1=1 @dateFilter' };
  const result = restoreReport(row);
  assert.equal(result.query, row.query);
  assert.equal(result.filter_columns, row.filter_columns);
});
