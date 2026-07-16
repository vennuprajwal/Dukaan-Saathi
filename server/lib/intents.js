import { db, normalize } from "../db.js";
import {
  todaySummary,
  totalDues,
  customerDues,
  lowStock,
  todayExpenses,
  bestSellerToday,
  undoLast,
} from "./queries.js";

/* Execute a parsed message against a shop's data.
   Returns { replyKey, data } that replies.compose() turns into localized text. */
export async function executeIntent(parsed, shop) {
  const shopId = shop.id;
  switch (parsed.intent) {
    case "log_sale":
      return logSale(parsed, shopId);
    case "restock":
      return restock(parsed, shopId);
    case "record_payment":
      return recordPayment(parsed, shopId);
    case "record_expense":
      return recordExpense(parsed, shopId);
    case "add_product":
      return addProduct(parsed, shopId);
    case "query_profit": {
      const s = await todaySummary(shopId);
      return { replyKey: "profit_report", data: s };
    }
    case "query_money_today": {
      const s = await todaySummary(shopId);
      return { replyKey: "money_today", data: s };
    }
    case "query_expenses":
      return { replyKey: "expenses_report", data: await todayExpenses(shopId) };
    case "query_dues":
      return { replyKey: "dues_report", data: await totalDues(shopId) };
    case "query_customer_dues":
      return { replyKey: "customer_dues_report", data: await customerDues(shopId, parsed.party_name) };
    case "query_stock":
      return { replyKey: "stock_report", data: { items: await lowStock(shopId) } };
    case "query_sales": {
      const s = await todaySummary(shopId);
      return { replyKey: "sales_report", data: s };
    }
    case "day_report":
      return { replyKey: "day_report", data: await dayReport(shopId) };
    case "undo_last": {
      const undone = await undoLast(shopId);
      return undone
        ? { replyKey: "undone", data: undone }
        : { replyKey: "nothing_to_undo", data: {} };
    }
    case "help":
      return { replyKey: "onboarding", data: {} };
    default:
      return { replyKey: "not_understood", data: {} };
  }
}

/* Assemble a full end-of-day snapshot from the existing queries. */
async function dayReport(shopId) {
  const s = await todaySummary(shopId);
  const duesData = await totalDues(shopId);
  const low = await lowStock(shopId);
  const best = await bestSellerToday(shopId);
  return {
    revenue: s.revenue,
    profit: s.profit,
    expenses: s.expenses,
    netProfit: s.netProfit,
    moneyReceived: s.moneyReceived,
    orders: s.orders,
    duesTotal: duesData.total,
    duesCount: duesData.customers.length,
    lowStock: low,
    best,
  };
}

/* ---- product / customer find-or-create ------------------------------------ */
async function findOrCreateProduct(shopId, name, { unit = "unit", sellPrice = 0, purchasePrice = 0, supplier = null, expiryDate = null, batchNumber = null, barcode = null, qrCode = null, lowStockThreshold = 5 } = {}) {
  const norm = normalize(name);
  let p = await db
    .prepare("SELECT * FROM products WHERE shop_id = ? AND name_norm = ?")
    .get(shopId, norm);
  if (!p) {
    // Unknown cost → assume a modest 20% margin so demo profit is believable.
    const cost = sellPrice > 0 ? Math.round(sellPrice * 0.8) : 0;
    const info = await db
      .prepare(
        `INSERT INTO products (shop_id, name, name_norm, unit, stock_qty, cost_price, sell_price, supplier, purchase_price, selling_price, expiry_date, batch_number, barcode, qr_code, low_stock_threshold)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(shopId, name, norm, unit, cost, sellPrice, supplier || null, Number(purchasePrice || cost || 0), Number(sellPrice || 0), expiryDate || null, batchNumber || null, barcode || null, qrCode || null, Number(lowStockThreshold || 5));
    p = await db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
  }
  return p;
}

async function findOrCreateCustomer(shopId, name) {
  const norm = normalize(name);
  let c = await db
    .prepare("SELECT * FROM customers WHERE shop_id = ? AND name_norm = ?")
    .get(shopId, norm);
  if (!c) {
    const info = await db
      .prepare("INSERT INTO customers (shop_id, name, name_norm) VALUES (?, ?, ?)")
      .run(shopId, name, norm);
    c = await db.prepare("SELECT * FROM customers WHERE id = ?").get(info.lastInsertRowid);
  }
  return c;
}

async function customerOutstanding(customerId) {
  const row = await db
    .prepare(
      `SELECT
         COALESCE((SELECT SUM(amount) FROM sales WHERE customer_id = ? AND payment_type='udhaar'),0)
       - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = ?),0) AS bal`,
    )
    .get(customerId, customerId);
  return row.bal || 0;
}

/* ---- intent implementations ---------------------------------------------- */
async function logSale(p, shopId) {
  const item = p.item || "item";
  const qty = p.qty && p.qty > 0 ? p.qty : 1;

  const payment_type = p.payment_type === "udhaar" ? "udhaar" : "cash";
  let customerId = null;
  let party = p.party_name;

  if (payment_type === "udhaar") {
    if (p.customer_id) {
      const c = await db.prepare("SELECT * FROM customers WHERE id = ? AND shop_id = ?").get(p.customer_id, shopId);
      if (c) {
        customerId = c.id;
        party = c.name;
      }
    }
    if (!customerId) {
      if (!party) return { replyKey: "need_customer", data: {} };
      const c = await findOrCreateCustomer(shopId, party);
      customerId = c.id;
    }
  }

  let amount = p.amount;
  let unitPrice = p.unit_price;

  const product = await findOrCreateProduct(shopId, item, {
    unit: p.unit,
    sellPrice: unitPrice || amount || 0,
    purchasePrice: p.purchase_price || p.cost_price || 0,
    supplier: p.supplier || null,
    expiryDate: p.expiry_date || null,
    batchNumber: p.batch_number || null,
    barcode: p.barcode || null,
    qrCode: p.qr_code || null,
    lowStockThreshold: p.low_stock_threshold || 5,
  });

  if (amount == null && unitPrice != null) amount = unitPrice * qty;
  if (unitPrice == null && amount != null) unitPrice = amount / qty;
  if (amount == null) {
    unitPrice = product.sell_price || 0;
    amount = unitPrice * qty;
  }
  const costAmount = (product.cost_price || 0) * qty;

  await db.prepare(
    `INSERT INTO sales (shop_id, product_id, item_text, qty, unit_price, amount, cost_amount, payment_type, customer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(shopId, product.id, item, qty, unitPrice || 0, amount, costAmount, payment_type, customerId);

  await db.prepare("UPDATE products SET stock_qty = MAX(stock_qty - ?, 0) WHERE id = ?").run(qty, product.id);

  const newDue = customerId ? await customerOutstanding(customerId) : 0;
  // Today's running totals so the reply can warmly confirm the bigger picture
  // ("today's sales are now ₹X") — all grounded in the DB, never invented.
  const today = await todaySummary(shopId);
  const lowNow = product.stock_qty - qty <= 5 ? product.name : null;
  return {
    replyKey: "sale_logged",
    data: {
      item, qty, unit: product.unit, amount, payment_type, party, newDue,
      todayRevenue: today.revenue, todayOrders: today.orders, lowStockItem: lowNow,
    },
  };
}

async function restock(p, shopId) {
  const item = p.item || "item";
  const qty = p.qty && p.qty > 0 ? p.qty : 1;
  const product = await findOrCreateProduct(shopId, item, {
    unit: p.unit,
    purchasePrice: p.purchase_price || p.cost_price || 0,
    supplier: p.supplier || null,
    expiryDate: p.expiry_date || null,
    batchNumber: p.batch_number || null,
    barcode: p.barcode || null,
    qrCode: p.qr_code || null,
    lowStockThreshold: p.low_stock_threshold || 5,
  });
  if (p.unit_price != null) {
    await db.prepare("UPDATE products SET cost_price = ? WHERE id = ?").run(p.unit_price, product.id);
  }
  await db.prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(qty, product.id);
  const updated = await db.prepare("SELECT * FROM products WHERE id = ?").get(product.id);
  return {
    replyKey: "restocked",
    data: { item, qty, unit: updated.unit, newStock: updated.stock_qty },
  };
}

async function recordPayment(p, shopId) {
  if (!p.party_name) return { replyKey: "need_customer", data: {} };
  if (!(p.amount > 0)) return { replyKey: "not_understood", data: {} };
  const c = await findOrCreateCustomer(shopId, p.party_name);
  await db.prepare("INSERT INTO payments (shop_id, customer_id, amount) VALUES (?, ?, ?)").run(
    shopId,
    c.id,
    p.amount,
  );
  const remaining = Math.max(await customerOutstanding(c.id), 0);
  return {
    replyKey: "payment_recorded",
    data: { party: c.name, amount: p.amount, remaining },
  };
}

async function recordExpense(p, shopId) {
  const amount = p.amount;
  if (!(amount > 0)) return { replyKey: "not_understood", data: {} };
  const category = (p.category || p.item || "misc").toString().trim() || "misc";
  await db.prepare(
    "INSERT INTO expenses (shop_id, category, note, amount) VALUES (?, ?, ?, ?)",
  ).run(shopId, category, p._raw || null, amount);

  const { total } = await todayExpenses(shopId);
  const { netProfit } = await todaySummary(shopId);
  return {
    replyKey: "expense_logged",
    data: { category, amount, totalToday: total, netProfit },
  };
}

async function addProduct(p, shopId) {
  const item = p.item || "item";
  await findOrCreateProduct(shopId, item, {
    unit: p.unit,
    sellPrice: p.unit_price || 0,
    purchasePrice: p.purchase_price || p.cost_price || 0,
    supplier: p.supplier || null,
    expiryDate: p.expiry_date || null,
    batchNumber: p.batch_number || null,
    barcode: p.barcode || null,
    qrCode: p.qr_code || null,
    lowStockThreshold: p.low_stock_threshold || 5,
  });
  return { replyKey: "product_added", data: { item } };
}
