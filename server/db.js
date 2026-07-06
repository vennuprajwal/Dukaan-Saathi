import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets the host mount a persistent disk at a clean absolute path
// (e.g. Render's disk at /var/data). Unset in local dev → <server>/data.
const dataDir = process.env.DATA_DIR || join(__dirname, "data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "dukaan.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* ---- Schema (idempotent) -------------------------------------------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS shops (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL DEFAULT 'My Shop',
  whatsapp_number TEXT UNIQUE NOT NULL,
  pin_hash       TEXT,
  lang_pref      TEXT NOT NULL DEFAULT 'en',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  name_norm  TEXT NOT NULL,
  unit       TEXT DEFAULT 'unit',
  stock_qty  REAL NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL DEFAULT 0,
  sell_price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id, name_norm);

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  name_norm  TEXT NOT NULL,
  phone      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_shop ON customers(shop_id, name_norm);

CREATE TABLE IF NOT EXISTS sales (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id      INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  item_text    TEXT NOT NULL,
  qty          REAL NOT NULL DEFAULT 1,
  unit_price   REAL NOT NULL DEFAULT 0,
  amount       REAL NOT NULL DEFAULT 0,
  cost_amount  REAL NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'cash',      -- cash | udhaar
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_shop ON sales(shop_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  amount      REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_shop ON payments(shop_id, created_at);

CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'misc', -- rent | transport | supplies | misc ...
  note        TEXT,
  amount      REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_shop ON expenses(shop_id, created_at);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id     INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  direction   TEXT NOT NULL,        -- in | out
  channel     TEXT NOT NULL,        -- whatsapp | sim
  raw_text    TEXT,
  transcript  TEXT,
  lang        TEXT,
  intent      TEXT,
  parsed_json TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_shop ON messages(shop_id, created_at);
`);

/* ---- Helpers -------------------------------------------------------------- */
export const normalize = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

/* Find a shop by WhatsApp number, or create one on first contact. */
export function getOrCreateShop(whatsappNumber, name = "My Shop") {
  const number = whatsappNumber.replace(/^whatsapp:/, "");
  let shop = db
    .prepare("SELECT * FROM shops WHERE whatsapp_number = ?")
    .get(number);
  if (!shop) {
    const info = db
      .prepare("INSERT INTO shops (name, whatsapp_number) VALUES (?, ?)")
      .run(name, number);
    shop = db.prepare("SELECT * FROM shops WHERE id = ?").get(info.lastInsertRowid);
  }
  return shop;
}

export function getShopById(id) {
  return db.prepare("SELECT * FROM shops WHERE id = ?").get(id);
}
