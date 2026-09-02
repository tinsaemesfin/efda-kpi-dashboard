/*
 * Applies the signed MA reliance SLA to the live database reports.
 *
 * Business rule:
 * - SRA, WHO-prequalified, regional and continental reliance rows: 90 days.
 * - Ordinary new MA applications retain the EFDA 270-day target.
 * - PAR publication reports retain their independent 60-day target.
 *
 * Usage:
 *   node scripts/correct-ma-reliance-timeline.js --check
 *   node scripts/correct-ma-reliance-timeline.js --apply
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg");
const { loadDatabaseUrl } = require("./load-database-url");

const mode = process.argv[2] ?? "--check";
if (!new Set(["--check", "--apply"]).has(mode)) {
  console.error("Usage: node scripts/correct-ma-reliance-timeline.js [--check|--apply]");
  process.exit(1);
}

const MARKER = "/* Reliance SLA: 90 days */";
const FRONT_IDS = [8, 14, 15, 16, 17, 88];
const LEGACY_DRILLDOWN_IDS = [9, 10, 18, 19, 20, 21, 22, 23];
const CATEGORIZED_DRILLDOWN_IDS = [
  11, 13, 24, 25, 27, 28,
  89, 90, 91, 92, 93, 94, 95,
  97, 98, 100, 101, 103, 104, 106, 107,
  119, 120,
];
const REPORT_IDS = [...FRONT_IDS, ...LEGACY_DRILLDOWN_IDS, ...CATEGORIZED_DRILLDOWN_IDS];

function reliancePredicate(alias) {
  const prefix = alias ? `${alias}.` : "";
  return `(
        COALESCE(${prefix}is_sra, false) = true
        OR UPPER(TRIM(COALESCE(${prefix}approval_pathway, ''))) IN ('SRA', 'SRA''S', 'SRAS')
        OR COALESCE(${prefix}approval_pathway, '') ILIKE '%reliance%'
        OR COALESCE(${prefix}approval_pathway_code, '') ILIKE '%REL%'
        OR COALESCE(${prefix}approval_pathway_code, '') ILIKE '%CRP%'
        OR COALESCE(${prefix}approval_pathway, '') ILIKE '%WHO Pre Qualified%'
      )`;
}

function patchFrontQuery(query, alias) {
  if (query.includes(MARKER)) return query;

  const targetEnd = /END\s+AS\s+target_days/i;
  if (!targetEnd.test(query)) throw new Error("Front report target_days expression was not found");

  const prefix = alias ? `${alias}.` : "";
  const effectiveTarget = `END AS target_days,

    ${MARKER}
    CASE
      WHEN ${prefix}module_code = 'NMR' AND ${reliancePredicate(alias)} THEN 90
      WHEN ${prefix}module_code = 'NMR' THEN 270
      WHEN ${prefix}module_code = 'REN' THEN 90
      WHEN ${prefix}module_code = 'VAR' THEN 60
    END AS effective_target_days`;

  const patched = query
    .replace(targetEnd, effectiveTarget)
    .replaceAll("processing_time_in_day <= target_days", "processing_time_in_day <= effective_target_days");

  if ((patched.match(/effective_target_days/g) ?? []).length < 3) {
    throw new Error("Front report effective target was not wired into both calculations");
  }
  return patched;
}

function patchLegacyDrilldownQuery(query) {
  if (query.includes(MARKER)) return query;

  const start = query.search(/reliance_pathway_tab\s+AS\s*\(/i);
  const endMatch = /regulatory_outcome_tab\s+AS\s*\(/i.exec(query.slice(start));
  if (start < 0 || !endMatch) throw new Error("Reliance pathway CTE was not found");
  const end = start + endMatch.index;
  const originalBlock = query.slice(start, end);
  let patchedBlock = originalBlock.replace(
    /target_days\s*,/i,
    `${MARKER}\n    90::int AS target_days,`
  );
  patchedBlock = patchedBlock.replaceAll(
    "processing_time_in_day <= target_days",
    "processing_time_in_day <= 90"
  );
  if (patchedBlock === originalBlock || !patchedBlock.includes("processing_time_in_day <= 90")) {
    throw new Error("Reliance pathway CTE was not updated");
  }
  return query.slice(0, start) + patchedBlock + query.slice(end);
}

function patchCategorizedDrilldownQuery(query) {
  if (query.includes(MARKER)) return query;

  const start = query.search(/categorized\s+AS\s*\(/i);
  if (start < 0) throw new Error("Categorized CTE was not found");
  const selectEnd = query.indexOf("FROM classified", start);
  if (selectEnd < 0) throw new Error("Categorized CTE SELECT was not found");

  const originalSelect = query.slice(start, selectEnd);
  const patchedSelect = originalSelect.replace(
    /c\.target_days\s*,/i,
    `${MARKER}\n    CASE WHEN x.category_name = 'Reliance pathway' THEN 90 ELSE c.target_days END AS target_days,`
  );
  if (patchedSelect === originalSelect) throw new Error("Categorized target_days was not updated");
  return query.slice(0, start) + patchedSelect + query.slice(selectEnd);
}

function patchReport(report) {
  if (FRONT_IDS.includes(report.id)) {
    return patchFrontQuery(report.query, [8, 88].includes(report.id) ? "" : "v");
  }
  if (LEGACY_DRILLDOWN_IDS.includes(report.id)) return patchLegacyDrilldownQuery(report.query);
  return patchCategorizedDrilldownQuery(report.query);
}

function resolveDateFilter(filterColumns) {
  const filters = typeof filterColumns === "string" ? JSON.parse(filterColumns) : filterColumns;
  const filter = Array.isArray(filters)
    ? filters.find((item) => item?.ParameterName === "dateFilter")
    : null;
  if (!filter) throw new Error("Date filter metadata is missing");
  const alias = filter.Alias ? `${filter.Alias}.` : "";
  const field = filter.OverridingFieldName || "created_date";
  return `AND ${alias}${field} >= $1::date AND ${alias}${field} < ($2::date + INTERVAL '1 day')`;
}

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  try {
    const result = await client.query(
      "SELECT id, title, query, filter_columns FROM kpi.kpi WHERE id = ANY($1::int[]) ORDER BY id",
      [REPORT_IDS]
    );
    if (result.rowCount !== REPORT_IDS.length) {
      throw new Error(`Expected ${REPORT_IDS.length} MA reports, found ${result.rowCount}`);
    }

    const changes = result.rows.map((report) => ({
      ...report,
      patchedQuery: patchReport(report),
    }));
    const summary = changes.map(({ id, title, query, patchedQuery }) => ({
      id,
      title,
      status: query === patchedQuery ? "already-correct" : "needs-update",
    }));

    if (mode === "--check") {
      console.log(JSON.stringify({ reportCount: summary.length, reports: summary }, null, 2));
      return;
    }

    await client.query("BEGIN");
    for (const report of changes) {
      if (report.query === report.patchedQuery) continue;
      const executableQuery = report.patchedQuery.replaceAll(
        "@dateFilter",
        resolveDateFilter(report.filter_columns)
      );
      await client.query(`EXPLAIN ${executableQuery}`, ["2026-01-01", "2026-09-02"]);
      await client.query(
        "UPDATE kpi.kpi SET query = $1, modified_date = NOW() WHERE id = $2",
        [report.patchedQuery, report.id]
      );
    }

    const verify = await client.query(
      `SELECT COUNT(*)::int AS report_count,
              COUNT(*) FILTER (WHERE query LIKE '%' || $2 || '%')::int AS corrected_count
       FROM kpi.kpi
       WHERE id = ANY($1::int[])`,
      [REPORT_IDS, MARKER]
    );
    if (verify.rows[0].corrected_count !== REPORT_IDS.length) {
      throw new Error(`Post-update verification failed: ${JSON.stringify(verify.rows[0])}`);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ applied: true, ...verify.rows[0] }, null, 2));
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
