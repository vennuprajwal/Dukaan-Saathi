import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { createCreditInvoice, listCreditInvoices, getCreditInvoice, updateCreditInvoice, markInvoicePaid } from '../lib/credit.js';
import { deleteNotification, getNotificationsForShop, getRecentNotifications, getUnreadNotificationCount, listNotificationsForShop, markNotificationRead } from '../lib/notifications.js';
import { canPerformBusinessTransaction } from '../lib/connections.js';

export const creditRouter = Router();

creditRouter.post('/invoices', requireAuth, async (req, res) => {
  const buyerId = Number(req.body.buyer_shop_id);
  const sellerId = Number(req.body.seller_shop_id || req.shop?.id);
  
  if (!canPerformBusinessTransaction(buyerId, sellerId)) {
    return res.status(403).json({ error: "Please connect with this shop before starting business." });
  }

  const invoice = await createCreditInvoice({ ...req.body, seller_shop_id: sellerId });
  res.json({ invoice });
});

creditRouter.get('/invoices', requireAuth, async (req, res) => {
  const invoices = await listCreditInvoices(req.shop?.id);
  res.json({ invoices });
});

creditRouter.get('/invoices/:id', requireAuth, async (req, res) => {
  const invoice = await getCreditInvoice(Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice });
});

creditRouter.put('/invoices/:id', requireAuth, async (req, res) => {
  const invoice = await getCreditInvoice(Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (!canPerformBusinessTransaction(invoice.buyer_shop_id, invoice.seller_shop_id)) {
    return res.status(403).json({ error: "Please connect with this shop before starting business." });
  }

  const updated = await updateCreditInvoice(Number(req.params.id), req.body);
  res.json({ invoice: updated });
});

creditRouter.post('/invoices/:id/pay', requireAuth, async (req, res) => {
  const invoice = await getCreditInvoice(Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (!canPerformBusinessTransaction(invoice.buyer_shop_id, invoice.seller_shop_id)) {
    return res.status(403).json({ error: "Please connect with this shop before starting business." });
  }

  const updated = await markInvoicePaid(Number(req.params.id), req.body.amount || 0);
  res.json({ invoice: updated });
});

creditRouter.get('/notifications', requireAuth, async (req, res) => {
  const notifications = getNotificationsForShop(req.shop?.id);
  res.json({ notifications: notifications.slice(-20).reverse() });
});

creditRouter.get('/notifications/recent', requireAuth, async (_req, res) => {
  res.json({ notifications: getRecentNotifications(20) });
});

creditRouter.get('/notifications-center', requireAuth, async (req, res) => {
  const { search = '', category = 'all', page = 1, limit = 8 } = req.query || {};
  const data = listNotificationsForShop(req.shop?.id, { search, category, page, limit });
  const unread = getUnreadNotificationCount(req.shop?.id);
  res.json({ notifications: data.notifications, total: data.total, unread, page: data.page, limit: data.limit, totalPages: data.totalPages });
});

creditRouter.post('/notifications/:id/read', requireAuth, async (req, res) => {
  const ok = markNotificationRead(req.params.id, req.shop?.id);
  res.json({ ok });
});

creditRouter.delete('/notifications/:id', requireAuth, async (req, res) => {
  const ok = deleteNotification(req.params.id, req.shop?.id);
  res.json({ ok });
});
