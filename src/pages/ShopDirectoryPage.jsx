import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, Filter, Store, CheckCircle2, Phone, MapPin, User, Sparkles, BadgeCheck } from "lucide-react";
import { api } from "../lib/api";

export default function ShopDirectoryPage() {
  const { t } = useOutletContext();
  const [shops, setShops] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDirectory = async () => {
      try {
        const res = await api.getDirectory();
        setShops(res.shops || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDirectory();
  }, []);

  const categories = useMemo(() => {
    const values = new Set(shops.map((shop) => shop.business_category || "General Store"));
    return [...values].sort();
  }, [shops]);

  const visibleShops = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shops.filter((shop) => {
      const matchesCategory = category === "all" || (shop.business_category || "General Store") === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      const haystack = [
        shop.shop_name,
        shop.owner_name,
        shop.mobile_number,
        shop.shop_address,
        shop.business_category,
        shop.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [shops, query, category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-shopfront">Shop Directory</h1>
          <p className="mt-1 text-sm text-ink/60">Search registered shops, discover nearby businesses, and connect with owners.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-shopfront shadow-[var(--shadow-card)] ring-1 ring-black/5">
          <Sparkles className="h-4 w-4 text-marigold" />
          {shops.length} registered shops
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-full border border-black/10 bg-paper px-4 py-3 text-sm text-ink/70">
            <Search className="h-4 w-4 text-ink/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shops, owners, address or phone"
              className="w-full bg-transparent outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-full border border-black/10 bg-paper px-4 py-3 text-sm text-ink/70">
            <Filter className="h-4 w-4 text-ink/40" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-transparent outline-none">
              <option value="all">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
              <div className="h-20 rounded-xl bg-paper" />
            </div>
          ))}
        </div>
      ) : visibleShops.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/60 shadow-[var(--shadow-card)] ring-1 ring-black/5">
          No shops matched your search yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleShops.map((shop) => (
            <article key={shop.id} className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-paper text-lg font-semibold text-shopfront ring-1 ring-black/5">
                    {shop.shop_logo ? (
                      <img src={shop.shop_logo} alt={shop.shop_name || shop.name} className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-shopfront">{shop.shop_name || shop.name}</h2>
                      <BadgeCheck className="h-4 w-4 text-leaf" />
                    </div>
                    <p className="text-sm text-ink/60">{shop.owner_name || "Owner"}</p>
                  </div>
                </div>
                <span className="rounded-full bg-leaf/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-leaf">
                  Verified
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-ink/70">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-ink/40" />
                  <span>{shop.mobile_number || shop.whatsapp_number || "Not shared"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-ink/40" />
                  <span>{shop.shop_address || "Address shared by owner"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-ink/40" />
                  <span>{shop.business_category || "General Store"}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink/60">
                  {shop.business_category || "General Store"}
                </span>
                <button className="inline-flex items-center gap-2 rounded-full bg-shopfront px-4 py-2 text-sm font-semibold text-paper transition-transform hover:-translate-y-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Connect Shop
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
