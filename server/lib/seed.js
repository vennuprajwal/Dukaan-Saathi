import { db, normalize } from "../db.js";

/* Demo data seeding. Populates a shop with believable kirana-store activity
   across the last several days so a first-time visitor sees a live-looking
   dashboard immediately. Idempotent per call: it first wipes the shop's data
   (see clearShopData) so repeated "Load demo data" clicks don't stack up. */

const PRODUCTS = [
  // name, unit, cost, sell, opening stock
  { name: "rice", unit: "kg", cost: 40, sell: 52, stock: 60 },
  { name: "sugar", unit: "kg", cost: 38, sell: 45, stock: 3 }, // low stock
  { name: "wheat flour", unit: "kg", cost: 32, sell: 42, stock: 45 },
  { name: "cooking oil", unit: "l", cost: 110, sell: 135, stock: 18 },
  { name: "toor dal", unit: "kg", cost: 95, sell: 120, stock: 22 },
  { name: "tea", unit: "packet", cost: 45, sell: 60, stock: 4 }, // low stock
  { name: "milk", unit: "l", cost: 48, sell: 56, stock: 30 },
  { name: "salt", unit: "kg", cost: 18, sell: 24, stock: 40 },
  { name: "biscuits", unit: "packet", cost: 20, sell: 30, stock: 50 },
  { name: "soap", unit: "piece", cost: 22, sell: 32, stock: 35 },
];

const CUSTOMERS = ["Ramesh", "Sunita", "Imran", "Lakshmi"];

/* A small deterministic PRNG so seeding is repeatable without Math.random
   (which is unavailable in some sandboxes and makes tests flaky). */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* Delete all of a shop's transactional data (keeps the shop + login). */
export async function clearShopData(shopId) {
  await db.batch([
    { sql: "DELETE FROM sales WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM payments WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM expenses WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM customers WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM products WHERE shop_id = ?", args: [shopId] },
  ]);
}

export async function seedDemoData(shopId) {
  await clearShopData(shopId);
  const rng = makeRng(shopId + 7);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // 1. Products (build a name -> row map for later sales).
  const products = {};
  for (const p of PRODUCTS) {
    const info = await db
      .prepare(
        `INSERT INTO products (shop_id, name, name_norm, unit, stock_qty, cost_price, sell_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(shopId, p.name, normalize(p.name), p.unit, p.stock, p.cost, p.sell);
    products[p.name] = { id: info.lastInsertRowid, ...p };
  }

  // 2. Customers.
  const customers = {};
  for (const name of CUSTOMERS) {
    const info = await db
      .prepare("INSERT INTO customers (shop_id, name, name_norm) VALUES (?, ?, ?)")
      .run(shopId, name, normalize(name));
    customers[name] = info.lastInsertRowid;
  }

  const names = Object.keys(products);
  const stmts = [];

  // 3. Sales spread across the last 6 days (more today so "today" looks busy).
  // created_at is written explicitly so the trend chart and history populate.
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const count = daysAgo === 0 ? 9 : 3 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) {
      const prod = products[pick(names)];
      const qty = 1 + Math.floor(rng() * 5);
      const amount = qty * prod.sell;
      const cost = qty * prod.cost;
      // ~1 in 4 sales on udhaar (credit) to a random customer.
      const onCredit = rng() < 0.25;
      const cust = onCredit ? customers[pick(CUSTOMERS)] : null;
      const hour = 8 + Math.floor(rng() * 11); // 8am–7pm
      const min = Math.floor(rng() * 60);
      // Anchor to that day's midnight (local) + hours, so "today's" sales never
      // spill into tomorrow and drop out of the date('now')='today' queries.
      const ts = `datetime(date('now','localtime','-${daysAgo} days'),'+${hour} hours','+${min} minutes')`;
      stmts.push({
        sql: `INSERT INTO sales
                (shop_id, product_id, item_text, qty, unit_price, amount, cost_amount, payment_type, customer_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${ts})`,
        args: [shopId, prod.id, prod.name, qty, prod.sell, amount, cost, onCredit ? "udhaar" : "cash", cust],
      });
    }
  }

  // 4. A few partial repayments so dues are non-trivial but not zero.
  stmts.push({
    sql: `INSERT INTO payments (shop_id, customer_id, amount, created_at)
          VALUES (?, ?, ?, datetime('now','localtime','-1 days'))`,
    args: [shopId, customers["Ramesh"], 100],
  });
  stmts.push({
    sql: `INSERT INTO payments (shop_id, customer_id, amount, created_at)
          VALUES (?, ?, ?, datetime('now','localtime'))`,
    args: [shopId, customers["Sunita"], 50],
  });

  // 5. Everyday expenses across the week + today.
  const expenses = [
    ["rent", "Monthly shop rent", 5000, 5],
    ["electricity", "Bijli bill", 820, 3],
    ["transport", "Tempo delivery charge", 300, 2],
    ["tea", "Chai for the shop", 40, 0],
    ["packaging", "Carry bags", 150, 1],
  ];
  for (const [category, note, amount, daysAgo] of expenses) {
    stmts.push({
      sql: `INSERT INTO expenses (shop_id, category, note, amount, created_at)
            VALUES (?, ?, ?, ?, datetime('now','localtime','-${daysAgo} days'))`,
      args: [shopId, category, note, amount],
    });
  }

  // Run it all in one atomic batch.
  await db.batch(stmts);

  return {
    products: PRODUCTS.length,
    customers: CUSTOMERS.length,
    sales: stmts.filter((s) => s.sql.includes("INTO sales")).length,
    expenses: expenses.length,
  };
}
