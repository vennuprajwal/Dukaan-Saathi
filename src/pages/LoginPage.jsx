import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Store, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context.js";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | register | reset
  const [form, setForm] = useState({ whatsapp_number: "", pin: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPin, setShowPin] = useState(false);
  const [remember, setRemember] = useState(true);

  // autosave key for partially-entered auth form
  const AUTOSAVE_KEY = "dukaan_auth_form";

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "null");
      if (saved) setForm((f) => ({ ...f, ...saved }));
    } catch {}
  }, []);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: v };
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    setFieldErrors({});
    // client-side validation
    const errs = {};
    if (!form.whatsapp_number || form.whatsapp_number.trim().length < 5) errs.whatsapp_number = t("login.errors.numberRequired") || "Enter a valid phone number";
    if (!form.pin || form.pin.trim().length < 4) errs.pin = t("login.errors.pinShort") || "PIN must be at least 4 digits";
    if (mode === "register" && (!form.name || form.name.trim().length < 2)) errs.name = t("login.errors.nameRequired") || "Enter a shop name";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setBusy(false);
      return;
    }
    try {
      const payload = { ...form, lang: i18n.resolvedLanguage?.slice(0, 2) || "en" };
      const res =
        mode === "login" ? await api.login(payload)
        : mode === "reset" ? await api.resetPin(payload)
        : await api.register(payload);
      login(res.token, res.shop, { persist: remember });
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
      navigate("/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Instant demo: register (or log into) a throwaway shop and seed it, so a
  // visitor lands on a fully populated dashboard with one click.
  const tryDemo = async () => {
    setError("");
    setBusy(true);
    try {
      const number = "+91" + Math.floor(7000000000 + (Date.now() % 2999999999));
      const pin = "1234";
      const lang = i18n.resolvedLanguage?.slice(0, 2) || "en";
      const res = await api.register({ whatsapp_number: number, name: t("login.demoShopName") || "Demo Kirana Store", pin, lang });
      login(res.token, res.shop, { persist: false });
      await api.loadDemo();
      navigate("/app");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-5 py-10 font-body text-ink">
      {/* Fixed toggle so login/register stays visible while filling the form */}
      <div className="auth-toggle-fixed hidden sm:flex">
        <button
          onClick={() => { setMode("login"); setError(""); }}
          className={`px-3 py-2 rounded-l-full text-sm font-medium ${mode === "login" ? "bg-white text-shopfront shadow-[var(--shadow-card)]" : "text-ink/60 bg-transparent"}`}
        >
          {t("login.loginBtn")}
        </button>
        <button
          onClick={() => { setMode("register"); setError(""); }}
          className={`px-3 py-2 rounded-r-full text-sm font-medium ${mode === "register" ? "bg-white text-shopfront shadow-[var(--shadow-card)]" : "text-ink/60 bg-transparent"}`}
        >
          {t("login.registerBtn")}
        </button>
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-shopfront">
            <ArrowLeft className="h-4 w-4" /> {t("common.backHome")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-[var(--shadow-card)] ring-1 ring-black/5 sm:p-9">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-shopfront text-marigold">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-shopfront">
                {mode === "login" ? t("login.title") : mode === "reset" ? (t("login.resetTitle") || "Reset PIN") : t("login.registerBtn")}
              </h1>
              <p className="text-sm text-ink/50">
                {mode === "reset" ? (t("login.resetSubtitle") || "Set a new PIN for your shop") : t("login.subtitle")}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field label={t("login.shopName")}>
                <input
                  className="input"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Sharma Kirana Store"
                  aria-label={t("login.shopName")}
                  autoComplete="organization"
                />
                {fieldErrors.name && <div className="text-terracotta text-sm mt-1">{fieldErrors.name}</div>}
              </Field>
            )}
            <Field label={t("login.number")} hint={t("login.numberHint") }>
              <input
                className="input"
                value={form.whatsapp_number}
                onChange={set("whatsapp_number")}
                placeholder="+9198XXXXXXXX"
                inputMode="tel"
                aria-label={t("login.number")}
                autoComplete="tel"
              />
              {fieldErrors.whatsapp_number && <div className="text-terracotta text-sm mt-1">{fieldErrors.whatsapp_number}</div>}
            </Field>
            <Field label={mode === "reset" ? (t("login.newPin") || "New PIN") : t("login.pin")}>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  value={form.pin}
                  onChange={set("pin")}
                  placeholder="••••"
                  inputMode="numeric"
                  type={showPin ? 'text' : 'password'}
                  aria-label={t("login.pin")}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button type="button" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin(s => !s)} style={{ position: 'absolute', right: 8, top: 8 }} className="text-xs text-ink/60">
                  {showPin ? t('login.hide') || 'Hide' : t('login.show') || 'Show'}
                </button>
              </div>
              {fieldErrors.pin && <div className="text-terracotta text-sm mt-1">{fieldErrors.pin}</div>}
            </Field>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="text-xs">{t('login.remember') || 'Remember me'}</span>
              </label>
              {mode === "reset" ? (
                <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-xs text-ink/60 hover:underline">
                  {t('login.backToLogin') || 'Back to login'}
                </button>
              ) : (
                <button type="button" onClick={() => { setMode("reset"); setError(""); }} className="text-xs text-ink/60 hover:underline">
                  {t('login.forgot') || 'Forgot PIN?'}
                </button>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-marigold px-6 py-3 font-sans text-sm font-semibold text-shopfront transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {busy
                ? mode === "login" ? t("login.loggingIn") : mode === "reset" ? (t("login.resetting") || "Resetting…") : t("login.creating")
                : mode === "login" ? t("login.loginBtn") : mode === "reset" ? (t("login.resetBtn") || "Reset PIN") : t("login.registerBtn")}
            </button>
          </form>

          {/* one-click demo */}
          <div className="mt-4 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-ink/10" />
            {t("login.or") || "or"}
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <button
            onClick={tryDemo}
            disabled={busy}
            className="mt-4 w-full rounded-full bg-shopfront px-6 py-3 font-sans text-sm font-semibold text-paper transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            ✨ {t("login.tryDemo") || "Try a live demo (no signup)"}
          </button>

          {mode !== "reset" && (
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="mt-5 w-full text-center text-sm font-medium text-terracotta hover:underline"
            >
              {mode === "login" ? t("login.toRegister") : t("login.toLogin")}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ink/40">
          Tip: register the same number you use in the WhatsApp simulator to see its data here.
        </p>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(27,58,75,0.15);
          background: #fff;
          padding: 0.7rem 0.9rem;
          font-size: 0.95rem;
          color: var(--color-ink);
          outline: none;
        }
        .input:focus { border-color: var(--color-marigold); box-shadow: 0 0 0 3px rgba(245,166,35,0.2); }
        .auth-toggle-fixed {
          position: fixed;
          top: 18px;
          right: 18px;
          background: transparent;
          border-radius: 9999px;
          overflow: hidden;
          z-index: 60;
          box-shadow: 0 6px 20px rgba(8,15,24,0.06);
        }
        .auth-toggle-fixed button { border: 1px solid rgba(27,58,75,0.06); }
        @media (max-width: 640px) {
          .auth-toggle-fixed { left: 50%; transform: translateX(-50%); right: auto; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-sm font-medium text-shopfront">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/40">{hint}</span>}
    </label>
  );
}
