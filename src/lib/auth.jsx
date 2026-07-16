import { useState, useEffect } from "react";
import { getToken, setToken, clearToken, setUnauthorizedCallback } from "./api";
import { AuthCtx } from "./auth-context.js";

const SHOP_KEY = "dukaan_shop";

function loadShop() {
  try {
    const s = sessionStorage.getItem(SHOP_KEY) || localStorage.getItem(SHOP_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [shop, setShop] = useState(loadShop);

  useEffect(() => {
    setUnauthorizedCallback(() => {
      logout();
    });
    return () => setUnauthorizedCallback(null);
  }, []);

  const login = (token, shopData, { persist = true } = {}) => {
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
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(SHOP_KEY);
    sessionStorage.removeItem(SHOP_KEY);
    setShop(null);
  };

  // isAuthed is derived purely from storage so it is always in sync
  const isAuthed = Boolean(getToken() && shop);

  return (
    <AuthCtx.Provider value={{ shop, isAuthed, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
