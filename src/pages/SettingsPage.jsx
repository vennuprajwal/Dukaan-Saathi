import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { User, LogOut, Moon, Sun, Save, Globe } from "lucide-react";
import { Card } from "./DashboardPage";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { useTheme } from "../lib/theme";

export default function SettingsPage() {
  const { t } = useOutletContext();
  const { shop, logout, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [form, setForm] = useState({ name: "", lang: "en" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Initialize form with current shop data
  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name || "",
        lang: shop.lang_pref || "en"
      });
    }
  }, [shop]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const res = await api.updateProfile(form);
      login(res.token, res.shop); // Update local context and localStorage
      setSuccess("Profile updated successfully!");
      // Automatically clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-shopfront">Settings</h1>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Profile Settings */}
        <Card title="Shop Profile" icon={User}>
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">Store Name</label>
              <input
                className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Awesome Shop"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
                <Globe className="h-4 w-4" /> Language Preference
              </label>
              <select
                className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
                value={form.lang}
                onChange={(e) => setForm({ ...form, lang: e.target.value })}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            {error && <p className="text-sm text-terracotta bg-terracotta/10 px-3 py-2 rounded-lg">{error}</p>}
            {success && <p className="text-sm text-leaf bg-leaf/10 px-3 py-2 rounded-lg">{success}</p>}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-shopfront px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </Card>

        {/* Appearance Settings */}
        <Card title="Appearance" icon={Moon}>
          <div className="flex items-center justify-between max-w-md">
            <div>
              <p className="font-medium text-shopfront">Dark Mode</p>
              <p className="text-sm text-ink/60">Switch between light and dark themes</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-shopfront/10 transition-colors focus:outline-none focus:ring-2 focus:ring-marigold focus:ring-offset-2"
              style={{ backgroundColor: theme === "dark" ? "var(--marigold)" : "" }}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-7" : "translate-x-1"}`}
              >
                {theme === "dark" ? (
                  <Moon className="h-4 w-4 m-1 text-shopfront" />
                ) : (
                  <Sun className="h-4 w-4 m-1 text-marigold" />
                )}
              </span>
            </button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card title="Account Actions" icon={LogOut}>
          <p className="text-sm text-ink/60 mb-4 max-w-md">
            Log out of Dukaan Saathi on this device. You can log back in at any time using your phone number and PIN.
          </p>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to log out?")) {
                logout();
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-terracotta/30 bg-terracotta/5 px-5 py-2.5 text-sm font-semibold text-terracotta hover:bg-terracotta hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </Card>
      </div>
    </div>
  );
}
