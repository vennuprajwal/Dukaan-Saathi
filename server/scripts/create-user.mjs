// Create a fresh login account directly in the database
import { createClient } from "@libsql/client";
import { join } from "node:path";
import bcrypt from "bcryptjs";

const url = "file:" + join("C:/clone-1/Dukaan-Saathi/server/data", "dukaan.db").replace(/\\/g, "/");
const client = createClient({ url });

const username = "raju";
const password = "Raju@1234";
const shopName = "Raju Shop";
const ownerName = "Raju";
const mobile = "9845455100";  // unique number
const email = "vennuprajwaal@gmail.com";
const address = "Bangalore";

const passwordHash = bcrypt.hashSync(password, 10);

// Insert owner_profile
const ownerResult = await client.execute({
  sql: `INSERT INTO owner_profiles 
        (shop_name, owner_name, mobile_number, email, shop_address, whatsapp_number, username, password_hash, lang_pref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: [shopName, ownerName, mobile, email, address, mobile, username, passwordHash, "en"],
});
const ownerId = Number(ownerResult.lastInsertRowid);
console.log("✅ Created owner with id:", ownerId);

// Insert shop
const shopResult = await client.execute({
  sql: `INSERT INTO shops (owner_id, name, whatsapp_number, lang_pref) VALUES (?, ?, ?, ?)`,
  args: [ownerId, shopName, mobile, "en"],
});
const shopId = Number(shopResult.lastInsertRowid);
console.log("✅ Created shop with id:", shopId);

console.log("\n🎉 Account created!");
console.log("   Username:", username);
console.log("   Password:", password);
console.log("   Login at: http://localhost:5173/login");

process.exit(0);
