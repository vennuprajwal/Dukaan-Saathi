import { Router } from "express";
import { requireAuth } from "../auth.js";
import {
  todaySummary,
  salesFeed,
  inventory,
  totalDues,
  productsSoldToday,
  itemProfitToday,
  bestSellerToday,
  todayExpenses,
  last7Days,
  businessHealth,
  dashboardOverview,
} from "../lib/queries.js";
import { executeIntent } from "../lib/intents.js";
import { seedDemoData, clearShopData } from "../lib/seed.js";
import { db, normalize, normalizePhone } from "../db.js";

export const dataRouter = Router();
dataRouter.use(requireAuth);

dataRouter.get("/dashboard", async (req, res) => {
  const shopId = req.shop.id;
  const [summary, sales, inv, duesData, productsSold, itemProfit, bestSeller, expenses, trend, health, overview] =
    await Promise.all([
      todaySummary(shopId),
      salesFeed(shopId, 25),
      inventory(shopId),
      totalDues(shopId),
      productsSoldToday(shopId),
      itemProfitToday(shopId),
      bestSellerToday(shopId),
      todayExpenses(shopId),
      last7Days(shopId),
      businessHealth(shopId),
      dashboardOverview(shopId),
    ]);
  res.json({
    shop: {
      id: req.shop.id,
      name: req.shop.name,
      whatsapp_number: req.shop.whatsapp_number,
      lang_pref: req.shop.lang_pref,
      upi_id: req.shop.upi_id,
    },
    summary,
    sales,
    inventory: inv,
    dues: duesData,
    productsSold,
    itemProfit,
    bestSeller,
    expenses,
    trend,
    health,
    overview,
  });
});

/* Record an expense from the dashboard. */
dataRouter.post("/expenses", async (req, res) => {
  const { amount, category, note } = req.body || {};
  if (!(amount > 0)) {
    return res.status(400).json({ error: "positive amount required" });
  }
  await db.prepare(
    "INSERT INTO expenses (shop_id, category, note, amount) VALUES (?, ?, ?, ?)",
  ).run(req.shop.id, (category || "misc").toString().trim() || "misc", note || null, amount);
  const [expenses, summary] = await Promise.all([
    todayExpenses(req.shop.id),
    todaySummary(req.shop.id),
  ]);
  res.json({ ok: true, expenses, summary });
});

/* Record an udhaar repayment from the dashboard. */
dataRouter.post("/payments", async (req, res) => {
  const { customer_id, amount, payment_method, txn_ref, upi_id } = req.body || {};
  if (!customer_id || !(amount > 0)) {
    return res.status(400).json({ error: "customer_id and positive amount required" });
  }
  const customer = await db
    .prepare("SELECT * FROM customers WHERE id = ? AND shop_id = ?")
    .get(customer_id, req.shop.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  if (upi_id && !customer.upi_id) {
    await db.prepare("UPDATE customers SET upi_id = ? WHERE id = ?").run(upi_id.toString().trim(), customer_id);
  }

  await db.prepare(
    "INSERT INTO payments (shop_id, customer_id, amount, payment_method, txn_ref) VALUES (?, ?, ?, ?, ?)",
  ).run(
    req.shop.id,
    customer_id,
    amount,
    (payment_method || "cash").toString().trim(),
    (txn_ref || "").toString().trim() || null
  );
  res.json({ ok: true, dues: await totalDues(req.shop.id) });
});

/* Update the shop's preferred language from the dashboard. */
dataRouter.post("/lang", async (req, res) => {
  const { lang } = req.body || {};
  if (!["en", "hi", "te"].includes(lang)) {
    return res.status(400).json({ error: "lang must be en, hi or te" });
  }
  await db.prepare("UPDATE shops SET lang_pref = ? WHERE id = ?").run(lang, req.shop.id);
  res.json({ ok: true, lang });
});

/* Record a sale entered manually from the dashboard. Reuses the same
   executeIntent pipeline as the chat so stock, udhaar and profit stay
   consistent no matter how the sale was entered. */
dataRouter.post("/sales", async (req, res) => {
  const { item, qty, amount, unit, payment_type, party_name, customer_id } = req.body || {};
  if (!item || !(amount > 0)) {
    return res.status(400).json({ error: "item and positive amount required" });
  }
  const pay = payment_type === "udhaar" ? "udhaar" : "cash";
  if (pay === "udhaar" && !customer_id && !(party_name || "").trim()) {
    return res.status(400).json({ error: "customer name required for udhaar" });
  }
  const parsed = {
    intent: "log_sale",
    item: String(item).toLowerCase().trim(),
    qty: qty > 0 ? Number(qty) : 1,
    unit: (unit || "unit").toString().trim() || "unit",
    unit_price: null,
    amount: Number(amount),
    party_name: pay === "udhaar" ? String(party_name).trim() : null,
    payment_type: pay,
    customer_id: pay === "udhaar" ? customer_id : null,
    _raw: "dashboard:add-sale",
  };
  const result = await executeIntent(parsed, req.shop);
  const summary = await todaySummary(req.shop.id);
  res.json({ ok: true, result, summary });
});

/* Seed the current shop with realistic demo data (idempotent — replaces any
   existing data for this shop). */
dataRouter.post("/demo", async (req, res) => {
  const stats = await seedDemoData(req.shop.id);
  res.json({ ok: true, seeded: stats });
});

/* Wipe the current shop's transactional data (keeps the login). */
dataRouter.post("/reset", async (req, res) => {
  await clearShopData(req.shop.id);
  res.json({ ok: true });
});

/* Export the shop's data as CSV (sales, with customer + payment type). */
dataRouter.get("/export", async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT s.created_at, s.item_text, s.qty, s.unit_price, s.amount,
              s.payment_type, COALESCE(c.name,'') AS customer
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.shop_id = ? ORDER BY s.created_at DESC`,
    )
    .all(req.shop.id);

  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["date", "item", "qty", "unit_price", "amount", "payment_type", "customer"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.created_at, r.item_text, r.qty, r.unit_price, r.amount, r.payment_type, r.customer]
        .map(esc)
        .join(","),
    );
  }
  const csv = lines.join("\n");
  const stamp = (req.shop.name || "shop").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="dukaan-${stamp}-sales.csv"`);
  res.send(csv);
});

/* Search customers by name or phone */
dataRouter.get("/customers", async (req, res) => {
  const shopId = req.shop.id;
  const q = (req.query.q || "").toString().trim();
  let rows;
  if (q) {
    const term = `%${q}%`;
    rows = await db.prepare(
      `SELECT c.*,
         COALESCE((SELECT SUM(amount) FROM sales WHERE customer_id = c.id AND payment_type='udhaar'), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0) AS outstanding
       FROM customers c 
       WHERE c.shop_id = ? 
         AND (c.name LIKE ? OR c.phone LIKE ?)
       ORDER BY c.name ASC
       LIMIT 50`
    ).all(shopId, term, term);
  } else {
    rows = await db.prepare(
      `SELECT c.*,
         COALESCE((SELECT SUM(amount) FROM sales WHERE customer_id = c.id AND payment_type='udhaar'), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0) AS outstanding
       FROM customers c 
       WHERE c.shop_id = ? 
       ORDER BY c.name ASC
       LIMIT 50`
    ).all(shopId);
  }
  res.json({ ok: true, customers: rows });
});

/* Create a new customer */
dataRouter.post("/customers", async (req, res) => {
  const shopId = req.shop.id;
  const { name, phone, upi_id, address, notes } = req.body || {};
  if (!(name || "").trim()) {
    return res.status(400).json({ error: "Customer name is required" });
  }

  const normalizedPhone = normalizePhone(phone) || null;

  if (normalizedPhone) {
    const existing = await db.prepare(
      "SELECT * FROM customers WHERE shop_id = ? AND phone = ?"
    ).get(shopId, normalizedPhone);
    if (existing) {
      return res.status(400).json({ error: "A customer with this phone number already exists." });
    }
  }

  const norm = normalize(name);
  try {
    const result = await db.prepare(
      `INSERT INTO customers (shop_id, name, name_norm, phone, upi_id, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      shopId,
      name.trim(),
      norm,
      normalizedPhone,
      (upi_id || "").trim() || null,
      (address || "").trim() || null,
      (notes || "").trim() || null
    );

    const customer = await db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid);
    res.json({ ok: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a customer
dataRouter.delete("/customers/:id", async (req, res) => {
  const shopId = req.shop.id;
  const { id } = req.params;
  // Verify customer belongs to shop
  const existing = await db.prepare("SELECT * FROM customers WHERE id = ? AND shop_id = ?").get(id, shopId);
  if (!existing) {
    return res.status(404).json({ error: "Customer not found" });
  }
  await db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  res.json({ ok: true });
});

// Update a customer
dataRouter.put("/customers/:id", async (req, res) => {
  const shopId = req.shop.id;
  const { id } = req.params;
  const { name, phone, upi_id, address, notes } = req.body || {};
  const existing = await db.prepare("SELECT * FROM customers WHERE id = ? AND shop_id = ?").get(id, shopId);
  if (!existing) {
    return res.status(404).json({ error: "Customer not found" });
  }
  if (name && !(name.trim())) {
    return res.status(400).json({ error: "Customer name cannot be empty" });
  }
  const normalizedPhone = phone ? normalizePhone(phone) : existing.phone;
  if (normalizedPhone) {
    const dup = await db.prepare("SELECT * FROM customers WHERE shop_id = ? AND phone = ? AND id != ?").get(shopId, normalizedPhone, id);
    if (dup) {
      return res.status(400).json({ error: "Another customer with this phone number already exists." });
    }
  }
  const normName = name ? normalize(name) : existing.name_norm;
  await db.prepare(`UPDATE customers SET name = ?, name_norm = ?, phone = ?, upi_id = ?, address = ?, notes = ? WHERE id = ?`)
    .run(
      name ? name.trim() : existing.name,
      normName,
      normalizedPhone,
      upi_id !== undefined ? (upi_id || null) : existing.upi_id,
      address !== undefined ? (address || null) : existing.address,
      notes !== undefined ? (notes || null) : existing.notes,
      id
    );
  const updated = await db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  res.json({ ok: true, customer: updated });
});

/* GET /ledger - Returns all customers with aggregated ledger statistics */
dataRouter.get("/ledger", async (req, res) => {
  const shopId = req.shop.id;
  try {
    const rows = await db.prepare(
      `SELECT 
         c.id,
         c.name,
         c.phone,
         c.upi_id,
         c.address,
         c.notes,
         COALESCE((SELECT SUM(amount) FROM sales WHERE customer_id = c.id AND payment_type = 'udhaar'), 0) AS total_bills_amount,
         COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0) AS total_paid,
         (COALESCE((SELECT SUM(amount) FROM sales WHERE customer_id = c.id AND payment_type = 'udhaar'), 0) - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0)) AS total_outstanding,
         (SELECT COUNT(*) FROM sales WHERE customer_id = c.id AND payment_type = 'udhaar') AS total_bills,
         (SELECT MAX(created_at) FROM sales WHERE customer_id = c.id AND payment_type = 'udhaar') AS last_purchase_date,
         (SELECT MAX(created_at) FROM payments WHERE customer_id = c.id) AS last_payment_date
       FROM customers c
       WHERE c.shop_id = ?
       ORDER BY c.name ASC`
    ).all(shopId);
    
    res.json({ ok: true, ledger: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /ledger/:customerId - Returns detailed statement history for a customer */
dataRouter.get("/ledger/:customerId", async (req, res) => {
  const shopId = req.shop.id;
  const { customerId } = req.params;
  try {
    const customer = await db.prepare(
      "SELECT * FROM customers WHERE id = ? AND shop_id = ?"
    ).get(customerId, shopId);
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const bills = await db.prepare(
      "SELECT * FROM sales WHERE customer_id = ? AND payment_type = 'udhaar' ORDER BY created_at DESC"
    ).all(customerId);

    const payments = await db.prepare(
      "SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC"
    ).all(customerId);

    // Calculate outstanding dynamically
    const totalBillsAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    customer.outstanding = totalBillsAmount - totalPaidAmount;

    res.json({
      ok: true,
      customer,
      bills,
      payments,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /reminders/history - Returns sent reminder history joined with customer details */
dataRouter.get("/reminders/history", async (req, res) => {
  const shopId = req.shop.id;
  try {
    const rows = await db.prepare(
      `SELECT r.*, c.name AS customer_name, c.phone AS customer_phone
       FROM reminders r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.shop_id = ?
       ORDER BY r.created_at DESC`
    ).all(shopId);
    res.json({ ok: true, history: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /reminders/send - Records a sent reminder log and optionally updates shop UPI */
dataRouter.post("/reminders/send", async (req, res) => {
  const shopId = req.shop.id;
  const { customer_id, message, amount, sent_via, shop_upi_id } = req.body || {};
  if (!customer_id || !message || !(amount >= 0) || !sent_via) {
    return res.status(400).json({ error: "Missing required fields: customer_id, message, amount, sent_via" });
  }

  try {
    if (shop_upi_id) {
      await db.prepare("UPDATE shops SET upi_id = ? WHERE id = ?").run(shop_upi_id.toString().trim(), shopId);
    }

    await db.prepare(
      `INSERT INTO reminders (shop_id, customer_id, message, amount, sent_via)
       VALUES (?, ?, ?, ?, ?)`
    ).run(shopId, customer_id, message, amount, sent_via);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /reminders/send-all - Records batch sent reminder logs and optionally updates shop UPI */
dataRouter.post("/reminders/send-all", async (req, res) => {
  const shopId = req.shop.id;
  const { reminders, shop_upi_id } = req.body || {};
  if (!Array.isArray(reminders)) {
    return res.status(400).json({ error: "reminders must be an array" });
  }

  try {
    if (shop_upi_id) {
      await db.prepare("UPDATE shops SET upi_id = ? WHERE id = ?").run(shop_upi_id.toString().trim(), shopId);
    }

    for (const r of reminders) {
      if (!r.customer_id || !r.message || !(r.amount >= 0) || !r.sent_via) {
        continue;
      }
      await db.prepare(
        `INSERT INTO reminders (shop_id, customer_id, message, amount, sent_via)
         VALUES (?, ?, ?, ?, ?)`
      ).run(shopId, r.customer_id, r.message, r.amount, r.sent_via);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
