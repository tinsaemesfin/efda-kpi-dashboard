/**
 * Builds scripts/sql/kpi29-32-par-front-insert.sql from docs/guide.md.
 * Run: node scripts/generate-par-kpi-insert.js
 */
const fs = require("fs");
const path = require("path");

const md = fs.readFileSync(path.join(__dirname, "..", "docs", "guide.md"), "utf8");
const blocks = [];
const re = /```sql\r?\n([\s\S]*?)```/g;
let m;
while ((m = re.exec(md))) {
  blocks.push(m[1].trim());
}

// First fenced block is the target_days snippet; next 4 are the product scripts.
const productQueries = blocks.slice(1, 5);
if (productQueries.length !== 4) {
  console.error(`Expected 4 product SQL blocks after the snippet, found ${productQueries.length}`);
  process.exit(1);
}

const FILTER_COLUMNS = JSON.stringify([
  {
    FieldName: "dateFilter",
    DType: { id: "6", name: "DateRange" },
    IsInnerFilter: true,
    Title: "Date",
    Alias: "ship",
    OverridingFieldName: "created_date",
    ParameterName: "dateFilter",
    Type: "DateRange",
  },
]);

const rows = [
  {
    id: 29,
    title: "MA-MDCN-Front-KPI8-PAR",
    description: "MDCN-PAR-Front",
    query: productQueries[0],
  },
  {
    id: 30,
    title: "MA-MD-Front-KPI8-PAR",
    description: "MD-PAR-Front",
    query: productQueries[1],
  },
  {
    id: 31,
    title: "MA-Food-Front-KPI8-PAR",
    description: "FD-PAR-Front",
    query: productQueries[2],
  },
  {
    id: 32,
    title: "MA-CO-Front-KPI8-PAR",
    description: "CO-PAR-Front",
    query: productQueries[3],
  },
];

function dollarQuote(tag, body) {
  return `$${tag}$\n${body}\n$${tag}$`;
}

const valueBlocks = rows
  .map((row) => {
    const qTag = `q${row.id}`;
    return `(
  ${row.id},
  '${row.title}',
  NOW(),
  '${row.description}',
  ${dollarQuote(qTag, row.query)},
  NULL,
  '${FILTER_COLUMNS.replace(/'/g, "''")}',
  11,
  10,
  true,
  NOW(),
  'KPIMATest',
  newid(),
  4,
  100,
  false,
  '[]',
  NULL,
  'MA'
)`;
  })
  .join(",\n");

const sql = `-- PAR / MA-KPI-8 face reports (ids 29–32)
-- Generated from docs/guide.md — re-run: node scripts/generate-par-kpi-insert.js
-- Mapping:
--   29 Medicine (MDCN)
--   30 Medical Device (MD)
--   31 Food (FD)
--   32 Cosmetics (CO)
-- Requires a write-capable DB user (readonly_user cannot INSERT).

BEGIN;

INSERT INTO kpi.kpi (
  id,
  title,
  created_date,
  description,
  query,
  series_columns,
  filter_columns,
  report_type_id,
  priority,
  is_active,
  modified_date,
  name,
  rowguid,
  width,
  max_rows,
  is_mobile,
  column_definitions,
  report_group_id,
  kpi_group
) VALUES
${valueBlocks};

SELECT setval(
  'kpi.kpi_id_seq',
  GREATEST((SELECT MAX(id) FROM kpi.kpi), 32)
);

COMMIT;

-- Verify:
-- SELECT id, title, description, kpi_group FROM kpi.kpi WHERE id BETWEEN 29 AND 32 ORDER BY id;
`;

const outPath = path.join(__dirname, "sql", "kpi29-32-par-front-insert.sql");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  rows.map((r) => `${r.id}: ${r.title} (query ${r.query.length} chars)`).join("\n")
);
