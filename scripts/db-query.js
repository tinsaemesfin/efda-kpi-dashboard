// Ad-hoc read-only query runner for the ERIS dev database.
// Usage: node scripts/db-query.js "SELECT ..."
const { Client } = require("pg");

const fs = require("fs");

let sql = process.argv[2];
if (!sql) {
  console.error("Usage: node scripts/db-query.js \"<SQL>\" | node scripts/db-query.js --file <path>");
  process.exit(1);
}
if (sql === "--file") {
  sql = fs.readFileSync(process.argv[3], "utf8");
}

const client = new Client({
  connectionString:
    "postgresql://REDACTED:REDACTED@REDACTED:5432/REDACTED",
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  try {
    const res = await client.query(sql);
    const out = JSON.stringify(res.rows, null, 2);
    const outPath = process.argv[4];
    if (outPath) {
      fs.writeFileSync(outPath, out, "utf8");
      console.log(`Wrote ${res.rows.length} rows to ${outPath}`);
    } else {
      console.log(out);
    }
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
