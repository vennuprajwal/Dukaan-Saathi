import { Router } from "express";
import { db, getOrCreateShop } from "../db.js";
import { hashPin, verifyPin, issueToken, requireAuth } from "../auth.js";

export const authRouter = Router();

const cleanNumber = (n) => (n || "").toString().replace(/[^\d+]/g, "");

/* Register (or claim) a shop: set its name + PIN for dashboard login.
   The phone number is the identity — one shop per number. */
authRouter.post("/register", async (req, res) => {
  const { whatsapp_number, name, pin, lang } = req.body || {};
  const number = cleanNumber(whatsapp_number);
  if (!number || !pin) {
    return res.status(400).json({ error: "Phone number and PIN are required" });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: "PIN must be at least 4 digits" });
  }

  const shop = await getOrCreateShop(number, name || "My Shop");
  if (shop.pin_hash) {
    return res
      .status(409)
      .json({ error: "This number is already registered. Please log in." });
  }

  await db.prepare("UPDATE shops SET name = ?, pin_hash = ?, lang_pref = ? WHERE id = ?").run(
    name || shop.name,
    hashPin(pin),
    lang || "en",
    shop.id,
  );
  const updated = await db.prepare("SELECT * FROM shops WHERE id = ?").get(shop.id);
  return res.json({ token: issueToken(updated), shop: publicShop(updated) });
});

authRouter.post("/login", async (req, res) => {
  const { whatsapp_number, pin } = req.body || {};
  const number = cleanNumber(whatsapp_number);
  const shop = await db
    .prepare("SELECT * FROM shops WHERE whatsapp_number = ?")
    .get(number);
  if (!shop || !shop.pin_hash || !verifyPin(pin, shop.pin_hash)) {
    return res.status(401).json({ error: "Wrong number or PIN" });
  }
  return res.json({ token: issueToken(shop), shop: publicShop(shop) });
});

/* Reset PIN. This is a lightweight demo flow: possession of the phone
   number is treated as proof of ownership (a real app would send an OTP to it).
   Sets a new PIN for an already-registered shop and returns a fresh token. */
authRouter.post("/reset-pin", async (req, res) => {
  const { whatsapp_number, pin } = req.body || {};
  const number = cleanNumber(whatsapp_number);
  if (!number || !pin) {
    return res.status(400).json({ error: "Phone number and new PIN are required" });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: "PIN must be at least 4 digits" });
  }
  const shop = await db
    .prepare("SELECT * FROM shops WHERE whatsapp_number = ?")
    .get(number);
  if (!shop || !shop.pin_hash) {
    return res.status(404).json({ error: "No shop registered with this number" });
  }
  await db.prepare("UPDATE shops SET pin_hash = ? WHERE id = ?").run(hashPin(pin), shop.id);
  const updated = await db.prepare("SELECT * FROM shops WHERE id = ?").get(shop.id);
  return res.json({ token: issueToken(updated), shop: publicShop(updated) });
});

function publicShop(shop) {
  return {
    id: shop.id,
    name: shop.name,
    whatsapp_number: shop.whatsapp_number,
    lang_pref: shop.lang_pref,
  };
}

authRouter.put("/profile", requireAuth, async (req, res) => {
  const { name, lang } = req.body || {};
  const shopId = req.shop.id;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: "Shop name cannot be empty" });
  }

  await db.prepare("UPDATE shops SET name = ?, lang_pref = ? WHERE id = ?").run(
    name.trim(),
    lang || "en",
    shopId
  );
  
  const updated = await db.prepare("SELECT * FROM shops WHERE id = ?").get(shopId);
  return res.json({ token: issueToken(updated), shop: publicShop(updated) });
});
