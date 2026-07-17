import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import {
  LayoutDashboard, ShoppingBag, Package, Users, PieChart,
  Target, Mic, Scan, Settings, Info, LogOut, Sparkles, Store, Bell, BookOpen, History
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeToggle from "../components/ThemeToggle";
import AiChat from "../components/AiChat";
import ShopSelector from "../components/ShopSelector";
import { motion, AnimatePresence } from "motion/react";

const money = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const timeOf = (s) => (s ? s.replace(/^.*\s/, "").slice(0, 5) : "");

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const syncedLang = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
      if (!syncedLang.current && d.shop?.lang_pref && d.shop.lang_pref !== i18n.resolvedLanguage) {
        i18n.changeLanguage(d.shop.lang_pref);
      }
      syncedLang.current = true;
    } catch (e) {
      setErr(e.message);
      if (/auth|session|401/i.test(e.message)) { logout(); navigate("/login"); }
    } finally {
      setLoading(false);
    }
  }, [i18n, logout, navigate]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!syncedLang.current) return;
    const lng = i18n.resolvedLanguage?.slice(0, 2);
    if (lng && ["en", "hi", "te"].includes(lng)) api.setLang(lng).catch(() => {});
  }, [i18n.resolvedLanguage]);

  const navItems = [
    { name: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
    { name: "Shop Directory", path: "/app/directory", icon: Store },
    { name: "Notifications", path: "/app/notifications", icon: Bell },
    { name: "Dukaan Saathi AI", path: "/app/ai", icon: Sparkles },
    { name: "Sales", path: "/app/sales", icon: ShoppingBag },
    { name: "Inventory", path: "/app/inventory", icon: Package },
    { name: "Udhaar", path: "/app/udhaar", icon: Users },
    { name: "Customer Ledger", path: "/app/ledger", icon: BookOpen },
    { name: "Reminder History", path: "/app/reminders", icon: History },
    { name: "Reports", path: "/app/reports", icon: PieChart },
    { name: "Business Coach", path: "/app/coach", icon: Target },
    { name: "Voice Assistant", path: "/app/voice", icon: Mic },
    { name: "Notebook Scanner", path: "/app/scanner", icon: Scan },
  ];

  const bottomItems = [
    { name: "Settings", path: "/app/settings", icon: Settings },
    { name: "About", path: "/app/about", icon: Info },
  ];

  return (
    <div className="flex min-h-screen bg-paper font-body text-ink">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-black/5 dark:border-white/5 bg-white dark:bg-shopfront/50 backdrop-blur-xl lg:flex">
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-shopfront text-sm font-bold text-marigold">दु</div>
            <span className="font-display text-lg font-bold tracking-tight text-shopfront">Dukaan Saathi</span>
          </div>
          <ShopSelector />
        </div>
        
        <div className="px-4 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-shopfront text-paper shadow-md shadow-shopfront/20"
                    : "text-ink/60 hover:bg-black/5 hover:text-shopfront"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-marigold" : "text-ink/40 group-hover:text-shopfront"}`} />
                {item.name}
              </Link>
            );
          })}
          
          <div className="my-4 border-t border-black/5 dark:border-white/5" />
          
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  isActive ? "bg-black/5 text-shopfront" : "text-ink/60 hover:bg-black/5 hover:text-shopfront"
                }`}
              >
                <Icon className="h-4 w-4 text-ink/40 group-hover:text-shopfront" />
                {item.name}
              </Link>
            );
          })}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-terracotta/80 transition-all hover:bg-terracotta/10 hover:text-terracotta"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex w-full flex-1 flex-col overflow-hidden relative">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-black/5 dark:border-white/5 bg-white dark:bg-shopfront/50 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
           <div className="flex items-center gap-3">
             <div className="grid h-8 w-8 place-items-center rounded-xl bg-shopfront text-sm font-bold text-marigold">दु</div>
             <span className="font-display text-lg font-bold tracking-tight text-shopfront">Dukaan Saathi</span>
            </div>
            <div className="flex items-center gap-2">
              <ShopSelector />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-paper p-4 sm:p-6 custom-scrollbar pb-24 lg:pb-6">
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="mx-auto max-w-5xl h-full"
             >
               <Outlet context={{ data, load, money, timeOf, t, err, loading, busy, setBusy, setErr }} />
             </motion.div>
           </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-black/5 dark:border-white/5 bg-white dark:bg-shopfront/90 pb-safe pt-2 backdrop-blur-xl lg:hidden">
           {navItems.slice(0, 4).map((item) => {
             const isActive = location.pathname === item.path;
             const Icon = item.icon;
             const shortName = item.name === "Shop Directory" ? "Directory" : item.name === "Dukaan Saathi AI" ? "AI" : item.name.split(" ")[0];
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl min-w-0 flex-1 ${isActive ? "text-shopfront bg-shopfront/5" : "text-ink/40"}`}
               >
                  <Icon className={`h-5 w-5 ${isActive ? "text-marigold" : ""}`} />
                  <span className="text-[10px] font-medium truncate w-full text-center leading-tight">{shortName}</span>
                </Link>
             );
           })}
        </nav>
      </main>
      <AiChat />
    </div>
  );
}
