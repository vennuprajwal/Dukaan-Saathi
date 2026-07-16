import { createClient } from "@libsql/client";
import { join } from "node:path";

const url = "file:" + join("C:/clone-1/Dukaan-Saathi/server/data", "dukaan.db").replace(/\\/g, "/");
const client = createClient({ url });

const owners = await client.execute("SELECT id, shop_name, owner_name, username, mobile_number, password_hash FROM owner_profiles");
console.log("owner_profiles rows:", owners.rows.length);
for (const row of owners.rows) {
  console.log(" -", JSON.stringify({ id: row.id, shop_name: row.shop_name, username: row.username, mobile: row.mobile_number, has_password: !!row.password_hash }));
}

const shops = await client.execute("SELECT id, owner_id, name, whatsapp_number FROM shops");
console.log("\nshops rows:", shops.rows.length);
for (const row of shops.rows) {
  console.log(" -", JSON.stringify({ id: row.id, owner_id: row.owner_id, name: row.name, phone: row.whatsapp_number }));
}

process.exit(0);
