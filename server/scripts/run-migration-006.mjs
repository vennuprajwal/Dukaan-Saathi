// One-time script to apply auth columns migration to existing DB
import { createClient } from "@libsql/client";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const dataDir = "C:/clone-1/Dukaan-Saathi/server/data";
mkdirSync(dataDir, { recursive: true });
const url = "file:" + join(dataDir, "dukaan.db").replace(/\\/g, "/");
const client = createClient({ url });

const columns = [
  "username TEXT UNIQUE",
  "password_hash TEXT",
  "business_category TEXT",
  "shop_logo TEXT",
  "shop_address TEXT",
  "mobile_number TEXT",
  "email TEXT",
];

for (const col of columns) {
  try {
    await client.execute(`ALTER TABLE owner_profiles ADD COLUMN ${col}`);
    console.log("✅ Added column:", col.split(" ")[0]);
  } catch (e) {
    console.log("⏭️  Already exists:", col.split(" ")[0]);
  }
}

// Ensure migration tracking table exists and mark 006 as applied
await client.execute(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
);
await client.execute({
  sql: "INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)",
  args: ["006-auth-columns.js"],
});

console.log("\n✅ Migration 006-auth-columns complete!");
process.exit(0);
