// src/pages/ShopProfilePage.jsx
import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { User, Lock, Save, LogOut, Mail, Phone, MapPin, Image as ImageIcon, Briefcase, Globe } from "lucide-react";
import { Card } from "./DashboardPage";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";

export default function ShopProfilePage() {
  const { t } = useOutletContext();
  const { shop, logout, login } = useAuth();
  const navigate = useNavigate();

  // ------------------- Profile Form -------------------
  const [profile, setProfile] = useState({
    shop_name: "",
    owner_name: "",
    mobile_number: "",
    email: "",
    shop_address: "",
    shop_logo: "",
    business_category: "",
    lang: "en",
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // ------------------- Password Form -------------------
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // Initialise profile fields with current shop data
  useEffect(() => {
    if (shop) {
      setProfile({
        shop_name: shop.shop_name || shop.name || "",
        owner_name: shop.owner_name || "",
        mobile_number: shop.mobile_number || shop.whatsapp_number || "",
        email: shop.email || "",
        shop_address: shop.shop_address || "",
        shop_logo: shop.shop_logo || "",
        business_category: shop.business_category || "",
        lang: shop.lang_pref || "en",
      });
    }
  }, [shop]);

  // ------------------- Handlers -------------------
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileBusy(true);
    try {
      const res = await api.updateProfile(profile);
      // Update auth context with new token/shop payload
      login(res.token, res.shop);
      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setProfileBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (passwords.new !== passwords.confirm) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    setPwdBusy(true);
    try {
      await api.changePassword({
        current_password: passwords.current,
        new_password: passwords.new,
      });
      setPwdSuccess("Password changed successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
      setTimeout(() => setPwdSuccess(""), 3000);
    } catch (err) {
      setPwdError(err.message || "Failed to change password");
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      <h1 className="font-display text-3xl font-bold text-shopfront">Shop Profile</h1>

      {/* ---------- Update Shop Details ---------- */}
      <Card title="Shop Details" icon={User}>
        <form onSubmit={handleProfileSave} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" /> Shop Name
            </label>
            <input
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.shop_name}
              onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
              placeholder="My Awesome Shop"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <User className="h-4 w-4" /> Owner Name
            </label>
            <input
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.owner_name}
              onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })}
              placeholder="Owner name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <Phone className="h-4 w-4" /> Mobile Number
            </label>
            <input
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.mobile_number}
              onChange={(e) => setProfile({ ...profile, mobile_number: e.target.value })}
              placeholder="+91XXXXXXXXXX"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> Email
            </label>
            <input
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="owner@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Shop Address
            </label>
            <input
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.shop_address}
              onChange={(e) => setProfile({ ...profile, shop_address: e.target.value })}
              placeholder="City, Area, Street"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" /> Shop Logo URL
            </label>
            <input
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.shop_logo}
              onChange={(e) => setProfile({ ...profile, shop_logo: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" /> Business Category
            </label>
            <input
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.business_category}
              onChange={(e) => setProfile({ ...profile, business_category: e.target.value })}
              placeholder="Grocery, Pharmacy, Bakery..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1 flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> Language Preference
            </label>
            <select
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={profile.lang}
              onChange={(e) => setProfile({ ...profile, lang: e.target.value })}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>

          {profileError && (
            <p className="text-sm text-terracotta bg-terracotta/10 px-3 py-2 rounded-lg">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-sm text-leaf bg-leaf/10 px-3 py-2 rounded-lg">{profileSuccess}</p>
          )}

          <button
            type="submit"
            disabled={profileBusy}
            className="inline-flex items-center gap-2 rounded-full bg-shopfront px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {profileBusy ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </Card>

      {/* ---------- Change Password ---------- */}
      <Card title="Change Password" icon={Lock}>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">Current Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">New Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-black/15 bg-paper px-4 py-2.5 text-sm text-shopfront outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              required
            />
          </div>
          {pwdError && (
            <p className="text-sm text-terracotta bg-terracotta/10 px-3 py-2 rounded-lg">{pwdError}</p>
          )}
          {pwdSuccess && (
            <p className="text-sm text-leaf bg-leaf/10 px-3 py-2 rounded-lg">{pwdSuccess}</p>
          )}
          <button
            type="submit"
            disabled={pwdBusy}
            className="inline-flex items-center gap-2 rounded-full bg-shopfront px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-50"
          >
            <Lock className="h-4 w-4" /> {pwdBusy ? "Changing..." : "Change Password"}
          </button>
        </form>
      </Card>

      {/* ---------- Logout ---------- */}
      <Card title="Account Actions" icon={LogOut}>
        <p className="text-sm text-ink/60 mb-4 max-w-md">
          Log out of Dukaan Saathi on this device. You can log back in at any time.
        </p>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to log out?")) {
              logout();
              navigate("/login");
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-terracotta/30 bg-terracotta/5 px-5 py-2.5 text-sm font-semibold text-terracotta hover:bg-terracotta hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" /> Log Out
        </button>
      </Card>
    </div>
  );
}
