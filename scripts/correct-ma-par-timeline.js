/*
 * Aligns MA-KPI-8 with the signed EFDA requirement: PAR publication within
 * 60 days of the final MA decision. Existing legacy face reports 29..32 use
 * 30 days, so new consecutive face reports 114..117 replace them in the UI.
 * Reports 108..113 were created by complete-ma-kpi-reports.js and are updated
 * in-place before use because they have not been part of a released contract.
 */
const { Client } = require("pg");
const { loadDatabaseUrl } = require("./load-database-url");

const mode = process.argv[2] ?? "--check";
if (!new Set(["--check", "--apply"]).has(mode)) {
  console.error("Usage: node scripts/correct-ma-par-timeline.js [--check|--apply]");
  process.exit(1);
}

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const replacements = [
  { id: 114, sourceId: 29, title: "MA-MDCN-Front-KPI8-PAR-60D", description: "Medicine PAR face - EFDA 60-day timeline" },
  { id: 115, sourceId: 31, title: "MA-Food-Front-KPI8-PAR-60D", description: "Food PAR face - EFDA 60-day timeline" },
  { id: 116, sourceId: 30, title: "MA-MD-Front-KPI8-PAR-60D", description: "Medical Device PAR face - EFDA 60-day timeline" },
  { id: 117, sourceId: 32, title: "MA-CO-Front-KPI8-PAR-60D", description: "Cosmetics PAR face - EFDA 60-day timeline" },
];

function replaceTimeline(query) {
  const replaced = query.replace(/30::int AS target_days/g, "60::int AS target_days");
  if (replaced === query) throw new Error("Source query did not contain the expected 30-day target");
  return replaced;
}

function decisionDateFilters(filterColumns) {
  const filters = JSON.parse(filterColumns);
  filters.forEach((filter) => {
    if (filter.ParameterName === "dateFilter") filter.OverridingFieldName = "decision_date";
  });
  return JSON.stringify(filters);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  try {
    const state = await client.query(
      "SELECT MAX(id)::int AS max_id, array_agg(id ORDER BY id) FILTER (WHERE id BETWEEN 108 AND 117) AS relevant_ids FROM kpi.kpi"
    );
    if (mode === "--check") {
      console.log(JSON.stringify(state.rows[0], null, 2));
      return;
    }

    await client.query("BEGIN");
    await client.query("LOCK TABLE kpi.kpi IN EXCLUSIVE MODE");
    const maxResult = await client.query("SELECT MAX(id)::int AS max_id FROM kpi.kpi");
    if (maxResult.rows[0].max_id !== 113) {
      throw new Error(`Expected latest kpi.kpi id 113, found ${maxResult.rows[0].max_id}; no changes were committed`);
    }

    const newReports = await client.query(
      "SELECT id, query FROM kpi.kpi WHERE id BETWEEN 108 AND 113 ORDER BY id"
    );
    if (newReports.rowCount !== 6) throw new Error("Expected reports 108..113 before correcting timeline");
    for (const report of newReports.rows) {
      await client.query(
        "UPDATE kpi.kpi SET query = $1, filter_columns = $2, modified_date = NOW(), description = description || ' - EFDA 60-day timeline' WHERE id = $3",
        [replaceTimeline(report.query), decisionDateFilters((await client.query("SELECT filter_columns FROM kpi.kpi WHERE id = $1", [report.id])).rows[0].filter_columns), report.id]
      );
    }

    for (const replacement of replacements) {
      const source = await client.query("SELECT * FROM kpi.kpi WHERE id = $1", [replacement.sourceId]);
      if (source.rowCount !== 1) throw new Error(`Source report ${replacement.sourceId} does not exist`);
      const row = source.rows[0];
      await client.query(
        `INSERT INTO kpi.kpi (
          id, title, created_date, description, query, series_columns,
          filter_columns, report_type_id, priority, is_active, modified_date,
          name, width, max_rows, is_mobile, column_definitions,
          report_group_id, kpi_group
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, true, NOW(), $9, $10, $11, $12, $13, $14, 'MA')`,
        [
          replacement.id,
          replacement.title,
          replacement.description,
          replaceTimeline(row.query),
          row.series_columns,
          decisionDateFilters(row.filter_columns),
          row.report_type_id,
          row.priority,
          row.name,
          row.width,
          row.max_rows,
          row.is_mobile,
          row.column_definitions,
          row.report_group_id,
        ]
      );
    }

    await client.query("SELECT setval('kpi.kpi_id_seq', 117, true)");
    const verification = await client.query(
      `SELECT COUNT(*)::int AS report_count,
              BOOL_AND(query LIKE '%60::int AS target_days%') AS all_60_day,
              BOOL_AND(query NOT LIKE '%30::int AS target_days%') AS no_30_day
       FROM kpi.kpi WHERE id BETWEEN 108 AND 117`
    );
    const result = verification.rows[0];
    if (result.report_count !== 10 || !result.all_60_day || !result.no_30_day) {
      throw new Error(`Verification failed: ${JSON.stringify(result)}`);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ applied: true, ...result, maxId: 117 }, null, 2));
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
