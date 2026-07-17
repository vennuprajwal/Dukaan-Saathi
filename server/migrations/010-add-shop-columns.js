/**
 * Migration 010: Add missing columns to shops table for multi-shop support
 * 
 * Adds columns to match the new schema (using snake_case for consistency):
 * - shop_logo (TEXT)
 * - address (TEXT) 
 * - gst_number (TEXT)
 * - updated_at (TEXT)
 * 
 * Existing columns that map to new schema:
 * - name → shop_name (keep both for compatibility)
 * - whatsapp_number → phone (keep both for compatibility)
 * - upi_id → upi_id (already matches)
 * - created_at → created_at (already matches)
 * - owner_id → vendor_id (keep both for compatibility)
 * 
 * Columns kept for backward compatibility:
 * - pin_hash
 * - lang_pref
 */

export default async function migrate({ db }) {
  // Add new columns to shops table (using snake_case for consistency)
  const columnsToAdd = [
    { name: 'shop_logo', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'gst_number', type: 'TEXT' },
    { name: 'updated_at', type: 'TEXT' },
  ];

  for (const col of columnsToAdd) {
    try {
      await db.prepare(`ALTER TABLE shops ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`Added column ${col.name} to shops table`);
    } catch (err) {
      // Column might already exist
      if (!err.message.includes('duplicate column')) {
        console.warn(`Could not add column ${col.name}:`, err.message);
      }
    }
  }

  // Create index on vendor_id (owner_id) for faster lookups
  try {
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_shops_vendor ON shops(owner_id)').run();
    console.log('Created index idx_shops_vendor on shops(owner_id)');
  } catch (err) {
    console.warn('Could not create index:', err.message);
  }

  // Update updated_at to created_at for existing rows
  try {
    await db.prepare('UPDATE shops SET updated_at = created_at WHERE updated_at IS NULL').run();
    console.log('Updated updated_at for existing rows');
  } catch (err) {
    console.warn('Could not update updated_at:', err.message);
  }
}