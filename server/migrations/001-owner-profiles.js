export default async function migrate({ db }) {
  await db.prepare(
    `ALTER TABLE shops ADD COLUMN owner_id INTEGER REFERENCES owner_profiles(id) ON DELETE SET NULL`,
  ).run().catch(() => {});
}
