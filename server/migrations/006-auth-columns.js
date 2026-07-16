/* Migration 006 – Add username + password_hash to owner_profiles.
   Uses .catch(() => {}) so the ALTER TABLE is idempotent – safe to run
   even if the columns already exist (SQLite does not support IF NOT EXISTS
   for ALTER TABLE ADD COLUMN in older versions). */
export default async function migrate({ db }) {
  await db.prepare(
    `ALTER TABLE owner_profiles ADD COLUMN username TEXT UNIQUE`,
  ).run().catch(() => {});

  await db.prepare(
    `ALTER TABLE owner_profiles ADD COLUMN password_hash TEXT`,
  ).run().catch(() => {});

  await db.prepare(
    `ALTER TABLE owner_profiles ADD COLUMN business_category TEXT`,
  ).run().catch(() => {});

  await db.prepare(
    `ALTER TABLE owner_profiles ADD COLUMN shop_logo TEXT`,
  ).run().catch(() => {});

  await db.prepare(
    `ALTER TABLE owner_profiles ADD COLUMN shop_address TEXT`,
  ).run().catch(() => {});

  await db.prepare(
    `ALTER TABLE owner_profiles ADD COLUMN mobile_number TEXT`,
  ).run().catch(() => {});

  await db.prepare(
    `ALTER TABLE owner_profiles ADD COLUMN email TEXT`,
  ).run().catch(() => {});
}
