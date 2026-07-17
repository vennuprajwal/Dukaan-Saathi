/**
 * Rollback for Migration 010: Add missing columns to shops table
 * 
 * NOTE: SQLite does not support DROP COLUMN directly (prior to v3.35.0).
 * To rollback this migration, you would need to:
 * 
 * 1. Create a new table without the added columns
 * 2. Copy data from the current shops table
 * 3. Drop the current shops table
 * 4. Rename the new table to shops
 * 5. Recreate all indexes and foreign keys
 * 
 * This is a complex operation that could break foreign key references.
 * 
 * For production rollback, consider:
 * - Restoring from a database backup
 * - Using a tool like sqldiff to generate the rollback SQL
 * 
 * The columns added by migration 010:
 * - shop_logo
 * - address
 * - gst_number
 * - updated_at
 * 
 * Index added:
 * - idx_shops_vendor
 */

export default async function rollback(_ref) {
  console.warn('Rollback for migration 010 is not automatically supported in SQLite.');
  console.warn('To rollback, you must manually recreate the shops table without the added columns.');
  console.warn('See this file for details on which columns were added.');
  
  // If you're using SQLite 3.35.0+, you could use:
  // await db.prepare('ALTER TABLE shops DROP COLUMN shop_logo').run();
  // await db.prepare('ALTER TABLE shops DROP COLUMN address').run();
  // await db.prepare('ALTER TABLE shops DROP COLUMN gst_number').run();
  // await db.prepare('ALTER TABLE shops DROP COLUMN updated_at').run();
  // await db.prepare('DROP INDEX IF EXISTS idx_shops_vendor').run();
  
  // But this is not recommended as it may break foreign key references.
  throw new Error('Manual rollback required. See migration file for instructions.');
}