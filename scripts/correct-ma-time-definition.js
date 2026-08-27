/*
 * Aligns MA-KPI-6/7 with the signed definition: start of regulatory processing
 * through final decision, excluding applicant-response stages. New reports
 * 96..107 are corrected before release. Consecutive ids 118..120 replace the
 * legacy Medicine reports 26..28 without overwriting that existing contract.
 */
const { Client } = require("pg");
const { loadDatabaseUrl } = require("./load-database-url");

const mode = process.argv[2] ?? "--check";
if (!new Set(["--check", "--apply"]).has(mode)) {
  console.error("Usage: node scripts/correct-ma-time-definition.js [--check|--apply]");
  process.exit(1);
}

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const legacyDecisionExpression = /MAX\(\s*COALESCE\(teamleader_decision_time_days, 0\)\s*\+ COALESCE\(leo_final_decision_time_days, 0\)\s*\) AS decision_time_in_days/;
const fullRegulatoryExpression = `MAX(
        COALESCE(screener_assignment_time_days, 0)
      + COALESCE(screening_time_days, 0)
      + COALESCE(assessor_assignment_time_days, 0)
      + COALESCE(assessment_time_days, 0)
      + COALESCE(teamleader_decision_time_days, 0)
      + COALESCE(leo_final_decision_time_days, 0)
    ) AS decision_time_in_days`;

function replaceTimeDefinition(query) {
  const replaced = query.replace(legacyDecisionExpression, fullRegulatoryExpression);
  if (replaced === query) throw new Error("Query did not contain the expected legacy decision-time expression");
  return replaced;
}

const medicineReports = [
  { id: 118, sourceId: 105, title: "MA-MDCN-Front-KPI6-7-completion-time", description: "Medicine MA regulatory completion-time face" },
  { id: 119, sourceId: 106, title: "MA-MDCN-DD-KPI6-median-completion-time", description: "Medicine MA median regulatory completion-time drilldown" },
  { id: 120, sourceId: 107, title: "MA-MDCN-DD-KPI7-average-completion-time", description: "Medicine MA average regulatory completion-time drilldown" },
];

function cosmeticsToMedicine(query) {
  const replaced = query.replaceAll("'CO'", "'MDCN'");
  if (replaced === query) throw new Error("Cosmetics source query did not contain the expected product code");
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
      "SELECT MAX(id)::int AS max_id, array_agg(id ORDER BY id) FILTER (WHERE id BETWEEN 96 AND 120) AS relevant_ids FROM kpi.kpi"
    );
    if (mode === "--check") {
      console.log(JSON.stringify(state.rows[0], null, 2));
      return;
    }

    await client.query("BEGIN");
    await client.query("LOCK TABLE kpi.kpi IN EXCLUSIVE MODE");
    const maxResult = await client.query("SELECT MAX(id)::int AS max_id FROM kpi.kpi");
    if (maxResult.rows[0].max_id !== 117) {
      throw new Error(`Expected latest kpi.kpi id 117, found ${maxResult.rows[0].max_id}; no changes were committed`);
    }

    const newTimeReports = await client.query(
      "SELECT id, query FROM kpi.kpi WHERE id BETWEEN 96 AND 107 ORDER BY id"
    );
    if (newTimeReports.rowCount !== 12) throw new Error("Expected reports 96..107 before correcting time definition");
    for (const report of newTimeReports.rows) {
      await client.query(
        "UPDATE kpi.kpi SET query = $1, filter_columns = $2, modified_date = NOW(), description = description || ' - full regulatory processing time' WHERE id = $3",
        [replaceTimeDefinition(report.query), decisionDateFilters((await client.query("SELECT filter_columns FROM kpi.kpi WHERE id = $1", [report.id])).rows[0].filter_columns), report.id]
      );
    }

    for (const replacement of medicineReports) {
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
          cosmeticsToMedicine(row.query),
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

    await client.query("SELECT setval('kpi.kpi_id_seq', 120, true)");
    const verification = await client.query(
      `SELECT COUNT(*)::int AS report_count,
              BOOL_AND(query LIKE '%screener_assignment_time_days%') AS includes_start_of_processing,
              BOOL_AND(query LIKE '%leo_final_decision_time_days%') AS includes_final_decision,
              BOOL_AND(query NOT LIKE '%applicant_response_fir_days%') AS excludes_applicant_fir_hold,
              BOOL_AND(query NOT LIKE '%applicant_response_screening_days%') AS excludes_applicant_screening_hold
       FROM kpi.kpi WHERE id BETWEEN 96 AND 107 OR id BETWEEN 118 AND 120`
    );
    const result = verification.rows[0];
    if (
      result.report_count !== 15 ||
      !result.includes_start_of_processing ||
      !result.includes_final_decision ||
      !result.excludes_applicant_fir_hold ||
      !result.excludes_applicant_screening_hold
    ) {
      throw new Error(`Verification failed: ${JSON.stringify(result)}`);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ applied: true, ...result, maxId: 120 }, null, 2));
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
