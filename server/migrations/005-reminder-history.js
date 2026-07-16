export default async function migrate({ db }) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS reminders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      message     TEXT NOT NULL,
      amount      REAL NOT NULL,
      sent_via    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'sent',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run().catch(() => {});
}
