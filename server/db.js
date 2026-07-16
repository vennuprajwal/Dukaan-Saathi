import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Connection. In production TURSO_DATABASE_URL points at a Turso/libSQL cloud
   database (with an auth token). With no URL set we fall back to a local SQLite
   file so local dev / tests need no cloud account — same code path either way. */
let url = config.turso.url;
let authToken = config.turso.authToken || undefined;
if (!url) {
  // DATA_DIR lets a host mount a disk; otherwise <server>/data. Only used for
  // the local file fallback — the cloud path ignores it.
  const dataDir = process.env.DATA_DIR || join(__dirname, "data");
  mkdirSync(dataDir, { recursive: true });
  // libSQL file: URLs want forward slashes even on Windows (C:\a\b -> C:/a/b).
  url = "file:" + join(dataDir, "dukaan.db").replace(/\\/g, "/");
  authToken = undefined;
}

const client = createClient({ url, authToken });

/* ---- better-sqlite3-shaped async adapter ---------------------------------
   Mirrors the tiny slice of the better-sqlite3 API this app uses, but every
   call returns a Promise. Call sites keep their SQL verbatim (libSQL speaks the
   same SQLite dialect) and just `await` the result. */
const stmt = (sql) => ({
  get: async (...args) => (await client.execute({ sql, args })).rows[0],
  all: async (...args) => (await client.execute({ sql, args })).rows,
  run: async (...args) => {
    const r = await client.execute({ sql, args });
    return {
      lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined,
      changes: r.rowsAffected,
    };
  },
});

export const db = {
  prepare: stmt,
  /* Run several statements atomically. Each item is { sql, args }. */
  batch: (statements) => client.batch(statements, "write"),
};

/* ---- Schema (idempotent) -------------------------------------------------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS owner_profiles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_name      TEXT NOT NULL DEFAULT 'My Shop',
  owner_name     TEXT,
  mobile_number  TEXT,
  email          TEXT,
  shop_address   TEXT,
  shop_logo      TEXT,
  business_category TEXT,
  whatsapp_number TEXT UNIQUE,
  username TEXT UNIQUE,
  pin_hash       TEXT,
  password_hash TEXT,
  lang_pref      TEXT NOT NULL DEFAULT 'en',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shops (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id       INTEGER REFERENCES owner_profiles(id) ON DELETE SET NULL,
  name           TEXT NOT NULL DEFAULT 'My Shop',
  whatsapp_number TEXT UNIQUE NOT NULL,
  pin_hash       TEXT,
  lang_pref      TEXT NOT NULL DEFAULT 'en',
  upi_id         TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id             INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  name_norm           TEXT NOT NULL,
  unit                TEXT DEFAULT 'unit',
  stock_qty           REAL NOT NULL DEFAULT 0,
  cost_price          REAL NOT NULL DEFAULT 0,
  sell_price          REAL NOT NULL DEFAULT 0,
  supplier            TEXT,
  purchase_price      REAL DEFAULT 0,
  selling_price       REAL DEFAULT 0,
  expiry_date         TEXT,
  batch_number        TEXT,
  barcode             TEXT,
  qr_code             TEXT,
  low_stock_threshold REAL DEFAULT 5,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id, name_norm);

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  name_norm  TEXT NOT NULL,
  phone      TEXT,
  upi_id     TEXT,
  address    TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_shop ON customers(shop_id, name_norm);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_shop_phone ON customers(shop_id, phone);

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
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id        INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  amount         REAL NOT NULL DEFAULT 0,
  payment_method TEXT,
  txn_ref        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS business_connections (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_shop_id      INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  recipient_shop_id   INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending',
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON business_connections(recipient_shop_id, status);

CREATE TABLE IF NOT EXISTS connected_shops (
  shop_a_id           INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shop_b_id           INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (shop_a_id, shop_b_id)
);

CREATE TABLE IF NOT EXISTS business_transactions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  from_shop_id        INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  to_shop_id          INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount              REAL NOT NULL DEFAULT 0,
  note                TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON business_transactions(from_shop_id, created_at);

CREATE TABLE IF NOT EXISTS credit_invoices (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number      TEXT NOT NULL UNIQUE,
  buyer_shop_id       INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  seller_shop_id      INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_list        TEXT,
  quantity            REAL NOT NULL DEFAULT 0,
  price               REAL NOT NULL DEFAULT 0,
  total_amount        REAL NOT NULL DEFAULT 0,
  paid_amount         REAL NOT NULL DEFAULT 0,
  due_date            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Pending',
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_credit_invoices_shop ON credit_invoices(buyer_shop_id, seller_shop_id, created_at);

CREATE TABLE IF NOT EXISTS reminders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id        INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  message        TEXT NOT NULL,
  amount         REAL NOT NULL,
  sent_via       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'sent',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/* Resolves once the schema exists. Boot code (index.js) and scripts await this
   before serving/using the DB. */
async function applyMigrations() {
  await client.executeMultiple(SCHEMA);

  await db.prepare(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
  ).run();

  const appliedRows = await db.prepare("SELECT name FROM schema_migrations").all();
  const applied = new Set(appliedRows.map((row) => row.name));

  const migrationFiles = ["001-owner-profiles.js", "002-customer-details.js", "003-payment-details.js", "004-shop-upi.js", "005-reminder-history.js", "006-auth-columns.js"];
  for (const file of migrationFiles) {
    if (applied.has(file)) continue;
    const migration = await import(`./migrations/${file}`);
    await migration.default({ db, client });
    await db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
  }
}

export const dbReady = applyMigrations();

/* ---- Helpers -------------------------------------------------------------- */
export const normalize = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

export const normalizePhone = (value) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  return raw.replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");
};

export const hashPin = (pin) => bcrypt.hashSync(String(pin), 10);
export const verifyPin = (pin, hash) => (hash ? bcrypt.compareSync(String(pin), hash) : false);

async function ensureOwnerProfileForShop(shopId, data = {}) {
  const shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(shopId);
  if (!shop) return null;

  const ownerFields = {
    shop_name: data.shop_name || data.name || shop.name || "My Shop",
    owner_name: data.owner_name || null,
    mobile_number: data.mobile_number || null,
    email: data.email || null,
    shop_address: data.shop_address || null,
    shop_logo: data.shop_logo || null,
    business_category: data.business_category || null,
    whatsapp_number: data.whatsapp_number || shop.whatsapp_number || null,
    pin_hash: data.pin_hash || shop.pin_hash || null,
    lang_pref: data.lang || shop.lang_pref || "en",
  };

  let owner = null;
  if (shop.owner_id) {
    owner = await db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(shop.owner_id);
  }

  if (!owner && ownerFields.whatsapp_number) {
    owner = await db.prepare("SELECT * FROM owner_profiles WHERE whatsapp_number = ?").get(ownerFields.whatsapp_number);
  }

  if (!owner) {
    const info = await db
      .prepare(
        `INSERT INTO owner_profiles (shop_name, owner_name, mobile_number, email, shop_address, shop_logo, whatsapp_number, pin_hash, lang_pref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        ownerFields.shop_name,
        ownerFields.owner_name,
        ownerFields.mobile_number,
        ownerFields.email,
        ownerFields.shop_address,
        ownerFields.shop_logo,
        ownerFields.whatsapp_number,
        ownerFields.pin_hash,
        ownerFields.lang_pref,
      );
    owner = await db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(info.lastInsertRowid);
  } else {
    await db
      .prepare(
        `UPDATE owner_profiles
         SET shop_name = ?, owner_name = ?, mobile_number = ?, email = ?, shop_address = ?, shop_logo = ?, whatsapp_number = ?, pin_hash = COALESCE(?, pin_hash), lang_pref = ?
         WHERE id = ?`,
      )
      .run(
        ownerFields.shop_name,
        ownerFields.owner_name,
        ownerFields.mobile_number,
        ownerFields.email,
        ownerFields.shop_address,
        ownerFields.shop_logo,
        ownerFields.whatsapp_number,
        ownerFields.pin_hash,
        ownerFields.lang_pref,
        owner.id,
      );
    owner = await db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(owner.id);
  }

  await db.prepare("UPDATE shops SET owner_id = ?, name = ?, whatsapp_number = ?, pin_hash = COALESCE(?, pin_hash), lang_pref = ? WHERE id = ?").run(
    owner.id,
    ownerFields.shop_name,
    ownerFields.whatsapp_number || shop.whatsapp_number,
    ownerFields.pin_hash,
    ownerFields.lang_pref,
    shop.id,
  );

  return owner;
}

export async function createOwnerProfile(input = {}) {
  const number = normalizePhone(input.whatsapp_number || input.mobile_number || "");
  const pinHash = input.pin ? hashPin(input.pin) : null;
  const passwordHash = input.password ? bcrypt.hashSync(String(input.password), 10) : null;

  let owner = number ? await db.prepare("SELECT * FROM owner_profiles WHERE whatsapp_number = ?").get(number) : null;
  if (!owner) {
    const info = await db
      .prepare(
        `INSERT INTO owner_profiles (shop_name, owner_name, mobile_number, email, shop_address, shop_logo, business_category, whatsapp_number, pin_hash, username, password_hash, lang_pref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.shop_name || input.name || "My Shop",
        input.owner_name || null,
        input.mobile_number || null,
        input.email || null,
        input.shop_address || null,
        input.shop_logo || null,
        input.business_category || null,
        number || null,
        pinHash,
        input.username || null,
        passwordHash,
        input.lang || "en",
      );
    owner = await db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(info.lastInsertRowid);
  } else {
    await db
      .prepare(
        `UPDATE owner_profiles
         SET shop_name = ?, owner_name = ?, mobile_number = ?, email = ?, shop_address = ?, shop_logo = ?, business_category = ?, whatsapp_number = ?, pin_hash = COALESCE(?, pin_hash), username = ?, password_hash = COALESCE(?, password_hash), lang_pref = ?
         WHERE id = ?`,
      )
      .run(
        input.shop_name || input.name || owner.shop_name || "My Shop",
        input.owner_name || owner.owner_name,
        input.mobile_number || owner.mobile_number,
        input.email || owner.email,
        input.shop_address || owner.shop_address,
        input.shop_logo || owner.shop_logo,
        input.business_category || owner.business_category,
        number || owner.whatsapp_number,
        pinHash || owner.pin_hash,
        input.username || owner.username,
        passwordHash || owner.password_hash,
        input.lang || owner.lang_pref || "en",
        owner.id,
      );
    owner = await db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(owner.id);
  }

  let shop = number ? await db.prepare("SELECT * FROM shops WHERE whatsapp_number = ?").get(number) : null;
  if (!shop) {
    const info = await db
      .prepare(
        `INSERT INTO shops (owner_id, name, whatsapp_number, pin_hash, lang_pref)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(owner.id, owner.shop_name || "My Shop", number || null, pinHash, input.lang || "en");
    shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(info.lastInsertRowid);
  } else {
    await db.prepare("UPDATE shops SET owner_id = ?, name = ?, pin_hash = COALESCE(?, pin_hash), lang_pref = ? WHERE id = ?").run(
      owner.id,
      owner.shop_name || shop.name || "My Shop",
      pinHash || shop.pin_hash,
      input.lang || shop.lang_pref || "en",
      shop.id,
    );
    shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(shop.id);
  }

  return { ...owner, shop_id: shop.id, shop_name: owner.shop_name };
}

/* Find a shop by WhatsApp number, or create one on first contact. */
export async function getOrCreateShop(whatsappNumber, name = "My Shop", extra = {}) {
  const number = normalizePhone(whatsappNumber);
  let shop = await db.prepare("SELECT * FROM shops WHERE whatsapp_number = ?").get(number);
  if (!shop) {
    const owner = await createOwnerProfile({
      shop_name: name,
      whatsapp_number: number,
      ...extra,
    });
    shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(owner.shop_id);
  } else {
    await ensureOwnerProfileForShop(shop.id, {
      shop_name: name,
      whatsapp_number: number,
      ...extra,
    });
    shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(shop.id);
  }
  return shop;
}

export async function getShopById(id) {
  return db
    .prepare(
      `SELECT s.*, o.shop_name, o.owner_name, o.mobile_number, o.email, o.shop_address, o.shop_logo
       FROM shops s
       LEFT JOIN owner_profiles o ON o.id = s.owner_id
       WHERE s.id = ?`,
    )
    .get(id);
}

export async function getOwnerProfileByShopId(shopId) {
  const shop = await getShopById(shopId);
  return shop && shop.owner_id
    ? db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(shop.owner_id)
    : null;
}

export async function getOwnerShops(ownerId) {
  if (!ownerId) return [];
  return db
    .prepare(
      `SELECT s.*, o.shop_name, o.owner_name, o.mobile_number, o.email, o.shop_address, o.shop_logo, o.business_category
       FROM shops s
       LEFT JOIN owner_profiles o ON o.id = s.owner_id
       WHERE s.owner_id = ?
       ORDER BY s.created_at DESC`,
    )
    .all(ownerId);
}

export async function createShopForOwner(ownerId, input = {}) {
  if (!ownerId) return null;
  const number = normalizePhone(input.whatsapp_number || input.mobile_number || "");
  if (!number) return null;

  const existing = await db.prepare("SELECT * FROM shops WHERE whatsapp_number = ?").get(number);
  if (existing) {
    const owner = await db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(ownerId);
    await ensureOwnerProfileForShop(existing.id, {
      shop_name: input.name || owner?.shop_name || existing.name || "My Shop",
      whatsapp_number: number,
      pin_hash: input.pin ? hashPin(input.pin) : existing.pin_hash,
      lang: input.lang || existing.lang_pref || "en",
    });
    return getShopById(existing.id);
  }

  const owner = await db.prepare("SELECT * FROM owner_profiles WHERE id = ?").get(ownerId);
  const info = await db
    .prepare(
      `INSERT INTO shops (owner_id, name, whatsapp_number, pin_hash, lang_pref)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(ownerId, input.name || owner?.shop_name || "My Shop", number, input.pin ? hashPin(input.pin) : null, input.lang || owner?.lang_pref || "en");
  return getShopById(info.lastInsertRowid);
}

export async function listDirectoryShops() {
  return db
    .prepare(
      `SELECT s.*, o.shop_name, o.owner_name, o.mobile_number, o.email, o.shop_address, o.shop_logo, o.business_category
       FROM shops s
       LEFT JOIN owner_profiles o ON o.id = s.owner_id
       ORDER BY s.created_at DESC`,
    )
    .all();
}

export async function updateOwnerProfile(shopId, data = {}) {
  const shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(shopId);
  if (!shop) return null;

  const owner = await ensureOwnerProfileForShop(shop.id, {
    shop_name: data.shop_name || data.name,
    owner_name: data.owner_name,
    mobile_number: data.mobile_number,
    email: data.email,
    shop_address: data.shop_address,
    shop_logo: data.shop_logo,
    business_category: data.business_category,
    whatsapp_number: data.whatsapp_number || shop.whatsapp_number,
    pin_hash: data.pin_hash || shop.pin_hash,
    lang: data.lang || shop.lang_pref,
  });

  const updatedShop = await getShopById(shop.id);
  return { ...updatedShop, owner_profile: owner };
}
