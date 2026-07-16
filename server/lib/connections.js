import { db } from '../db.js';
import { publishNotification } from './notifications.js';

function normalizeStatus(status) {
  return status === 'accept' || status === 'accepted' ? 'accepted' : status === 'reject' || status === 'rejected' ? 'rejected' : 'pending';
}

export async function sendConnectionRequest(fromShopId, toShopId) {
  if (!fromShopId || !toShopId) return null;
  if (Number(fromShopId) === Number(toShopId)) {
    throw new Error("You cannot connect a shop to itself");
  }

  // Check if they are already connected
  const a = Math.min(fromShopId, toShopId);
  const b = Math.max(fromShopId, toShopId);
  const connected = await db.prepare(`SELECT 1 FROM connected_shops WHERE shop_a_id = ? AND shop_b_id = ?`).get(a, b);
  if (connected) {
    throw new Error("Shops are already connected");
  }

  // Check if there is an active pending connection request in either direction
  const existing = await db.prepare(
    `SELECT * FROM business_connections 
     WHERE (sender_shop_id = ? AND recipient_shop_id = ? AND status = 'pending')
        OR (sender_shop_id = ? AND recipient_shop_id = ? AND status = 'pending')
     LIMIT 1`,
  ).get(fromShopId, toShopId, toShopId, fromShopId);

  if (existing) {
    throw new Error("A pending connection request already exists between these shops");
  }

  const info = await db.prepare(
    `INSERT INTO business_connections (sender_shop_id, recipient_shop_id, status, created_at)
     VALUES (?, ?, 'pending', datetime('now'))`,
  ).run(fromShopId, toShopId);

  const senderShop = await db.prepare("SELECT name FROM shops WHERE id = ?").get(fromShopId);
  const senderName = senderShop?.name || "A shop";

  publishNotification({
    shopId: toShopId,
    recipientShopId: toShopId,
    title: "New Shop Connection Request",
    message: `${senderName} wants to connect with your shop.`,
    category: "connections",
    requestId: info.lastInsertRowid,
  });

  return db.prepare(`SELECT * FROM business_connections WHERE id = ?`).get(info.lastInsertRowid);
}

export async function respondToConnectionRequest(requestId, shopId, action) {
  const request = await db.prepare(`SELECT * FROM business_connections WHERE id = ?`).get(requestId);
  if (!request) return null;
  if (request.recipient_shop_id !== shopId) return null;

  const status = normalizeStatus(action);
  await db.prepare(`UPDATE business_connections SET status = ? WHERE id = ?`).run(status, requestId);

  if (status === 'accepted') {
    await db.prepare(
      `INSERT OR IGNORE INTO connected_shops (shop_a_id, shop_b_id, created_at)
       VALUES (?, ?, datetime('now'))`,
    ).run(Math.min(request.sender_shop_id, request.recipient_shop_id), Math.max(request.sender_shop_id, request.recipient_shop_id));
  }

  return db.prepare(`SELECT * FROM business_connections WHERE id = ?`).get(requestId);
}

export async function listPendingRequestsForShop(shopId) {
  return db.prepare(
    `SELECT bc.*, s.name AS sender_name, r.name AS recipient_name
     FROM business_connections bc
     LEFT JOIN shops s ON s.id = bc.sender_shop_id
     LEFT JOIN shops r ON r.id = bc.recipient_shop_id
     WHERE bc.recipient_shop_id = ? AND bc.status = 'pending'
     ORDER BY bc.created_at DESC`,
  ).all(shopId);
}

export async function listConnectedShops(shopId) {
  const rows = await db.prepare(
    `SELECT cs.*, s.id AS connected_shop_id, s.name AS connected_shop_name
     FROM connected_shops cs
     LEFT JOIN shops s ON s.id = CASE WHEN cs.shop_a_id = ? THEN cs.shop_b_id ELSE cs.shop_a_id END
     WHERE cs.shop_a_id = ? OR cs.shop_b_id = ?
     ORDER BY cs.created_at DESC`,
  ).all(shopId, shopId, shopId);

  return rows.map((row) => ({
    ...row,
    id: row.connected_shop_id,
    name: row.connected_shop_name,
  }));
}

export function canPerformBusinessTransaction(fromShopId, toShopId) {
  if (!fromShopId || !toShopId || fromShopId === toShopId) return false;
  const a = Math.min(fromShopId, toShopId);
  const b = Math.max(fromShopId, toShopId);
  const row = db.prepare(`SELECT 1 FROM connected_shops WHERE shop_a_id = ? AND shop_b_id = ?`).get(a, b);
  return Boolean(row);
}

export async function createBusinessTransaction(fromShopId, toShopId, payload = {}) {
  if (!canPerformBusinessTransaction(fromShopId, toShopId)) {
    throw new Error('Shops are not connected');
  }

  const info = await db.prepare(
    `INSERT INTO business_transactions (from_shop_id, to_shop_id, amount, note, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  ).run(fromShopId, toShopId, payload.amount || 0, payload.note || null);

  const txn = await db.prepare(`SELECT * FROM business_transactions WHERE id = ?`).get(info.lastInsertRowid);
  return { ...txn, target_shop_id: toShopId };
}
