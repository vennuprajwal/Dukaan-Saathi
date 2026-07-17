import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Store, CheckCircle2, Phone, MapPin, User, Sparkles, BadgeCheck } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

export default function ShopDirectoryPage() {

  const toast = useToast();
  
  const [shops, setShops] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState({});

  const [activeTab, setActiveTab] = useState("browse");
  const [connectedShops, setConnectedShops] = useState([]);
  const [loadingConnected, setLoadingConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState({});
  const [selectedShopProfile, setSelectedShopProfile] = useState(null);

  const loadConnected = async () => {
    setLoadingConnected(true);
    try {
      const res = await api.getConnectedShops();
      setConnectedShops(res.connected || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingConnected(false);
    }
  };

  const handleDisconnectShop = async (targetShopId) => {
    if (!window.confirm("Are you sure you want to disconnect this shop?")) return;
    setDisconnecting((prev) => ({ ...prev, [targetShopId]: true }));
    try {
      await api.disconnectShop(targetShopId);
      toast.success("Disconnected successfully.");
      await loadConnected();
    } catch (err) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting((prev) => ({ ...prev, [targetShopId]: false }));
    }
  };

  const handleConnectShop = async (shopId) => {
    setConnecting((prev) => ({ ...prev, [shopId]: true }));
    try {
      await api.connectShop(shopId);
      toast.success("Connection request sent successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to send connection request.");
    } finally {
      setConnecting((prev) => ({ ...prev, [shopId]: false }));
    }
  };

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
    loadConnected();
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

      {/* Tab Switcher */}
      <div className="flex border-b border-black/10 gap-6">
        <button
          onClick={() => setActiveTab("browse")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "browse" ? "text-shopfront" : "text-ink/40 hover:text-ink"
          }`}
        >
          Browse Shops
          {activeTab === "browse" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-shopfront" />}
        </button>
        <button
          onClick={() => setActiveTab("connected")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "connected" ? "text-shopfront" : "text-ink/40 hover:text-ink"
          }`}
        >
          Connected Shops ({connectedShops.length})
          {activeTab === "connected" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-shopfront" />}
        </button>
      </div>

      {error && <div className="rounded-2xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{error}</div>}

      {activeTab === "browse" ? (
        <>
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
                    <button
                      onClick={() => handleConnectShop(shop.id)}
                      disabled={connecting[shop.id]}
                      className="inline-flex items-center gap-2 rounded-full bg-shopfront px-4 py-2 text-sm font-semibold text-paper transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {connecting[shop.id] ? "Connecting…" : "Connect Shop"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {loadingConnected ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
                  <div className="h-20 rounded-xl bg-paper" />
                </div>
              ))}
            </div>
          ) : connectedShops.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/60 shadow-[var(--shadow-card)] ring-1 ring-black/5">
              You haven't connected with any shops yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {connectedShops.map((shop) => (
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
                      Connected
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-ink/70">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-ink/40" />
                      <span>{shop.mobile_number || shop.whatsapp_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-ink/40" />
                      <span>{shop.shop_address || "Address shared by owner"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink/40 uppercase">Connected Since:</span>
                      <span className="text-xs">{new Date(shop.connected_since).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
                    <button
                      onClick={() => setSelectedShopProfile(shop)}
                      className="text-xs font-semibold text-shopfront hover:underline"
                    >
                      View Shop Profile
                    </button>
                    <button
                      disabled={disconnecting[shop.id]}
                      onClick={() => handleDisconnectShop(shop.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/5 px-3.5 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta hover:text-white transition-colors disabled:opacity-50"
                    >
                      Disconnect Shop
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Selected Shop Profile Modal */}
      {selectedShopProfile && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setSelectedShopProfile(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-paper text-xl font-bold text-shopfront ring-1 ring-black/5">
                {selectedShopProfile.shop_logo ? (
                  <img src={selectedShopProfile.shop_logo} alt={selectedShopProfile.shop_name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-lg font-bold text-shopfront">{selectedShopProfile.shop_name || selectedShopProfile.name}</h3>
                  <BadgeCheck className="h-4 w-4 text-leaf" />
                </div>
                <p className="text-sm text-ink/60">{selectedShopProfile.owner_name || "Owner"}</p>
              </div>
            </div>
            
            <div className="space-y-3.5 text-sm text-ink/80 border-t border-black/5 pt-4 mb-6">
              <div className="flex justify-between">
                <span className="text-ink/50">Phone Number:</span>
                <span className="font-medium">{selectedShopProfile.mobile_number || selectedShopProfile.whatsapp_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/50">Category:</span>
                <span className="font-medium">{selectedShopProfile.business_category || "General Store"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/50">Address:</span>
                <span className="font-medium text-right max-w-[200px] truncate">{selectedShopProfile.shop_address || "Address shared by owner"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/50">Connected Since:</span>
                <span className="font-medium">{new Date(selectedShopProfile.connected_since).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/50">Status:</span>
                <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-xs font-semibold text-leaf">Connected</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedShopProfile(null)}
                className="rounded-full bg-shopfront px-6 py-2 text-sm font-semibold text-paper hover:bg-shopfront/95 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
