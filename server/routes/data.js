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
} from "../lib/queries.js";
import { executeIntent } from "../lib/intents.js";
import { seedDemoData, clearShopData } from "../lib/seed.js";
import { db } from "../db.js";

export const dataRouter = Router();
dataRouter.use(requireAuth);

/* Everything the dashboard needs in one call. */
dataRouter.get("/dashboard", async (req, res) => {
  const shopId = req.shop.id;
  const [summary, sales, inv, duesData, productsSold, itemProfit, bestSeller, expenses, trend] =
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
    ]);
  res.json({
    shop: {
      id: req.shop.id,
      name: req.shop.name,
      whatsapp_number: req.shop.whatsapp_number,
      lang_pref: req.shop.lang_pref,
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
  const { customer_id, amount } = req.body || {};
  if (!customer_id || !(amount > 0)) {
    return res.status(400).json({ error: "customer_id and positive amount required" });
  }
  const customer = await db
    .prepare("SELECT * FROM customers WHERE id = ? AND shop_id = ?")
    .get(customer_id, req.shop.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  await db.prepare(
    "INSERT INTO payments (shop_id, customer_id, amount) VALUES (?, ?, ?)",
  ).run(req.shop.id, customer_id, amount);
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
  const { item, qty, amount, unit, payment_type, party_name } = req.body || {};
  if (!item || !(amount > 0)) {
    return res.status(400).json({ error: "item and positive amount required" });
  }
  const pay = payment_type === "udhaar" ? "udhaar" : "cash";
  if (pay === "udhaar" && !(party_name || "").trim()) {
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
