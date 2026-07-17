import { db } from '../db.js';
import { publishNotification } from './notifications.js';

function normalizeStatus({ dueDate, totalAmount, paidAmount }) {
  const due = new Date(dueDate + 'T23:59:59');
  const now = new Date();
  if (Number(paidAmount) >= Number(totalAmount)) return 'Paid';
  if (due < now) return 'Overdue';
  if (Number(paidAmount) > 0) return 'Partially Paid';
  return 'Pending';
}

function makeInvoiceNumber() {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createCreditInvoice(input = {}) {
  const invoiceNumber = input.invoice_number || makeInvoiceNumber();
  const totalAmount = Number(input.total_amount || 0);
  const paidAmount = Number(input.paid_amount || 0);
  const dueDate = input.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const status = input.status || normalizeStatus({ dueDate, totalAmount, paidAmount });

  const info = await db.prepare(
    `INSERT INTO credit_invoices (
      invoice_number, buyer_shop_id, seller_shop_id, product_list, quantity, price, total_amount, paid_amount, due_date, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).run(
    invoiceNumber,
    input.buyer_shop_id,
    input.seller_shop_id,
    JSON.stringify(input.product_list || []),
    input.quantity || 0,
    input.price || 0,
    totalAmount,
    paidAmount,
    dueDate,
    status,
  );

  return db.prepare(`SELECT * FROM credit_invoices WHERE id = ?`).get(info.lastInsertRowid);
}

export async function listCreditInvoices(shopId) {
  return db.prepare(
    `SELECT ci.*, b.name AS buyer_name, s.name AS seller_name
     FROM credit_invoices ci
     LEFT JOIN shops b ON b.id = ci.buyer_shop_id
     LEFT JOIN shops s ON s.id = ci.seller_shop_id
     WHERE ci.buyer_shop_id = ? OR ci.seller_shop_id = ?
     ORDER BY ci.created_at DESC`,
  ).all(shopId, shopId);
}

export async function getCreditInvoice(id) {
  return db.prepare(
    `SELECT ci.*, b.name AS buyer_name, s.name AS seller_name
     FROM credit_invoices ci
     LEFT JOIN shops b ON b.id = ci.buyer_shop_id
     LEFT JOIN shops s ON s.id = ci.seller_shop_id
     WHERE ci.id = ?`,
  ).get(id);
}

export async function updateCreditInvoice(id, input = {}) {
  const existing = await getCreditInvoice(id);
  if (!existing) return null;

  const totalAmount = Number(input.total_amount ?? existing.total_amount ?? 0);
  const paidAmount = Number(input.paid_amount ?? existing.paid_amount ?? 0);
  const dueDate = input.due_date || existing.due_date;
  const status = input.status || normalizeStatus({ dueDate, totalAmount, paidAmount });

  await db.prepare(
    `UPDATE credit_invoices
     SET invoice_number = ?, buyer_shop_id = ?, seller_shop_id = ?, product_list = ?, quantity = ?, price = ?, total_amount = ?, paid_amount = ?, due_date = ?, status = ?
     WHERE id = ?`,
  ).run(
    input.invoice_number || existing.invoice_number,
    input.buyer_shop_id ?? existing.buyer_shop_id,
    input.seller_shop_id ?? existing.seller_shop_id,
    JSON.stringify(input.product_list ?? JSON.parse(existing.product_list || '[]')),
    input.quantity ?? existing.quantity,
    input.price ?? existing.price,
    totalAmount,
    paidAmount,
    dueDate,
    status,
    id,
  );

  return getCreditInvoice(id);
}

export async function markInvoicePaid(id, amount = 0) {
  const invoice = await getCreditInvoice(id);
  if (!invoice) return null;

  const paidAmount = Number(invoice.paid_amount ?? 0) + Number(amount ?? invoice.total_amount ?? 0);
  const totalAmount = Number(invoice.total_amount || 0);
  const status = normalizeStatus({ dueDate: invoice.due_date, totalAmount, paidAmount });

  await db.prepare(`UPDATE credit_invoices SET paid_amount = ?, status = ? WHERE id = ?`).run(paidAmount, status, id);
  const updated = await getCreditInvoice(id);
  const buyer = await db.prepare(`SELECT * FROM shops WHERE id = ?`).get(updated.buyer_shop_id);
  publishNotification({
    type: 'payment_received',
    title: 'Payment Received',
    amount: updated.total_amount,
    buyerShop: buyer?.name || buyer?.shop_name || 'Buyer Shop',
    invoiceNumber: updated.invoice_number,
    transactionId: `TXN-${updated.id}`,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    shopId: updated.seller_shop_id,
    recipientShopId: updated.seller_shop_id,
    message: `Payment received for invoice ${updated.invoice_number}`,
  });
  return updated;
}
