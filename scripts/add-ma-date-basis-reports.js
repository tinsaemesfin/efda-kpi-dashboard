/*
 * Adds explicit Submission date / Decision date variants for every active MA
 * front and drilldown report. The dashboard chooses the report id; dateBasis is
 * intentionally not sent to the KPI API because that API only accepts a range.
 *
 * Usage:
 *   node scripts/add-ma-date-basis-reports.js --check
 *   node scripts/add-ma-date-basis-reports.js --apply
 *   node scripts/add-ma-date-basis-reports.js --verify
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg");
const { loadDatabaseUrl } = require("./load-database-url");

const mode = process.argv[2] ?? "--check";
if (!new Set(["--check", "--apply", "--verify"]).has(mode)) {
  console.error("Usage: node scripts/add-ma-date-basis-reports.js [--check|--apply|--verify]");
  process.exit(1);
}

const STANDARD_REPORT_IDS = [
  8, 14, 15, 16, 17,
  9, 10, 11, 13, 18, 19, 20, 21, 89, 90, 91, 92, 22, 23, 24, 25, 93, 94, 95,
];
const TIME_REPORT_IDS = [
  118, 119, 120, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107,
];
const PAR_REPORT_IDS = [114, 109, 115, 110, 108, 111, 116, 112, 117, 113];

const CLONES = [
  ...STANDARD_REPORT_IDS.map((sourceId, index) => ({ id: 155 + index, sourceId, basis: "decision" })),
  ...TIME_REPORT_IDS.map((sourceId, index) => ({ id: 179 + index, sourceId, basis: "submission" })),
  ...PAR_REPORT_IDS.map((sourceId, index) => ({ id: 194 + index, sourceId, basis: "submission" })),
];
const ALL_SOURCE_IDS = [...new Set([...STANDARD_REPORT_IDS, ...TIME_REPORT_IDS, ...PAR_REPORT_IDS])];

function withDateBasis(filterColumns, basis) {
  const filters = typeof filterColumns === "string" ? JSON.parse(filterColumns) : filterColumns;
  if (!Array.isArray(filters)) throw new Error("filter_columns must be a JSON array");
  const dateFilter = filters.find((item) => item?.ParameterName === "dateFilter");
  if (!dateFilter) throw new Error("Date filter metadata is missing");
  dateFilter.OverridingFieldName = basis === "submission" ? "submission_date" : "decision_date";
  dateFilter.Title = basis === "submission" ? "Submission date" : "Decision date";
  return JSON.stringify(filters);
}

function resolveDateFilter(filterColumns) {
  const filters = JSON.parse(filterColumns);
  const filter = filters.find((item) => item?.ParameterName === "dateFilter");
  const alias = filter.Alias ? `${filter.Alias}.` : "";
  return `AND ${alias}${filter.OverridingFieldName} >= $1::date AND ${alias}${filter.OverridingFieldName} < ($2::date + INTERVAL '1 day')`;
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
    const sourcesResult = await client.query(
      "SELECT * FROM kpi.kpi WHERE id = ANY($1::int[]) ORDER BY id",
      [ALL_SOURCE_IDS]
    );
    if (sourcesResult.rowCount !== ALL_SOURCE_IDS.length) {
      throw new Error(`Expected ${ALL_SOURCE_IDS.length} source reports, found ${sourcesResult.rowCount}`);
    }
    const sources = new Map(sourcesResult.rows.map((row) => [row.id, row]));
    const occupied = await client.query(
      "SELECT id, title FROM kpi.kpi WHERE id = ANY($1::int[]) ORDER BY id",
      [CLONES.map((clone) => clone.id)]
    );
    const expectedTitle = (clone) => `${sources.get(clone.sourceId).title}-${clone.basis === "submission" ? "SubmissionDate" : "DecisionDate"}`;
    const conflicts = occupied.rows.filter((row) => {
      const clone = CLONES.find((item) => item.id === row.id);
      return row.title !== expectedTitle(clone);
    });
    if (conflicts.length) throw new Error(`Target report ids are occupied: ${JSON.stringify(conflicts)}`);

    const status = {
      standardReportsToSetToSubmissionDate: STANDARD_REPORT_IDS.length,
      alternateReportsToCreate: CLONES.length,
      existingAlternateReports: occupied.rowCount,
      idRange: `${CLONES[0].id}-${CLONES.at(-1).id}`,
    };
    if (mode === "--check") {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    if (mode === "--verify") {
      const verificationIds = process.argv[3]
        ? process.argv[3].split(",").map(Number)
        : [8, 155, 179, 118, 194, 114, 9, 160, 180, 119, 195, 109];
      const reports = await client.query(
        "SELECT id, title, query, filter_columns FROM kpi.kpi WHERE id = ANY($1::int[]) ORDER BY id",
        [verificationIds]
      );
      const results = [];
      for (const report of reports.rows) {
        const executable = report.query.replaceAll("@dateFilter", resolveDateFilter(report.filter_columns));
        const result = await client.query(executable, ["2026-01-01", "2026-09-02"]);
        const dateField = JSON.parse(report.filter_columns).find((item) => item?.ParameterName === "dateFilter")?.OverridingFieldName;
        results.push({
          id: report.id,
          title: report.title,
          dateField,
          rowCount: result.rowCount,
          targetDays: [...new Set(result.rows.map((row) => Number(row.target_days)).filter(Number.isFinite))],
          relianceRows: result.rows
            .filter((row) => String(row.category_name ?? "").toLowerCase().includes("reliance"))
            .map((row) => ({
              category: row.category_value,
              targetDays: Number(row.target_days),
              onTime: Number(row.on_time_count),
              total: Number(row.total_count),
              percentage: Number(row.percentage),
            })),
          firstRow: result.rows[0] ?? null,
        });
      }
      console.log(JSON.stringify({ verifiedRange: "2026-01-01..2026-09-02", reports: results }, null, 2));
      return;
    }

    await client.query("BEGIN");
    for (const id of STANDARD_REPORT_IDS) {
      const source = sources.get(id);
      const filterColumns = withDateBasis(source.filter_columns, "submission");
      const executable = source.query.replaceAll("@dateFilter", resolveDateFilter(filterColumns));
      await client.query(`EXPLAIN ${executable}`, ["2026-01-01", "2026-09-02"]);
      await client.query(
        "UPDATE kpi.kpi SET filter_columns = $1, modified_date = NOW() WHERE id = $2",
        [filterColumns, id]
      );
    }

    for (const clone of CLONES) {
      const source = sources.get(clone.sourceId);
      const filterColumns = withDateBasis(source.filter_columns, clone.basis);
      const executable = source.query.replaceAll("@dateFilter", resolveDateFilter(filterColumns));
      await client.query(`EXPLAIN ${executable}`, ["2026-01-01", "2026-09-02"]);
      await client.query(
        `INSERT INTO kpi.kpi (
          id, title, created_date, description, query, series_columns, filter_columns,
          report_type_id, priority, is_active, modified_date, name, width, max_rows,
          is_mobile, column_definitions, report_group_id, kpi_group
        ) VALUES (
          $1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          query = EXCLUDED.query,
          series_columns = EXCLUDED.series_columns,
          filter_columns = EXCLUDED.filter_columns,
          report_type_id = EXCLUDED.report_type_id,
          priority = EXCLUDED.priority,
          is_active = EXCLUDED.is_active,
          modified_date = NOW(),
          name = EXCLUDED.name,
          width = EXCLUDED.width,
          max_rows = EXCLUDED.max_rows,
          is_mobile = EXCLUDED.is_mobile,
          column_definitions = EXCLUDED.column_definitions,
          report_group_id = EXCLUDED.report_group_id,
          kpi_group = EXCLUDED.kpi_group`,
        [
          clone.id,
          expectedTitle(clone),
          `${source.description ?? source.title} Filtered by ${clone.basis} date.`,
          source.query,
          source.series_columns,
          filterColumns,
          source.report_type_id,
          source.priority,
          source.is_active,
          source.name,
          source.width,
          source.max_rows,
          source.is_mobile,
          source.column_definitions,
          source.report_group_id,
          source.kpi_group,
        ]
      );
    }
    await client.query(
      "SELECT setval('kpi.kpi_id_seq', GREATEST((SELECT MAX(id) FROM kpi.kpi), (SELECT last_value FROM kpi.kpi_id_seq)), true)"
    );

    const verify = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE id = ANY($1::int[]) AND filter_columns::jsonb @> '[{"OverridingFieldName":"submission_date"}]'::jsonb)::int AS submission_standard,
         COUNT(*) FILTER (WHERE id = ANY($2::int[]))::int AS alternate_count
       FROM kpi.kpi`,
      [STANDARD_REPORT_IDS, CLONES.map((clone) => clone.id)]
    );
    if (verify.rows[0].submission_standard !== STANDARD_REPORT_IDS.length || verify.rows[0].alternate_count !== CLONES.length) {
      throw new Error(`Post-update verification failed: ${JSON.stringify(verify.rows[0])}`);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ applied: true, ...status, ...verify.rows[0] }, null, 2));
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
