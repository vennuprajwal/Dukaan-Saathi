import { EventEmitter } from 'node:events';
import { dbReady, db } from '../db.js';

const emitter = new EventEmitter();
let notificationHistory = [];

// Load persisted notifications on start
dbReady.then(async () => {
  try {
    const rows = await db.prepare("SELECT * FROM notifications ORDER BY created_at ASC").all();
    notificationHistory = rows.map((row) => ({
      id: row.id,
      shopId: row.shop_id,
      recipientShopId: row.shop_id,
      title: row.title,
      message: row.message,
      category: row.category,
      read: row.read === 1,
      amount: row.amount,
      requestId: row.request_id,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error("Failed to load notifications from database:", err.message);
  }
});

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function withDefaults(entry) {
  return {
    id: entry.id || makeId(),
    createdAt: entry.createdAt || new Date().toISOString(),
    read: false,
    category: 'general',
    ...entry,
  };
}

export function publishNotification(payload) {
  const entry = withDefaults({
    ...payload,
    category: payload.category || payload.type || 'general',
  });
  
  // Persist to database asynchronously
  db.prepare(
    `INSERT INTO notifications (id, shop_id, title, message, category, read, amount, request_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.id,
    entry.shopId || entry.recipientShopId || null,
    entry.title,
    entry.message,
    entry.category,
    entry.read ? 1 : 0,
    entry.amount || null,
    entry.requestId || null,
    entry.createdAt
  ).catch((err) => {
    console.error("Failed to persist notification to SQLite:", err.message);
  });

  notificationHistory = [...notificationHistory, entry];
  emitter.emit('notification', entry);
  return entry;
}

export function subscribeNotifications(handler) {
  emitter.on('notification', handler);
  return () => emitter.off('notification', handler);
}

export function getRecentNotifications(limit = 20) {
  return notificationHistory.slice(-limit).reverse();
}

export function getNotificationsForShop(shopId) {
  return notificationHistory.filter((item) => item.shopId === shopId || item.recipientShopId === shopId);
}

export function listNotificationsForShop(shopId, options = {}) {
  const { search = '', category, page = 1, limit = 10 } = options;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const filtered = getNotificationsForShop(shopId).filter((item) => {
    const query = String(search || '').trim().toLowerCase();
    const matchesSearch = !query || [item.title, item.message, item.type, item.category].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesCategory = !category || category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;
  return {
    notifications: sorted.slice(start, end),
    total: filtered.length,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(filtered.length / safeLimit)),
  };
}

export function getUnreadNotificationCount(shopId) {
  return getNotificationsForShop(shopId).filter((item) => !item.read).length;
}

export function markNotificationRead(id, shopId) {
  const target = notificationHistory.find((item) => item.id === id && (item.shopId === shopId || item.recipientShopId === shopId));
  if (!target) return false;
  target.read = true;
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id).catch((err) => {
    console.error("Failed to mark notification read in SQLite:", err.message);
  });
  return true;
}

export function deleteNotification(id, shopId) {
  const before = notificationHistory.length;
  notificationHistory = notificationHistory.filter((item) => !(item.id === id && (item.shopId === shopId || item.recipientShopId === shopId)));
  if (notificationHistory.length < before) {
    db.prepare("DELETE FROM notifications WHERE id = ?").run(id).catch((err) => {
      console.error("Failed to delete notification in SQLite:", err.message);
    });
    return true;
  }
  return false;
}

export function resetNotificationsForTests() {
  notificationHistory = [];
  db.prepare("DELETE FROM notifications").run().catch((err) => {
    console.error("Failed to reset notifications in SQLite for tests:", err.message);
  });
}
