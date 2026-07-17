import { useState, useEffect } from "react";
import { getToken, setToken, clearToken, setUnauthorizedCallback } from "./api";
import { AuthCtx } from "./auth-context.js";

const SHOP_KEY = "dukaan_shop";
const SHOPS_KEY = "dukaan_shops";
const ACTIVE_SHOP_KEY = "dukaan_active_shop";

function loadShop() {
  try {
    const s = sessionStorage.getItem(SHOP_KEY) || localStorage.getItem(SHOP_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function loadShops() {
  try {
    const s = sessionStorage.getItem(SHOPS_KEY) || localStorage.getItem(SHOPS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function loadActiveShopId() {
  try {
    const s = sessionStorage.getItem(ACTIVE_SHOP_KEY) || localStorage.getItem(ACTIVE_SHOP_KEY);
    return s ? Number(s) : null;
  } catch {
    return null;
  }
}

function saveShops(shops, persist = true) {
  if (persist) {
    localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
    sessionStorage.removeItem(SHOPS_KEY);
  } else {
    sessionStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
    localStorage.removeItem(SHOPS_KEY);
  }
}

function saveActiveShopId(shopId, persist = true) {
  if (persist) {
    localStorage.setItem(ACTIVE_SHOP_KEY, String(shopId));
    sessionStorage.removeItem(ACTIVE_SHOP_KEY);
  } else {
    sessionStorage.setItem(ACTIVE_SHOP_KEY, String(shopId));
    localStorage.removeItem(ACTIVE_SHOP_KEY);
  }
}

export function AuthProvider({ children }) {
  const [shop, setShop] = useState(loadShop);
  const [shops, setShops] = useState(loadShops);
  const [activeShopId, setActiveShopId] = useState(loadActiveShopId);

  useEffect(() => {
    setUnauthorizedCallback(() => {
      logout();
    });
    return () => setUnauthorizedCallback(null);
  }, []);

  const login = (token, shopData, { persist = true, shops = [] } = {}) => {
    // Write token to storage FIRST so getToken() is truthy before React re-renders
    setToken(token, persist);
    if (persist) {
      localStorage.setItem(SHOP_KEY, JSON.stringify(shopData));
      sessionStorage.removeItem(SHOP_KEY);
    } else {
      sessionStorage.setItem(SHOP_KEY, JSON.stringify(shopData));
      localStorage.removeItem(SHOP_KEY);
    }
    // Then update React state — isAuthed will be true on the very next render
    setShop(shopData);
    
    // Initialize shops array if provided
    if (shops.length > 0) {
      setShops(shops);
      saveShops(shops, persist);
      setActiveShopId(shopData.id);
      saveActiveShopId(shopData.id, persist);
    } else if (shops.length === 0) {
      // Initialize shops array with current shop if empty
      setShops([shopData]);
      saveShops([shopData], persist);
      setActiveShopId(shopData.id);
      saveActiveShopId(shopData.id, persist);
    }
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(SHOP_KEY);
    sessionStorage.removeItem(SHOP_KEY);
    localStorage.removeItem(SHOPS_KEY);
    sessionStorage.removeItem(SHOPS_KEY);
    localStorage.removeItem(ACTIVE_SHOP_KEY);
    sessionStorage.removeItem(ACTIVE_SHOP_KEY);
    setShop(null);
    setShops([]);
    setActiveShopId(null);
  };

  const switchShop = (shopId) => {
    const targetShop = shops.find(s => s.id === shopId);
    if (targetShop) {
      setShop(targetShop);
      setActiveShopId(shopId);
      saveActiveShopId(shopId, true);
      // Update the main shop key for backward compatibility
      if (targetShop) {
        localStorage.setItem(SHOP_KEY, JSON.stringify(targetShop));
        sessionStorage.removeItem(SHOP_KEY);
      }
    }
  };

  const addShop = (shopData, { persist = true } = {}) => {
    const exists = shops.some(s => s.id === shopData.id);
    if (!exists) {
      const newShops = [...shops, shopData];
      setShops(newShops);
      saveShops(newShops, persist);
    }
  };

  const updateShop = (shopId, updates) => {
    const newShops = shops.map(s => s.id === shopId ? { ...s, ...updates } : s);
    setShops(newShops);
    saveShops(newShops, true);
    if (shopId === activeShopId) {
      const updated = newShops.find(s => s.id === shopId);
      if (updated) {
        setShop(updated);
        localStorage.setItem(SHOP_KEY, JSON.stringify(updated));
        sessionStorage.removeItem(SHOP_KEY);
      }
    }
  };

  // isAuthed is derived purely from storage so it is always in sync
  const isAuthed = Boolean(getToken() && shop);

  return (
    <AuthCtx.Provider value={{ 
      shop, 
      shops, 
      activeShopId,
      isAuthed, 
      login, 
      logout,
      switchShop,
      addShop,
      updateShop
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
