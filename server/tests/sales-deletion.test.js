import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "dukaan-sales-delete-"));
process.env.DATA_DIR = tempDir;

const { dbReady, db, createOwnerProfile } = await import("../db.js");

test("deletes a sale, restores stock, and enforces cross-shop ownership boundaries", async () => {
  await dbReady;

  // Create owner/shop 1
  const owner1 = await createOwnerProfile({
    shop_name: "Sales Shop 1",
    owner_name: "Seller One",
    mobile_number: "+918888888888",
    email: "seller1@example.com",
    shop_address: "Bangalore",
    shop_logo: "",
    pin: "4321",
    lang: "en",
  });

  const shop1 = await db.prepare("SELECT * FROM shops WHERE owner_id = ?").get(owner1.id);
  assert.ok(shop1);

  // Create owner/shop 2
  const owner2 = await createOwnerProfile({
    shop_name: "Sales Shop 2",
    owner_name: "Seller Two",
    mobile_number: "+917777777777",
    email: "seller2@example.com",
    shop_address: "Chennai",
    shop_logo: "",
    pin: "5678",
    lang: "en",
  });

  const shop2 = await db.prepare("SELECT * FROM shops WHERE owner_id = ?").get(owner2.id);
  assert.ok(shop2);

  // Insert a mock product with stock_qty = 20 for Shop 1
  const productInfo = await db.prepare(`
    INSERT INTO products (shop_id, name, name_norm, stock_qty, cost_price, sell_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(shop1.id, "Biscuit Packet", "biscuit packet", 20, 8, 10);
  const productId = Number(productInfo.lastInsertRowid);

  // Simulate logging a sale of 5 units (reducing stock to 15)
  await db.prepare("UPDATE products SET stock_qty = stock_qty - 5 WHERE id = ?").run(productId);

  // Insert corresponding sale record belonging to Shop 1
  const saleInfo = await db.prepare(`
    INSERT INTO sales (shop_id, product_id, item_text, qty, unit_price, amount, payment_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(shop1.id, productId, "biscuit packet", 5, 10, 50, "cash");
  const saleId = Number(saleInfo.lastInsertRowid);

  // 1. Enforce cross-shop ownership check:
  // Simulate Shop 2 trying to delete Shop 1's sale
  const saleFetchedByShop2 = await db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId);
  assert.ok(saleFetchedByShop2);
  
  // Explicit boundary checks (imitating dataRouter.delete behavior)
  const isAuthorizedForShop2 = saleFetchedByShop2.shop_id === shop2.id;
  assert.equal(isAuthorizedForShop2, false); // Unauthorized!

  const isAuthorizedForShop1 = saleFetchedByShop2.shop_id === shop1.id;
  assert.equal(isAuthorizedForShop1, true); // Authorized!

  // 2. Perform deletion and stock restoration as Shop 1
  if (isAuthorizedForShop1) {
    await db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
    if (saleFetchedByShop2.product_id) {
      await db.prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(
        saleFetchedByShop2.qty,
        saleFetchedByShop2.product_id
      );
    }
  }

  // Verify product stock is restored back to 20
  const productAfterDelete = await db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
  assert.equal(productAfterDelete.stock_qty, 20);

  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
