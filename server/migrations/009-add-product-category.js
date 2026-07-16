export default async function ({ db }) {
  try {
    await db.prepare("ALTER TABLE products ADD COLUMN category TEXT").run();
  } catch (err) {
    if (!err.message?.includes("duplicate column")) throw err;
  }
}
