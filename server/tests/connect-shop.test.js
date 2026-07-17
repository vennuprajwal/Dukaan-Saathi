import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "dukaan-connect-shop-"));
process.env.DATA_DIR = tempDir;

const { dbReady, db, createOwnerProfile } = await import("../db.js");
const { sendConnectionRequest, respondToConnectionRequest, createBusinessTransaction } = await import("../lib/connections.js");
const { getNotificationsForShop, clearNotificationHistory } = await import("../lib/notifications.js");

test("manages business connections cleanly, enforcing duplication and self-connection boundaries", async () => {
  await dbReady;

  // Clear connection tables and notification history to ensure test isolation
  await db.prepare("DELETE FROM business_connections").run();
  await db.prepare("DELETE FROM connected_shops").run();
  await db.prepare("DELETE FROM notifications").run();
  clearNotificationHistory();

  // Create owner/shop A
  const ownerA = await createOwnerProfile({
    shop_name: "Shop A",
    owner_name: "Owner A",
    mobile_number: "+919999900010",
    email: "a@example.com",
    shop_address: "Address A",
    shop_logo: "",
    pin: "1111",
    lang: "en",
  });
  const shopA = await db.prepare("SELECT * FROM shops WHERE owner_id = ?").get(ownerA.id);

  // Create owner/shop B
  const ownerB = await createOwnerProfile({
    shop_name: "Shop B",
    owner_name: "Owner B",
    mobile_number: "+919999900020",
    email: "b@example.com",
    shop_address: "Address B",
    shop_logo: "",
    pin: "2222",
    lang: "en",
  });
  const shopB = await db.prepare("SELECT * FROM shops WHERE owner_id = ?").get(ownerB.id);

  assert.ok(shopA);
  assert.ok(shopB);

  // Test 1: Prevent user from connecting to themselves
  await assert.rejects(
    async () => {
      await sendConnectionRequest(shopA.id, shopA.id);
    },
    /You cannot connect a shop to itself/
  );

  // Test 2: Successful connection request (stores in DB as pending, doesn't auto-connect)
  const req1 = await sendConnectionRequest(shopA.id, shopB.id);
  assert.ok(req1);
  assert.equal(req1.sender_shop_id, shopA.id);
  assert.equal(req1.recipient_shop_id, shopB.id);
  assert.equal(req1.status, "pending");

  // Verify it exists in database
  const inDb = await db.prepare("SELECT * FROM business_connections WHERE id = ?").get(req1.id);
  assert.ok(inDb);
  assert.equal(inDb.status, "pending");

  // Verify that Shop B received a notification with connection request ID
  const notificationsShopB = getNotificationsForShop(shopB.id);
  assert.equal(notificationsShopB.length, 1);
  assert.equal(notificationsShopB[0].title, "New Shop Connection Request");
  assert.equal(notificationsShopB[0].message, "Shop A wants to connect with your shop.");
  assert.equal(notificationsShopB[0].category, "connections");
  assert.equal(notificationsShopB[0].requestId, req1.id);

  // Verify that the shops are NOT automatically connected
  const a = Math.min(shopA.id, shopB.id);
  const b = Math.max(shopA.id, shopB.id);
  const connected = await db.prepare("SELECT * FROM connected_shops WHERE shop_a_id = ? AND shop_b_id = ?").get(a, b);
  assert.equal(connected, undefined);

  // Test 3: Prevent duplicate requests
  await assert.rejects(
    async () => {
      await sendConnectionRequest(shopA.id, shopB.id);
    },
    /A pending connection request already exists/
  );

  // Test 4: Reject connection request
  const rejectRes = await respondToConnectionRequest(req1.id, shopB.id, "reject");
  assert.ok(rejectRes);
  assert.equal(rejectRes.status, "rejected");

  // Verify request is deleted from database
  const inDbDeleted = await db.prepare("SELECT * FROM business_connections WHERE id = ?").get(req1.id);
  assert.equal(inDbDeleted, undefined);

  // Verify Shop A received a rejection notification
  const notificationsShopAReject = getNotificationsForShop(shopA.id);
  const rejectNotif = notificationsShopAReject.find(n => n.title === "Connection Request Rejected");
  assert.ok(rejectNotif);
  assert.equal(rejectNotif.message, "Shop B rejected your connection request.");

  // Test 5: Accept connection request (create a new one first, then accept)
  const req2 = await sendConnectionRequest(shopA.id, shopB.id);
  assert.ok(req2);

  const acceptRes = await respondToConnectionRequest(req2.id, shopB.id, "accept");
  assert.ok(acceptRes);
  assert.equal(acceptRes.status, "accepted");

  // Verify they are now connected in database
  const connectedRow = await db.prepare("SELECT * FROM connected_shops WHERE shop_a_id = ? AND shop_b_id = ?").get(a, b);
  assert.ok(connectedRow);

  // Verify Shop A received an acceptance notification
  const notificationsShopAAccept = getNotificationsForShop(shopA.id);
  const acceptNotif = notificationsShopAAccept.find(n => n.title === "Connection Request Accepted");
  assert.ok(acceptNotif);
  assert.equal(acceptNotif.message, "Shop B accepted your connection request.");

  // Test 6: Verify B2B transaction fails before connection
  await assert.rejects(
    async () => {
      // Create a temporary unconnected shop
      await createBusinessTransaction(shopA.id, 9999, { amount: 100 });
    },
    /Please connect with this shop before starting business/
  );

  // Test 7: Verify B2B transaction succeeds after connection
  const txn = await createBusinessTransaction(shopA.id, shopB.id, { amount: 200, note: "Test B2B transaction" });
  assert.ok(txn);
  assert.equal(txn.amount, 200);

  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
