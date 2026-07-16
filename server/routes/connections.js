import { Router } from 'express';
import { requireAuth } from '../auth.js';
import {
  sendConnectionRequest,
  respondToConnectionRequest,
  listPendingRequestsForShop,
  listConnectedShops,
  createBusinessTransaction,
} from '../lib/connections.js';
import { getShopById } from '../db.js';

export const connectionsRouter = Router();

connectionsRouter.post('/request', requireAuth, async (req, res) => {
  const { recipient_shop_id } = req.body || {};
  const senderShopId = req.shop?.id;
  if (!senderShopId || !recipient_shop_id) {
    return res.status(400).json({ error: 'Sender and recipient shop ids are required' });
  }

  const request = await sendConnectionRequest(senderShopId, recipient_shop_id);
  if (!request) {
    return res.status(400).json({ error: 'Unable to create connection request' });
  }

  return res.json({ request });
});

connectionsRouter.get('/pending', requireAuth, async (req, res) => {
  const requests = await listPendingRequestsForShop(req.shop?.id);
  res.json({ requests });
});

connectionsRouter.post('/respond', requireAuth, async (req, res) => {
  const { request_id, action } = req.body || {};
  const response = await respondToConnectionRequest(request_id, req.shop?.id, action);
  if (!response) {
    return res.status(400).json({ error: 'Unable to update connection request' });
  }
  res.json({ request: response });
});

connectionsRouter.get('/connected', requireAuth, async (req, res) => {
  const connected = await listConnectedShops(req.shop?.id);
  res.json({ connected });
});

connectionsRouter.post('/transaction', requireAuth, async (req, res) => {
  const { target_shop_id, amount, note } = req.body || {};
  try {
    const txn = await createBusinessTransaction(req.shop?.id, target_shop_id, { amount, note });
    res.json({ transaction: txn });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

connectionsRouter.get('/check/:shopId', requireAuth, async (req, res) => {
  const shop = await getShopById(Number(req.params.shopId));
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  res.json({ connected: false, shop });
});
