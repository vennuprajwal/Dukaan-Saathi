export default async function migrate({ db }) {
  await db.prepare(
    `ALTER TABLE customers ADD COLUMN upi_id TEXT`,
  ).run().catch(() => {});
  await db.prepare(
    `ALTER TABLE customers ADD COLUMN address TEXT`,
  ).run().catch(() => {});
  await db.prepare(
    `ALTER TABLE customers ADD COLUMN notes TEXT`,
  ).run().catch(() => {});
  await db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_shop_phone ON customers(shop_id, phone)`,
  ).run().catch(() => {});
}
