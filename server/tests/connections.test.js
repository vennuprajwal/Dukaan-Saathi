import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { dbReady, db } from '../db.js';
import { createOwnerProfile } from '../db.js';

import { sendConnectionRequest, respondToConnectionRequest, listConnectedShops, canPerformBusinessTransaction, createBusinessTransaction } from '../lib/connections.js';

// Ensure clean state for this test suite
await db.prepare('DELETE FROM connected_shops').run();
await db.prepare('DELETE FROM business_connections').run();
await db.prepare('DELETE FROM business_transactions').run();

const __dirname = dirname(fileURLToPath(import.meta.url));
const tempDir = join(__dirname, '..', 'data-test');
process.env.DATA_DIR = tempDir;

await dbReady;

test('pending request can be accepted and enables transactions', async () => {
  const ownerA = await createOwnerProfile({ shop_name: 'Alpha Store', whatsapp_number: '+911111111111', pin: '1111' });
  const ownerB = await createOwnerProfile({ shop_name: 'Beta Store', whatsapp_number: '+911111111112', pin: '2222' });

  // Ensure no prior connections for a clean test
  await db.prepare('DELETE FROM connected_shops').run();
  await db.prepare('DELETE FROM business_connections').run();
  const request = await sendConnectionRequest(ownerA.shop_id, ownerB.shop_id);
  assert.equal(request.status, 'pending');

  const accepted = await respondToConnectionRequest(request.id, ownerB.shop_id, 'accept');
  assert.equal(accepted.status, 'accepted');

  const connected = await listConnectedShops(ownerA.shop_id);
  assert.ok(connected.some((item) => item.id === ownerB.shop_id));

  assert.equal(await canPerformBusinessTransaction(ownerA.shop_id, ownerB.shop_id), true);
  const txn = await createBusinessTransaction(ownerA.shop_id, ownerB.shop_id, { amount: 250, note: 'Sample order' });
  assert.equal(txn.amount, 250);
  assert.equal(txn.target_shop_id, ownerB.shop_id);

  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors on Windows temp folders
  }
});
