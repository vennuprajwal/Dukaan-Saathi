import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
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
          {googleAuthData ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold text-shopfront">
                  {t("auth.complete_setup", "Complete Setup")}
                </h1>
                <p className="mt-2 text-sm text-ink/60">
                  {t("auth.google_setup_desc", "Tell us a bit about your shop")}
                </p>
              </div>
              <form onSubmit={handleCompleteGoogleSetup} className="space-y-4">
                <input
                  value={googleShopName}
                  onChange={(e) => setGoogleShopName(e.target.value)}
                  placeholder={t("auth.shop_name", "Shop Name")}
                  disabled={busy}
                  className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                />
                <input
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                  placeholder={t("auth.phone_number", "Phone Number")}
                  disabled={busy}
                  className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                />
                <input
                  value={googleAddress}
                  onChange={(e) => setGoogleAddress(e.target.value)}
                  placeholder={t("auth.shop_address", "Shop Address")}
                  disabled={busy}
                  className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-shopfront px-6 py-3.5 text-sm font-semibold text-paper shadow-md transition-all hover:bg-shopfront-700 disabled:opacity-50"
                >
                  {busy ? t("common.loading", "Loading...") : t("auth.continue", "Continue")}
                </button>
              </form>
            </>
          ) : showMockGoogle ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold text-shopfront">
                  {t("auth.mock_google", "Mock Google Sign-In")}
                </h1>
              </div>
              <form onSubmit={handleMockGoogleSubmit} className="space-y-4">
                <input
                  value={mockEmail}
                  onChange={(e) => setMockEmail(e.target.value)}
                  placeholder={t("auth.email", "Email")}
                  disabled={busy}
                  className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                />
                <input
                  value={mockName}
                  onChange={(e) => setMockName(e.target.value)}
                  placeholder={t("auth.name", "Name")}
                  disabled={busy}
                  className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-shopfront px-6 py-3.5 text-sm font-semibold text-paper shadow-md transition-all hover:bg-shopfront-700 disabled:opacity-50"
                >
                  {busy ? t("common.loading", "Loading...") : t("auth.continue", "Continue")}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 flex flex-col items-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-leaf/10 text-leaf mb-4 ring-1 ring-leaf/20">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </span>
                <h1 className="font-display text-2xl font-bold text-shopfront tracking-tight">
                  {t("auth.welcome_back", "Welcome Back")}
                </h1>
                <p className="mt-2 text-sm text-ink/60">
                  {t("auth.login_subtitle", "Sign in to your shop account")}
                </p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-black/10 dark:border-white/10 bg-paper px-6 py-3.5 text-sm font-medium text-ink shadow-sm transition-all hover:bg-paper-200 hover:shadow-md disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t("auth.google_signin", "Sign in with Google")}
              </button>

              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-black/5 dark:border-white/5" />
                <span className="flex-shrink mx-4 text-xs font-semibold text-ink/40 uppercase">{t("common.or", "or")}</span>
                <div className="flex-grow border-t border-black/5 dark:border-white/5" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("auth.username", "Username")}
                    disabled={busy}
                    className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                  />
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.password", "Password")}
                    disabled={busy}
                    className="w-full rounded-full border border-black/10 dark:border-white/10 bg-paper px-5 py-3.5 pr-12 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white dark:bg-shopfront focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center text-ink/40 hover:text-ink/80"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-ink/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-black/10 text-leaf focus:ring-leaf"
                    />
                    {t("auth.remember_me", "Remember me")}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-shopfront px-6 py-3.5 text-sm font-semibold text-paper shadow-md transition-all hover:bg-shopfront-700 hover:shadow-lg disabled:opacity-50"
                >
                  {busy ? t("common.loading", "Loading...") : t("auth.sign_in", "Sign In")}
                </button>
              </form>

              <div className="text-center text-sm pt-4">
                {t("auth.no_account", "Don't have an account?")}{" "}
                <Link to="/register" className="font-medium text-leaf hover:underline">
                  {t("auth.register_link", "Register")}
                </Link>
              </div>
            </>
          )}

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
