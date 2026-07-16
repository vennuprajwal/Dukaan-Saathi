export default async function migrate({ db }) {
  await db.prepare(
    `ALTER TABLE shops ADD COLUMN upi_id TEXT`
  ).run().catch(() => {});
}
