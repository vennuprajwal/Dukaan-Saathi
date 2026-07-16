import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context.js";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { motion } from "motion/react";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

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
        login(res.token, res.shop, { persist: rememberMe });
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
      login(res.token, res.shop, { persist: rememberMe });
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
      login(res.token, res.shop, { persist: rememberMe });
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
          className="rounded-[2rem] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 sm:p-10"
        >
          {googleAuthData ? (
            <form onSubmit={handleCompleteGoogleSetup} className="space-y-4">
              <h2 className="text-lg font-bold text-shopfront text-center mb-2">
                Complete Google Setup
              </h2>
              <p className="text-xs text-ink/60 text-center mb-4 font-medium">
                We need a few details to set up your shop for <span className="text-leaf">{googleAuthData.email}</span>.
              </p>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-ink/80">
                  Shop Name
                </label>
                <input
                  type="text"
                  required
                  value={googleShopName}
                  onChange={(e) => setGoogleShopName(e.target.value)}
                  placeholder="e.g. Raju Kirana Store"
                  className="w-full rounded-full border border-black/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/10"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-ink/80">
                  Mobile Number (WhatsApp)
                </label>
                <input
                  type="text"
                  required
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                  placeholder="e.g. 9845455100"
                  className="w-full rounded-full border border-black/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/10"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-ink/80">
                  Shop Address
                </label>
                <input
                  type="text"
                  required
                  value={googleAddress}
                  onChange={(e) => setGoogleAddress(e.target.value)}
                  placeholder="e.g. Bangalore, Main Road"
                  className="w-full rounded-full border border-black/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/10"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                {busy ? t("common.loading", "Loading…") : "Complete Setup"}
              </button>
              <button
                type="button"
                onClick={() => setGoogleAuthData(null)}
                className="w-full text-center text-sm text-ink/60 hover:underline mt-2"
              >
                Cancel
              </button>
            </form>
          ) : showMockGoogle ? (
            <form onSubmit={handleMockGoogleSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-shopfront text-center mb-2">
                Mock Google Login
              </h2>
              <p className="text-xs text-ink/60 text-center mb-4">
                No Google Client ID set. Simulate a Google user authentication here.
              </p>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-ink/80">
                  Mock Email
                </label>
                <input
                  type="email"
                  required
                  value={mockEmail}
                  onChange={(e) => setMockEmail(e.target.value)}
                  className="w-full rounded-full border border-black/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/10"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-ink/80">
                  Mock Name
                </label>
                <input
                  type="text"
                  required
                  value={mockName}
                  onChange={(e) => setMockName(e.target.value)}
                  className="w-full rounded-full border border-black/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/10"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01]"
              >
                Continue as Mock User
              </button>
              <button
                type="button"
                onClick={() => setShowMockGoogle(false)}
                className="w-full text-center text-sm text-ink/60 hover:underline mt-2"
              >
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <h1 className="mb-6 text-center text-2xl font-bold text-shopfront">{t("auth.login_title", "Login")}</h1>
              <div className="space-y-1">
                <label htmlFor="username" className="block text-sm font-medium text-ink/80">
                  {t("auth.username", "Username")}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("auth.username_placeholder", "Enter your username")}
                  disabled={busy}
                  className="w-full rounded-full border border-black/10 bg-paper px-5 py-3.5 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                />
              </div>
              <div className="relative space-y-1">
                <label htmlFor="password" className="block text-sm font-medium text-ink/80">
                  {t("auth.password", "Password")}
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.password_placeholder", "Enter your password")}
                  disabled={busy}
                  className="w-full rounded-full border border-black/10 bg-paper px-5 py-3.5 pr-12 text-sm text-ink outline-none transition-all focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/10 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-ink/40 hover:text-ink"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={busy}
                    className="h-4 w-4 rounded border-black/30 text-leaf focus:ring-leaf"
                  />
                  <span className="text-sm text-ink/80">{t("auth.remember_me", "Remember Me")}</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
              >
                {busy ? t("common.loading", "Loading…") : t("auth.login", "Login")}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-black/5"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-ink/40 uppercase">or</span>
                <div className="flex-grow border-t border-black/5"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-sm transition-transform hover:scale-[1.01]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35,11.1H12v2.7h5.38C16.88,15.22,14.65,16.5,12,16.5c-3.1,0-5.72-2.1-6.66-4.93c-0.24-0.72-0.38-1.49-0.38-2.3 s0.14-1.58,0.38-2.3C6.28,4.1,8.9,2,12,2c1.98,0,3.77,0.76,5.12,2l2.03-2C17.15,0.76,14.71,0,12,0C7.31,0,3.22,2.69,1.19,6.66 C0.43,8.15,0,9.83,0,11.6c0,1.77,0.43,3.45,1.19,4.94c2.03,3.97,6.12,6.66,10.81,6.66c5.87,0,10.9-4.22,10.9-10.9 C22.9,11.75,22.84,11.45,21.35,11.1z" fill="#4285F4"/>
                  <path d="M1.19,6.66C3.22,2.69,7.31,0,12,0c2.71,0,5.15,0.76,7.15,2L17.12,4C15.77,2.76,13.98,2,12,2 c-3.1,0-5.72,2.1-6.66,4.93l-2.85-2.2L1.19,6.66z" fill="#EA4335"/>
                  <path d="M1.19,16.54l2.85-2.2c0.94,2.83,3.56,4.93,6.66,4.93c2.65,0,4.88-1.28,6.26-3.32l2.36,1.83 C17.38,20.12,14.87,22.2,12,22.2C7.31,22.2,3.22,19.51,1.19,16.54z" fill="#34A853"/>
                  <path d="M21.35,11.1H12v2.7h5.38c-0.5,1.42-2.73,2.7-5.38,2.7c-3.1,0-5.72-2.1-6.66-4.93l-2.85,2.2 C3.22,19.51,7.31,22.2,12,22.2c2.87,0,5.38-2.08,7.28-4.42l-2.36-1.83C15.77,17.22,13.98,16.5,12,16.5 c-2.65,0-4.88-1.28-6.26-3.32H21.35z" fill="#FBBC05"/>
                </svg>
                Continue with Google
              </button>

              <div className="text-center text-sm pt-2">
                {t("auth.no_account", "Don’t have an account?")} <Link to="/register" className="font-medium text-leaf hover:underline">
                  {t("auth.register_link", "Register")}
                </Link>
              </div>
            </form>
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
