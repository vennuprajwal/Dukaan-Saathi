import { db, normalize } from "../db.js";
import { getNotificationsForShop } from "./notifications.js";

/* All queries are scoped by shop_id. Timestamps are stored UTC; we compare in
   local time so "today" matches the shopkeeper's day. */
const TODAY = "date(created_at, 'localtime') = date('now', 'localtime')";

export async function todaySummary(shopId) {
  const sales = await db
    .prepare(
      `SELECT COALESCE(SUM(amount),0) AS revenue,
              COALESCE(SUM(cost_amount),0) AS cost,
              COALESCE(SUM(CASE WHEN payment_type='cash' THEN amount ELSE 0 END),0) AS cash,
              COUNT(*) AS orders
       FROM sales WHERE shop_id = ? AND ${TODAY}`,
    )
    .get(shopId);
  const repay = await db
    .prepare(
      `SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE shop_id = ? AND ${TODAY}`,
    )
    .get(shopId);
  const exp = await db
    .prepare(
      `SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE shop_id = ? AND ${TODAY}`,
    )
    .get(shopId);

  const revenue = sales.revenue;
  const profit = sales.revenue - sales.cost; // gross profit (revenue − cost of goods)
  const expenses = exp.total;
  const netProfit = profit - expenses; // net profit (gross − running expenses)
  const moneyReceived = sales.cash + repay.total; // cash sales + udhaar repayments
  return {
    revenue,
    profit,
    expenses,
    netProfit,
    moneyReceived,
    orders: sales.orders,
    udhaarGiven: revenue - sales.cash,
  };
}

export async function monthlySales(shopId) {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS orders
       FROM sales
       WHERE shop_id = ? AND created_at >= datetime('now', 'start of month')`,
    )
    .get(shopId);
  return {
    amount: Number(row?.amount || 0),
    orders: Number(row?.orders || 0),
  };
}

export async function creditOverview(shopId) {
  const rows = await db
    .prepare(
      `SELECT id, invoice_number, total_amount, paid_amount, due_date, status, created_at
       FROM credit_invoices
       WHERE seller_shop_id = ? OR buyer_shop_id = ?
       ORDER BY due_date ASC, created_at DESC`,
    )
    .all(shopId, shopId);

  const pending = rows.filter((invoice) => !["paid", "closed"].includes(String(invoice.status || "").toLowerCase()));
  const pendingAmount = pending.reduce((sum, invoice) => sum + (Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)), 0);
  const receivedAmount = rows.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const outstandingAmount = rows.reduce((sum, invoice) => sum + (Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)), 0);

  return {
    pendingCount: pending.length,
    pendingAmount,
    receivedAmount,
    outstandingAmount,
    invoices: rows,
  };
}

export async function recentTransactions(shopId) {
  const [salesRows, paymentsRows, creditRows] = await Promise.all([
    db
      .prepare(
        `SELECT id, item_text AS title, amount, created_at, 'sale' AS kind
         FROM sales WHERE shop_id = ? ORDER BY created_at DESC LIMIT 6`,
      )
      .all(shopId),
    db
      .prepare(
        `SELECT p.id, COALESCE(c.name, 'Customer') AS title, p.amount, p.created_at, 'payment' AS kind
         FROM payments p
         LEFT JOIN customers c ON c.id = p.customer_id
         WHERE p.shop_id = ? ORDER BY p.created_at DESC LIMIT 6`,
      )
      .all(shopId),
    db
      .prepare(
        `SELECT id, invoice_number AS title, total_amount AS amount, created_at, 'credit' AS kind
         FROM credit_invoices
         WHERE seller_shop_id = ? OR buyer_shop_id = ? ORDER BY created_at DESC LIMIT 6`,
      )
      .all(shopId, shopId),
  ]);

  return [...salesRows, ...paymentsRows, ...creditRows]
    .map((row) => ({ ...row, amount: Number(row.amount || 0) }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);
}

export async function upcomingDueDates(shopId) {
  const rows = await db
    .prepare(
      `SELECT id, invoice_number, due_date, total_amount, paid_amount, status
       FROM credit_invoices
       WHERE (seller_shop_id = ? OR buyer_shop_id = ?) AND status NOT IN ('Paid', 'closed')
       ORDER BY due_date ASC, created_at DESC`,
    )
    .all(shopId, shopId);

  return rows.map((row) => ({
    ...row,
    remaining: Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)),
  }));
}

export async function dashboardOverview(shopId) {
  const [todaySales, monthly, credits, transactions, notifications, dueDates, lowStockItems] = await Promise.all([
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS amount
         FROM sales WHERE shop_id = ? AND date(created_at, 'localtime') = date('now', 'localtime')`,
      )
      .get(shopId),
    monthlySales(shopId),
    creditOverview(shopId),
    recentTransactions(shopId),
    Promise.resolve(getNotificationsForShop(shopId).slice(-6).reverse()),
    upcomingDueDates(shopId),
    lowStock(shopId, 5),
  ]);

  return {
    todaySales: Number(todaySales?.amount || 0),
    monthlySales: monthly.amount,
    pendingCredits: credits.pendingCount,
    receivedPayments: credits.receivedAmount,
    outstandingAmount: credits.outstandingAmount,
    recentTransactions: transactions,
    recentNotifications: notifications,
    upcomingDueDates: dueDates,
    lowStockAlerts: lowStockItems,
  };
}

export async function salesFeed(shopId, limit = 25) {
  return db
    .prepare(
      `SELECT s.id, s.item_text, s.qty, s.unit_price, s.amount, s.payment_type,
              s.created_at, c.name AS customer
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.shop_id = ? ORDER BY s.created_at DESC LIMIT ?`,
    )
    .all(shopId, limit);
}

export async function inventory(shopId) {
  return db
    .prepare(
      `SELECT id, name, unit, stock_qty, cost_price, sell_price,
              supplier, purchase_price, selling_price, expiry_date, batch_number,
              barcode, qr_code, low_stock_threshold
       FROM products WHERE shop_id = ? ORDER BY stock_qty ASC, name ASC`,
    )
    .all(shopId);
}

export async function lowStock(shopId, threshold = 5) {
  return db
    .prepare(
      `SELECT id, name, unit, stock_qty, supplier, expiry_date, batch_number, barcode, qr_code,
              COALESCE(low_stock_threshold, ?) AS low_stock_threshold
       FROM products
       WHERE shop_id = ? AND stock_qty <= ? ORDER BY stock_qty ASC`,
    )
    .all(threshold, shopId, threshold);
}

/* Outstanding udhaar per customer = udhaar sales − repayments.
   Wrapped in a subquery so we can filter on the computed alias per row
   (HAVING without GROUP BY would collapse to a single group in SQLite). */
export async function dues(shopId) {
  return db
    .prepare(
      `SELECT id, name, outstanding FROM (
         SELECT c.id AS id, c.name AS name,
           COALESCE((SELECT SUM(amount) FROM sales
                     WHERE customer_id = c.id AND payment_type='udhaar'),0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id),0)
           AS outstanding
         FROM customers c WHERE c.shop_id = ?
       )
       WHERE outstanding > 0.001
       ORDER BY outstanding DESC`,
    )
    .all(shopId);
}

export async function totalDues(shopId) {
  const rows = await dues(shopId);
  return {
    total: rows.reduce((s, r) => s + r.outstanding, 0),
    customers: rows,
  };
}

/* Outstanding udhaar for one named customer.
   Matches on the normalized name (exact first, then a loose contains match so
   "ramesh kumar" resolves from "ramesh"). Returns:
     { status: "found",     name, outstanding }  — a known customer
     { status: "clear",     name, outstanding }  — known, but nothing pending
     { status: "not_found", name }               — no such customer
     { status: "no_name" }                        — the message had no name */
export async function customerDues(shopId, name) {
  const query = (name || "").trim();
  if (!query) return { status: "no_name" };

  const norm = normalize(query);
  const rows = await dues(shopId); // only customers with outstanding > 0
  const all = await db
    .prepare("SELECT name, name_norm FROM customers WHERE shop_id = ?")
    .all(shopId);

  const match =
    rows.find((r) => normalize(r.name) === norm) ||
    rows.find((r) => normalize(r.name).includes(norm) || norm.includes(normalize(r.name)));
  if (match) return { status: "found", name: match.name, outstanding: match.outstanding };

  // No outstanding dues, but do we even know this customer?
  const known =
    all.find((c) => c.name_norm === norm) ||
    all.find((c) => c.name_norm.includes(norm) || norm.includes(c.name_norm));
  if (known) return { status: "clear", name: known.name, outstanding: 0 };

  return { status: "not_found", name: query };
}

export async function productsSoldToday(shopId) {
  return db
    .prepare(
      `SELECT item_text, SUM(qty) AS qty, SUM(amount) AS amount
       FROM sales WHERE shop_id = ? AND ${TODAY}
       GROUP BY lower(item_text) ORDER BY amount DESC`,
    )
    .all(shopId);
}

/* Per-item profit for today: revenue, cost of goods and the profit each item made. */
export async function itemProfitToday(shopId) {
  return db
    .prepare(
      `SELECT item_text AS item, SUM(qty) AS qty,
              SUM(amount) AS revenue, SUM(cost_amount) AS cost,
              SUM(amount - cost_amount) AS profit
       FROM sales WHERE shop_id = ? AND ${TODAY}
       GROUP BY lower(item_text) ORDER BY profit DESC`,
    )
    .all(shopId);
}

/* Today's best performers, derived from per-item numbers. Returns null when no sales. */
export async function bestSellerToday(shopId) {
  const rows = await itemProfitToday(shopId);
  if (!rows.length) return null;
  const byQty = [...rows].sort((a, b) => b.qty - a.qty)[0];
  const byProfit = [...rows].sort((a, b) => b.profit - a.profit)[0];
  return {
    topSeller: { item: byQty.item, qty: byQty.qty, revenue: byQty.revenue },
    topProfit: { item: byProfit.item, profit: byProfit.profit },
  };
}

/* Today's expenses: running total plus the individual entries. */
export async function todayExpenses(shopId) {
  const items = await db
    .prepare(
      `SELECT id, category, note, amount, created_at
       FROM expenses WHERE shop_id = ? AND ${TODAY} ORDER BY created_at DESC`,
    )
    .all(shopId);
  return { total: items.reduce((s, r) => s + r.amount, 0), items };
}

/* Undo the single most recent entry (sale, expense or payment) for a shop.
   Reverses side effects — a reverted sale returns its qty to stock. The
   mutations run in one atomic batch. Returns { type, description } or null when
   there is nothing to undo. */
export async function undoLast(shopId) {
  const candidates = (
    await Promise.all([
      db.prepare(`SELECT 'sale' AS type, id, created_at, item_text, qty, amount, product_id
                  FROM sales WHERE shop_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`).get(shopId),
      db.prepare(`SELECT 'expense' AS type, id, created_at, category, note, amount
                  FROM expenses WHERE shop_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`).get(shopId),
      db.prepare(`SELECT 'payment' AS type, p.id, p.created_at, p.amount, c.name AS party
                  FROM payments p LEFT JOIN customers c ON c.id = p.customer_id
                  WHERE p.shop_id = ? ORDER BY p.created_at DESC, p.id DESC LIMIT 1`).get(shopId),
    ])
  ).filter(Boolean);
  if (!candidates.length) return null;

  const last = candidates.sort((a, b) =>
    b.created_at < a.created_at ? -1 : b.created_at > a.created_at ? 1 : 0,
  )[0];

  const statements = [];
  let result;
  if (last.type === "sale") {
    if (last.product_id) {
      statements.push({
        sql: "UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?",
        args: [last.qty, last.product_id],
      });
    }
    statements.push({ sql: "DELETE FROM sales WHERE id = ?", args: [last.id] });
    result = { type: "sale", description: `${+Number(last.qty)} ${last.item_text} (₹${Math.round(last.amount)})` };
  } else if (last.type === "expense") {
    statements.push({ sql: "DELETE FROM expenses WHERE id = ?", args: [last.id] });
    result = { type: "expense", description: `${last.category || last.note || "expense"} (₹${Math.round(last.amount)})` };
  } else {
    statements.push({ sql: "DELETE FROM payments WHERE id = ?", args: [last.id] });
    result = { type: "payment", description: `${last.party || "payment"} (₹${Math.round(last.amount)})` };
  }

  await db.batch(statements);
  return result;
}

export async function last7Days(shopId) {
  const rows = await db
    .prepare(
      `SELECT date(created_at, 'localtime') AS day,
              SUM(amount) AS revenue,
              SUM(amount - cost_amount) AS profit
       FROM sales WHERE shop_id = ?
         AND date(created_at,'localtime') >= date('now','localtime','-6 days')
       GROUP BY day ORDER BY day ASC`,
    )
    .all(shopId);
  // fill gaps for a clean 7-point chart
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = (
      await db.prepare("SELECT date('now','localtime', ?) AS d").get(`-${i} days`)
    ).d;
    out.push({ day: d, revenue: byDay[d]?.revenue || 0, profit: byDay[d]?.profit || 0 });
  }
  return out;
}

export async function businessHealth(shopId) {
  const trend = await last7Days(shopId);
  const revs = trend.slice(0, 6).map(t => t.revenue);
  const avgRev = revs.reduce((a, b) => a + b, 0) / 6 || 1;
  const todayRev = trend[6].revenue;

  // Revenue score: max 40 points if today is > 90% of avg
  const revScore = Math.min(40, (todayRev / avgRev) * 40);

  // Udhaar score: max 30 points if udhaar is manageable
  const duesData = await dues(shopId);
  const totalUdhaar = duesData.reduce((s, r) => s + r.outstanding, 0);
  const udhaarRatio = totalUdhaar / (avgRev * 30 || 1); // rough monthly rev
  const udhaarScore = Math.max(0, 30 - (udhaarRatio * 100)); // penalize high udhaar

  // Inventory score: max 30 points for low out-of-stock
  const low = await lowStock(shopId);
  const totalProds = await db.prepare("SELECT COUNT(*) as c FROM products WHERE shop_id = ?").get(shopId);
  const lowRatio = totalProds.c > 0 ? (low.length / totalProds.c) : 0;
  const invScore = Math.max(0, 30 - (lowRatio * 60));

  const score = Math.round(revScore + udhaarScore + invScore);
  
  let explanation = "";
  let tone = "leaf";
  let nextGoal = "";

  if (score >= 80) {
    explanation = "Excellent cash flow and strong sales.";
    nextGoal = "Try upselling to hit your daily revenue target.";
  } else if (score >= 50) {
    explanation = "Business is stable, but watch pending udhaar.";
    tone = "marigold";
    nextGoal = "Focus on collecting pending Udhaar today.";
  } else {
    explanation = "Low sales and high pending dues are impacting health.";
    tone = "terracotta";
    nextGoal = "Urgently collect Udhaar and restock popular items.";
  }

  // Daily Goal is 110% of the 7-day average
  const dailyGoal = Math.round(avgRev * 1.1);

  return {
    score: Math.min(100, Math.max(0, score)),
    explanation,
    insight: explanation,
    nextGoal,
    tone,
    dailyGoal,
    todaysGoal: dailyGoal,
    currentRevenue: todayRev
  };
}
