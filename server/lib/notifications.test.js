import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resetNotificationsForTests,
  publishNotification,
  listNotificationsForShop,
  markNotificationRead,
  deleteNotification,
  getUnreadNotificationCount,
} from './notifications.js';

test('notification center filters, paginates, and tracks unread state', () => {
  resetNotificationsForTests();

  publishNotification({
    shopId: 7,
    recipientShopId: 7,
    type: 'payment_received',
    category: 'payments',
    title: 'Payment Received',
    message: 'Invoice INV-001 paid',
  });

  publishNotification({
    shopId: 7,
    recipientShopId: 7,
    type: 'connection_request',
    category: 'connections',
    title: 'Connection Request',
    message: 'A new request is waiting',
  });

  const filtered = listNotificationsForShop(7, { search: 'invoice', category: 'payments', page: 1, limit: 5 });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.notifications[0].category, 'payments');

  const unread = getUnreadNotificationCount(7);
  assert.equal(unread, 2);

  const marked = markNotificationRead(filtered.notifications[0].id, 7);
  assert.equal(marked, true);

  const afterDelete = deleteNotification(filtered.notifications[0].id, 7);
  assert.equal(afterDelete, true);

  const remaining = listNotificationsForShop(7, { page: 1, limit: 10 });
  assert.equal(remaining.total, 1);
  assert.equal(getUnreadNotificationCount(7), 1);
});
