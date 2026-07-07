import { useEffect, useState } from "react";
import { getToken, setToken, clearToken } from "./api";
import { AuthCtx } from "./auth-context.js";

const SHOP_KEY = "dukaan_shop";

export function AuthProvider({ children }) {
  const [shop, setShop] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SHOP_KEY) || "null");
    } catch {
      return null;
    }
  });

  const login = (token, shopData, { persist = true } = {}) => {
    setToken(token, persist);
    localStorage.setItem(SHOP_KEY, JSON.stringify(shopData));
    setShop(shopData);
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(SHOP_KEY);
    setShop(null);
  };

  // if the token vanished (e.g. cleared elsewhere), drop the shop too
  useEffect(() => {
    if (shop && !getToken()) setShop(null);
  }, [shop]);

  return (
    <AuthCtx.Provider value={{ shop, isAuthed: Boolean(shop && getToken()), login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
