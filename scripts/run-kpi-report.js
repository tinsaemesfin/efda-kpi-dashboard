/*
 * Execute a stored KPI report directly against PostgreSQL for verification.
 *
 * Usage:
 *   node scripts/run-kpi-report.js <report-id> [start-date] [end-date]
 *
 * The API replaces @dateFilter from kpi.kpi.filter_columns. This helper mirrors
 * that behaviour so report SQL can be checked before and after API wiring.
 */
const { Client } = require("pg");
const { loadDatabaseUrl } = require("./load-database-url");

const reportId = Number(process.argv[2]);
const startDate = process.argv[3];
const endDate = process.argv[4];

if (!Number.isInteger(reportId) || reportId <= 0) {
  console.error("Usage: node scripts/run-kpi-report.js <report-id> [start-date] [end-date]");
  process.exit(1);
}

if ((startDate && !endDate) || (!startDate && endDate)) {
  console.error("Provide both start-date and end-date, or neither.");
  process.exit(1);
}

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function resolveDateAlias(filterColumns) {
  if (!filterColumns) return "";
  const filters = JSON.parse(filterColumns);
  const dateFilter = filters.find((filter) => filter.ParameterName === "dateFilter");
  return {
    alias: dateFilter?.Alias ? `${quoteIdentifier(dateFilter.Alias)}.` : "",
    field: dateFilter?.OverridingFieldName ?? "created_date",
  };
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  try {
    const catalogResult = await client.query(
      "SELECT id, title, query, filter_columns FROM kpi.kpi WHERE id = $1",
      [reportId]
    );
    const report = catalogResult.rows[0];
    if (!report) throw new Error(`KPI report ${reportId} does not exist`);

    const { alias, field } = resolveDateAlias(report.filter_columns);
    const replacement = startDate
      ? `AND ${alias}${quoteIdentifier(field)} >= $1::date AND ${alias}${quoteIdentifier(field)} < ($2::date + INTERVAL '1 day')`
      : "";
    const sql = report.query.replaceAll("@dateFilter", replacement);
    const params = startDate ? [startDate, endDate] : [];
    const result = await client.query(sql, params);

    console.log(
      JSON.stringify(
        {
          report: { id: report.id, title: report.title },
          rowCount: result.rowCount,
          rows: result.rows,
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
