import { Router } from "express";
import multer from "multer";
import { db, createOwnerProfile, createShopForOwner, getOwnerShops, getShopById, normalizePhone, updateOwnerProfile } from "../db.js";
import { hashPin, issueToken, requireAuth } from "../auth.js";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

export const authRouter = Router();

const cleanNumber = (n) => normalizePhone(n);

// Multer config for shop logo upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

authRouter.post("/register", async (req, res) => {
  const {
    whatsapp_number,
    name,
    pin,
    lang,
    shop_name,
    owner_name,
    mobile_number,
    email,
    shop_address,
    shop_logo,
    business_category,
    username,
    password,
  } = req.body || {};

  const cleanUsername = username ? String(username).trim() : "";
  const cleanEmail = email ? String(email).trim() : "";
  const cleanPassword = password ? String(password).trim() : "";

  // Basic required fields validation
  if (!whatsapp_number && !mobile_number) {
    return res.status(400).json({ error: "Phone number (WhatsApp or mobile) is required" });
  }

  const number = cleanNumber(whatsapp_number || mobile_number);
  if (!number) {
    return res.status(400).json({ error: "Invalid phone number format" });
  }

  // PIN is optional on registration – default to last 4 digits of mobile if not provided
  const effectivePin = pin || String(number).replace(/\D/g, "").slice(-4) || "0000";
  if (String(effectivePin).length < 4) {
    return res.status(400).json({ error: "PIN must be at least 4 digits" });
  }
  if (!cleanUsername) {
    return res.status(400).json({ error: "Username is required" });
  }
  if (!cleanPassword) {
    return res.status(400).json({ error: "Password is required" });
  }

  // Validate email format if provided
  if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Duplicate checks
  const existingUsername = await db.prepare("SELECT id FROM owner_profiles WHERE username = ?").get(cleanUsername);
  if (existingUsername) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const existingPhone = await db.prepare("SELECT id FROM owner_profiles WHERE whatsapp_number = ?").get(number);
  if (existingPhone && existingPhone.id) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  if (cleanEmail) {
    const existingEmail = await db.prepare("SELECT id FROM owner_profiles WHERE email = ?").get(cleanEmail);
    if (existingEmail && existingEmail.id) {
      return res.status(409).json({ error: "Email already registered" });
    }
  }

  const owner = await createOwnerProfile({
    shop_name: (shop_name || name || "My Shop").trim(),
    owner_name: owner_name ? String(owner_name).trim() : null,
    mobile_number: number,
    email: cleanEmail || null,
    shop_address: shop_address ? String(shop_address).trim() : null,
    shop_logo: shop_logo ? String(shop_logo).trim() : null,
    business_category: business_category ? String(business_category).trim() : null,
    whatsapp_number: number,
    pin: effectivePin,
    lang,
    username: cleanUsername,
    password: cleanPassword,
  });
  const shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(owner.shop_id);
  const updated = await getShopById(shop.id);
  // Get all shops for this owner
  const allShops = await getOwnerShops(owner.id);
  const shopIds = allShops.map(s => s.id);
  return res.json({ token: issueToken(updated, owner.id, shopIds), shop: publicShop(updated) });
});

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = username ? String(username).trim() : "";
  const cleanPassword = password ? String(password).trim() : "";

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const owner = await db.prepare("SELECT * FROM owner_profiles WHERE username = ?").get(cleanUsername);
  if (!owner || !owner.password_hash || !bcrypt.compareSync(String(cleanPassword), owner.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  // Fetch the specific shop associated with this owner ID
  const shop = await db.prepare("SELECT * FROM shops WHERE owner_id = ?").get(owner.id);
  if (!shop) return res.status(401).json({ error: "Shop not found for this user" });
  
  const shopDetails = await getShopById(shop.id);
  // Get all shops for this owner
  const allShops = await getOwnerShops(owner.id);
  const shopIds = allShops.map(s => s.id);
  return res.json({ token: issueToken(shopDetails, owner.id, shopIds), shop: publicShop(shopDetails) });
});

authRouter.post("/google", async (req, res) => {
  const { token, email, name, shop_name, phone_number, shop_address } = req.body || {};

  let googleEmail = email ? String(email).trim() : "";
  let googleName = name ? String(name).trim() : "";

  // If a real token is provided, verify it via Google APIs or Google Client
  if (token && !token.startsWith("mock-")) {
    const clientId = config.google.clientId;
    if (clientId) {
      try {
        const client = new OAuth2Client(clientId);
        // Try verifying as ID token (recommended for gsi client)
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        googleEmail = payload.email;
        googleName = payload.name;
      } catch (err) {
        console.warn("verifyIdToken failed, falling back to access token verification:", err.message);
        try {
          const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
          if (googleRes.ok) {
            const googleUser = await googleRes.json();
            googleEmail = googleUser.email;
            googleName = googleUser.name;
          } else {
            return res.status(401).json({ error: "Invalid Google token (failed both ID and Access Token validation)" });
          }
        } catch {
          return res.status(401).json({ error: "Google token verification failed" });
        }
      }
    } else {
      // Fallback if client ID is not configured (e.g. dev environment fallback)
      try {
        const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
        if (googleRes.ok) {
          const googleUser = await googleRes.json();
          googleEmail = googleUser.email;
          googleName = googleUser.name;
        } else {
          const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
          if (verifyRes.ok) {
            const googleUser = await verifyRes.json();
            googleEmail = googleUser.email;
            googleName = googleUser.name;
          } else {
            return res.status(401).json({ error: "Invalid Google token" });
          }
        }
      } catch (err) {
        console.warn("Token verification fallback failed:", err.message);
        if (!googleEmail) {
          return res.status(401).json({ error: "Google token verification failed" });
        }
      }
    }
  }

  if (!googleEmail) {
    return res.status(400).json({ error: "Google email is required" });
  }

  // 1. Check if owner exists by email or username
  let owner = await db.prepare("SELECT * FROM owner_profiles WHERE email = ?").get(googleEmail);
  if (!owner) {
    owner = await db.prepare("SELECT * FROM owner_profiles WHERE username = ?").get(googleEmail);
  }

  if (owner) {
    // Existing Google User -> Login directly
    const shop = await db.prepare("SELECT * FROM shops WHERE owner_id = ?").get(owner.id);
    if (!shop) {
      const newShop = await createShopForOwner(owner.id, {
        name: owner.shop_name || "My Shop",
        whatsapp_number: owner.whatsapp_number || owner.mobile_number || "0000000000",
      });
      const shopDetails = await getShopById(newShop.id);
      const allShops = await getOwnerShops(owner.id);
      const shopIds = allShops.map(s => s.id);
      return res.json({ token: issueToken(shopDetails, owner.id, shopIds), shop: publicShop(shopDetails) });
    }
    const shopDetails = await getShopById(shop.id);
    const allShops = await getOwnerShops(owner.id);
    const shopIds = allShops.map(s => s.id);
    return res.json({ token: issueToken(shopDetails, owner.id, shopIds), shop: publicShop(shopDetails) });
  }

  // 2. New Google User -> Need extra info (Shop Name, Phone Number, Shop Address)
  const cleanPhone = phone_number ? cleanNumber(phone_number) : "";
  const cleanShopName = shop_name ? String(shop_name).trim() : "";
  const cleanShopAddress = shop_address ? String(shop_address).trim() : "";

  if (!cleanShopName || !cleanPhone || !cleanShopAddress) {
    return res.json({
      requireAdditionalInfo: true,
      googleUser: {
        email: googleEmail,
        name: googleName || "Owner",
      }
    });
  }

  // Check duplicate phone number
  const existingPhone = await db.prepare("SELECT id FROM owner_profiles WHERE whatsapp_number = ?").get(cleanPhone);
  if (existingPhone && existingPhone.id) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  // Create owner profile and shop
  const newOwner = await createOwnerProfile({
    shop_name: cleanShopName,
    owner_name: googleName || "Owner",
    mobile_number: cleanPhone,
    email: googleEmail,
    shop_address: cleanShopAddress,
    whatsapp_number: cleanPhone,
    username: googleEmail, // Set email as username
    password: Math.random().toString(36).slice(-10), // Random placeholder password
    pin: cleanPhone.replace(/\D/g, "").slice(-4) || "0000",
  });

  const shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(newOwner.shop_id);
  const shopDetails = await getShopById(shop.id);
  const allShops = await getOwnerShops(newOwner.id);
  const shopIds = allShops.map(s => s.id);
  return res.json({ token: issueToken(shopDetails, newOwner.id, shopIds), shop: publicShop(shopDetails) });
});

/* Reset PIN. This is a lightweight demo flow: possession of the phone
   number is treated as proof of ownership (a real app would send an OTP to it).
   Sets a new PIN for an already-registered shop and returns a fresh token. */
authRouter.post("/reset-pin", async (req, res) => {
  const { whatsapp_number, pin, mobile_number } = req.body || {};
  const number = cleanNumber(whatsapp_number || mobile_number);
  if (!number || !pin) {
    return res.status(400).json({ error: "Phone number and new PIN are required" });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: "PIN must be at least 4 digits" });
  }
  const owner = number ? await db.prepare("SELECT * FROM owner_profiles WHERE whatsapp_number = ?").get(number) : null;
  if (!owner || !owner.pin_hash) {
    return res.status(404).json({ error: "No shop registered with this number" });
  }
  await db.prepare("UPDATE owner_profiles SET pin_hash = ? WHERE id = ?").run(hashPin(pin), owner.id);
  const shop = await db.prepare("SELECT * FROM shops WHERE owner_id = ? AND whatsapp_number = ?").get(owner.id, number) || await db.prepare("SELECT * FROM shops WHERE whatsapp_number = ?").get(number);
  const updated = shop ? await getShopById(shop.id) : null;
  if (updated) {
    const allShops = await getOwnerShops(owner.id);
    const shopIds = allShops.map(s => s.id);
    return res.json({ token: issueToken(updated, owner.id, shopIds), shop: publicShop(updated) });
  }
  return res.status(404).json({ error: "No shop registered with this number" });
});

function publicShop(shop) {
  return {
    id: shop.id,
    owner_id: shop.owner_id,
    name: shop.name,
    shop_name: shop.shop_name || shop.name,
    owner_name: shop.owner_name || null,
    whatsapp_number: shop.whatsapp_number,
    mobile_number: shop.mobile_number || shop.whatsapp_number || null,
    email: shop.email || null,
    shop_address: shop.shop_address || null,
    shop_logo: shop.shop_logo || null,
    business_category: shop.business_category || null,
    lang_pref: shop.lang_pref,
    address: shop.address || null,
    upi_id: shop.upi_id || null,
    gst_number: shop.gst_number || null,
  };
}

authRouter.get("/profile", requireAuth, async (req, res) => {
  const shop = await getShopById(req.shop.id);
  res.json({ shop: publicShop(shop) });
});

authRouter.get("/shops", requireAuth, async (req, res) => {
  const shops = await getOwnerShops(req.shop.owner_id || req.owner?.id);
  res.json({ shops: shops.map(publicShop) });
});

authRouter.get("/directory", requireAuth, async (req, res) => {
  const currentShopId = req.shop.id;
  const shops = await db.prepare(
    `SELECT s.*, o.shop_name, o.owner_name, o.mobile_number, o.email, o.shop_address, o.shop_logo, o.business_category
     FROM shops s
     LEFT JOIN owner_profiles o ON o.id = s.owner_id
     WHERE s.id != ?
     ORDER BY s.created_at DESC`,
  ).all(currentShopId);
  res.json({ shops: shops.map(publicShop) });
});

authRouter.post("/shops", requireAuth, upload.single("shop_logo"), async (req, res) => {
  const { whatsapp_number, name, pin, lang, address, upi_id, gst_number } = req.body || {};
  const number = cleanNumber(whatsapp_number);
  if (!number) return res.status(400).json({ error: "Phone number is required" });
  
  // Check for duplicate shop (same phone number for this owner)
  const existingShop = await db.prepare("SELECT * FROM shops WHERE whatsapp_number = ? AND owner_id = ?").get(number, req.shop.owner_id || req.owner?.id);
  if (existingShop) {
    return res.status(409).json({ error: "A shop with this phone number already exists" });
  }
  
  const shopLogoFile = req.file;
  const shop = await createShopForOwner(req.shop.owner_id || req.owner?.id, { 
    whatsapp_number: number, 
    name, 
    pin, 
    lang,
    address,
    upi_id,
    gst_number,
    shop_logo: shopLogoFile ? shopLogoFile.buffer : null
  });
  res.json({ shop: publicShop(shop) });
});

authRouter.put("/profile", requireAuth, async (req, res) => {
  const { shop_name, owner_name, mobile_number, email, shop_address, shop_logo, business_category, name, lang } = req.body || {};
  const shopId = req.shop.id;
  const newMobile = cleanNumber(mobile_number || req.shop.mobile_number || req.shop.whatsapp_number);
  const newEmail = email && email.trim();

  // Validation: email format
  if (newEmail && !/^\S+@\S+\.\S+$/.test(newEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validation: unique mobile number
  if (newMobile) {
    const existing = await db.prepare("SELECT id FROM owner_profiles WHERE whatsapp_number = ? AND id != ?").get(newMobile, req.owner.id);
    if (existing) {
      return res.status(409).json({ error: "Mobile number already registered to another account" });
    }
  }

  const payload = {
    shop_name: shop_name || name || req.shop.name,
    owner_name,
    mobile_number: newMobile,
    email: newEmail,
    shop_address,
    shop_logo,
    business_category,
    lang,
  };
  if (!payload.shop_name || payload.shop_name.trim().length === 0) {
    return res.status(400).json({ error: "Shop name cannot be empty" });
  }

  const updated = await updateOwnerProfile(shopId, payload);
  const allShops = await getOwnerShops(req.owner.id);
  const shopIds = allShops.map(s => s.id);
  return res.json({ token: issueToken(updated, req.owner.id, shopIds), shop: publicShop(updated) });
});

// Change password endpoint
authRouter.post("/change-password", requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Old and new passwords are required" });
  }
  const owner = req.owner;
  if (!owner || !owner.password_hash) {
    return res.status(400).json({ error: "Owner profile not found or password not set" });
  }
  // Verify old password
  const bcrypt = (await import('bcryptjs')).default;
  const match = bcrypt.compareSync(String(oldPassword), owner.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Incorrect current password" });
  }
  const newHash = bcrypt.hashSync(String(newPassword), 10);
  await db.prepare("UPDATE owner_profiles SET password_hash = ? WHERE id = ?").run(newHash, owner.id);
  // Return fresh token (in case payload changed)
  const shop = await getShopById(req.shop.id);
  return res.json({ token: issueToken(shop), message: "Password updated" });
});
