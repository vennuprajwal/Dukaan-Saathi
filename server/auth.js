import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { getOwnerProfileByShopId, getShopById, getOwnerShops } from "./db.js";

export const hashPin = (pin) => bcrypt.hashSync(String(pin), 10);
export const verifyPin = (pin, hash) => (hash ? bcrypt.compareSync(String(pin), hash) : false);

export function issueToken(shop, ownerId = null, shopIds = []) {
  const payload = {
    shopId: shop.id,
    ownerId: ownerId || shop.owner_id || null,
    shopIds: shopIds.length > 0 ? shopIds : [shop.id],
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

/* Validate that a shop belongs to an owner */
export async function validateShopAccess(shopId, ownerId) {
  if (!ownerId) return false;
  const shops = await getOwnerShops(ownerId);
  return shops.some((s) => s.id === shopId);
}

/* Express middleware — attaches req.shop, req.owner, req.vendorId, req.activeShopId for protected routes. */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const { shopId, ownerId, shopIds } = jwt.verify(token, config.jwtSecret);
    
    // Allow shop switching via header (for multi-shop support)
    const requestedShopId = req.headers["x-shop-id"] ? Number(req.headers["x-shop-id"]) : null;
    let targetShopId = shopId;
    
    if (requestedShopId && ownerId) {
      // Validate the requested shop belongs to this owner
      const hasAccess = await validateShopAccess(requestedShopId, ownerId);
      if (hasAccess) {
        targetShopId = requestedShopId;
      }
    }
    
    const shop = await getShopById(targetShopId);
    if (!shop) return res.status(401).json({ error: "Shop not found" });
    
    const owner = await getOwnerProfileByShopId(shop.id);
    req.shop = shop;
    req.owner = owner;
    req.vendorId = ownerId;
    req.activeShopId = targetShopId;
    req.shopIds = shopIds || [shop.id];
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
