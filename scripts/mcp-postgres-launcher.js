// Launches the Postgres MCP server using DATABASE_URL from env or .env.local.
const { spawn } = require("child_process");
const { loadDatabaseUrl } = require("./load-database-url");

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.example)."
  );
  process.exit(1);
}

const connectionString = databaseUrl.includes("sslmode=")
  ? databaseUrl
  : `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}sslmode=no-verify`;

const child = spawn(
  "npx",
  ["-y", "@modelcontextprotocol/server-postgres", connectionString],
  { stdio: "inherit", shell: true }
);

child.on("exit", (code) => process.exit(code ?? 0));
