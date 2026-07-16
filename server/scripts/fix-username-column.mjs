// Fix: add username column WITHOUT the UNIQUE constraint (SQLite ALTER TABLE doesn't support UNIQUE),
// then create a unique index separately.
import { createClient } from "@libsql/client";
import { join } from "node:path";

const url = "file:" + join("C:/clone-1/Dukaan-Saathi/server/data", "dukaan.db").replace(/\\/g, "/");
const client = createClient({ url });

// Add username column (plain TEXT first — no UNIQUE in ALTER TABLE)
try {
  await client.execute("ALTER TABLE owner_profiles ADD COLUMN username TEXT");
  console.log("✅ Added username column");
} catch (e) {
  console.log("Column may already exist:", e.message);
}

// Create unique index separately (idempotent)
try {
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_username ON owner_profiles(username) WHERE username IS NOT NULL");
  console.log("✅ Created unique index on username");
} catch (e) {
  console.log("Index error:", e.message);
}

// Verify
const result = await client.execute("PRAGMA table_info(owner_profiles)");
console.log("\nFinal owner_profiles columns:");
for (const row of result.rows) {
  console.log(" -", row.name, ":", row.type);
}

process.exit(0);
