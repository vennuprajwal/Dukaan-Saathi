import { createClient } from "@libsql/client";
import { join } from "node:path";
import bcrypt from "bcryptjs";

const url = "file:" + join("C:/clone-1/Dukaan-Saathi/server/data", "dukaan.db").replace(/\\/g, "/");
const client = createClient({ url });

// 1. Show all users with username
const owners = await client.execute("SELECT id, username, password_hash FROM owner_profiles WHERE username IS NOT NULL");
console.log("Users with username:");
for (const row of owners.rows) {
  console.log(" - id:", row.id, "username:", row.username, "has_hash:", !!row.password_hash);
  if (row.password_hash) {
    const match1 = bcrypt.compareSync("Raju@1234", row.password_hash);
    const match2 = bcrypt.compareSync("Raju@123", row.password_hash);
    console.log("   password 'Raju@1234' matches:", match1);
    console.log("   password 'Raju@123' matches:", match2);
  }
}

// 2. Test API login directly
console.log("\n--- Testing API login ---");
const res = await fetch("http://localhost:3001/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "raju", password: "Raju@1234" }),
});
const data = await res.json();
console.log("Status:", res.status);
console.log("Response:", JSON.stringify(data));

// 3. Test via Vite proxy (port 5173)
console.log("\n--- Testing via Vite proxy (port 5173) ---");
try {
  const res2 = await fetch("http://localhost:5173/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "raju", password: "Raju@1234" }),
  });
  const data2 = await res2.json();
  console.log("Proxy Status:", res2.status);
  console.log("Proxy Response:", JSON.stringify(data2));
} catch(e) {
  console.log("Proxy Error:", e.message);
}

process.exit(0);
