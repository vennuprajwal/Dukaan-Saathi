import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "dukaan-owner-"));
process.env.DATA_DIR = tempDir;

const { dbReady, db, createOwnerProfile } = await import("../db.js");

test("creates an owner profile and links it to a shop", async () => {
  await dbReady;

  const owner = await createOwnerProfile({
    shop_name: "Test Shop",
    owner_name: "Asha Rao",
    mobile_number: "+919999999999",
    email: "asha@example.com",
    shop_address: "Hyderabad",
    shop_logo: "https://example.com/logo.png",
    pin: "1234",
    lang: "en",
  });

  assert.equal(owner.shop_name, "Test Shop");
  assert.equal(owner.email, "asha@example.com");

  const shop = await db.prepare("SELECT * FROM shops WHERE owner_id = ?").get(owner.id);
  assert.ok(shop);
  assert.equal(shop.owner_id, owner.id);

  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors on Windows temp folders
  }
});
