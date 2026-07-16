import { createClient } from "@libsql/client";
import { join } from "node:path";

const url = "file:" + join("C:/clone-1/Dukaan-Saathi/server/data", "dukaan.db").replace(/\\/g, "/");
const client = createClient({ url });

const result = await client.execute("PRAGMA table_info(owner_profiles)");
console.log("owner_profiles columns:");
for (const row of result.rows) {
  console.log(" -", row.name, ":", row.type);
}

const mig = await client.execute("SELECT name FROM schema_migrations ORDER BY name");
console.log("\nApplied migrations:");
for (const row of mig.rows) {
  console.log(" -", row.name);
}

process.exit(0);
