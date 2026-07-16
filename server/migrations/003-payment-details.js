export default async function migrate({ db }) {
  await db.prepare(
    `ALTER TABLE payments ADD COLUMN payment_method TEXT`
  ).run().catch(() => {});
  await db.prepare(
    `ALTER TABLE payments ADD COLUMN txn_ref TEXT`
  ).run().catch(() => {});
}
