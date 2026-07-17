import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, ArrowLeft, Store, Sparkles, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context.js";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useToast } from "../components/Toast";
import { motion } from "motion/react";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [googleAuthData, setGoogleAuthData] = useState(null);
  const [googleShopName, setGoogleShopName] = useState("");
  const [googlePhone, setGooglePhone] = useState("");
  const [googleAddress, setGoogleAddress] = useState("");

  const [showMockGoogle, setShowMockGoogle] = useState(false);
  const [mockEmail, setMockEmail] = useState("google.tester@example.com");
  const [mockName, setMockName] = useState("Google Tester");

  const [shopName, setShopName] = useState("");

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && !window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleGoogleSignIn = () => {
    setError("");
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId) {
      if (!window.google) {
        setError("Google authentication client is not loaded. Please try again in a moment.");
        return;
      }
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              await processGoogleAuth({ token: tokenResponse.access_token });
            }
          },
        });
        client.requestAccessToken();
      } catch (err) {
        setError("Failed to initialize Google Sign-in: " + err.message);
      }
    } else {
      setShowMockGoogle(true);
    }
  };

  const processGoogleAuth = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const res = await api.googleLogin(payload);
      if (res.requireAdditionalInfo) {
        setGoogleAuthData({
          token: payload.token || "mock-token",
          email: res.googleUser.email,
          name: res.googleUser.name,
        });
      } else {
        // Fetch all shops for this owner
        let shops = [res.shop];
        try {
          const shopsRes = await api.listShops();
          if (shopsRes.shops && shopsRes.shops.length > 0) {
            shops = shopsRes.shops;
          }
        } catch (e) {
          console.warn("Failed to fetch shops:", e);
        }
        
        login(res.token, res.shop, { persist: rememberMe, shops });
        toast.success(t("auth.login_success", "Welcome back!"));
        navigate("/app");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMockGoogleSubmit = async (e) => {
    e.preventDefault();
    setShowMockGoogle(false);
    await processGoogleAuth({
      token: "mock-token-" + Date.now(),
      email: mockEmail.trim(),
      name: mockName.trim(),
    });
  };

  const handleCompleteGoogleSetup = async (e) => {
    e.preventDefault();
    if (!googleShopName.trim() || !googlePhone.trim() || !googleAddress.trim()) {
      setError("All setup fields are required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.googleLogin({
        token: googleAuthData.token,
        email: googleAuthData.email,
        name: googleAuthData.name,
        shop_name: googleShopName.trim(),
        phone_number: googlePhone.trim(),
        shop_address: googleAddress.trim(),
      });
      
      // Fetch all shops for this owner
      let shops = [res.shop];
      try {
        const shopsRes = await api.listShops();
        if (shopsRes.shops && shopsRes.shops.length > 0) {
          shops = shopsRes.shops;
        }
      } catch (e) {
        console.warn("Failed to fetch shops:", e);
      }
      
      login(res.token, res.shop, { persist: rememberMe, shops });
      toast.success(t("auth.login_success", "Welcome back!"));
      navigate("/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError(t("common.required_fields", "All fields are required"));
      return;
    }
    setBusy(true);
    try {
      console.log("[LOGIN] Sending:", { username: username.trim(), password });
      const res = await api.login({ username: username.trim(), password });
      console.log("[LOGIN] Success:", res);
      
      // Fetch all shops for this owner
      let shops = [res.shop];
      try {
        const shopsRes = await api.listShops();
        if (shopsRes.shops && shopsRes.shops.length > 0) {
          shops = shopsRes.shops;
        }
      } catch (e) {
        console.warn("Failed to fetch shops:", e);
      }
      
      login(res.token, res.shop, { persist: rememberMe, shops });
      toast.success(t("auth.login_success", "Welcome back!"));
      navigate("/app");
    } catch (err) {
      console.error("[LOGIN] Error:", err.message);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startDemo = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.startDemo();
      let shops = [res.shop];
      try {
        const shopsRes = await api.listShops();
        if (shopsRes.shops && shopsRes.shops.length > 0) {
          shops = shopsRes.shops;
        }
      } catch (e) {
        console.warn("Failed to fetch shops:", e);
      }
      login(res.token, res.shop, { persist: rememberMe, shops });
      toast.success(t("auth.login_success", "Welcome to demo!"));
      navigate("/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startCustom = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setError("Shop name is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.createShop({ shop_name: shopName.trim() });
      let shops = [res.shop];
      try {
        const shopsRes = await api.listShops();
        if (shopsRes.shops && shopsRes.shops.length > 0) {
          shops = shopsRes.shops;
        }
      } catch (e) {
        console.warn("Failed to fetch shops:", e);
      }
      login(res.token, res.shop, { persist: rememberMe, shops });
      toast.success(t("auth.login_success", "Welcome!"));
      navigate("/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-10 font-body text-ink">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-shopfront transition-colors">
            <ArrowLeft className="h-4 w-4" /> {t("common.backHome", "Back Home")}
          </Link>
          <LanguageSwitcher />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-white dark:bg-shopfront p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/5 sm:p-10"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-leaf/10 text-leaf mb-4 ring-1 ring-leaf/20">
              <Store className="h-8 w-8" />
            </span>
            <h1 className="font-display text-2xl font-bold text-shopfront tracking-tight">
              Get Started
            </h1>
            <p className="mt-2 text-sm text-ink/60">
              Experience the AI Business Partner for your Kirana store instantly. No signup required.
            </p>
          </div>

          <button
            onClick={startDemo}
            disabled={busy}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-shopfront px-6 py-3.5 font-sans text-sm font-semibold text-paper shadow-md transition-all hover:bg-shopfront-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-marigold" />
            <span>🚀 Explore Demo</span>
            <div className="absolute inset-0 -translate-x-full bg-white dark:bg-shopfront/20 transition-transform duration-500 group-hover:translate-x-full" />
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-black/5"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-ink/40 uppercase">or</span>
            <div className="flex-grow border-t border-black/5"></div>
          </div>

          <form onSubmit={startCustom} className="relative">
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter your Shop Name"
              disabled={busy}
              className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 pr-12 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !shopName.trim()}
              className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-leaf text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="text-center text-sm pt-2">
            {t("auth.no_account", "Don't have an account?")} <Link to="/register" className="font-medium text-leaf hover:underline">
              {t("auth.register_link", "Register")}
            </Link>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
