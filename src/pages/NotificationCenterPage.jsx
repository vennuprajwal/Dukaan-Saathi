import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bell, CheckCheck, Search, Trash2, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { api } from "../lib/api";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "payments", label: "Payments" },
  { value: "orders", label: "Orders" },
  { value: "credits", label: "Credits" },
  { value: "inventory", label: "Inventory Alerts" },
  { value: "connections", label: "Connection Requests" },
];

const CATEGORY_META = {
  payments: { badge: "bg-marigold/15 text-shopfront", label: "Payments" },
  orders: { badge: "bg-leaf/15 text-leaf", label: "Orders" },
  credits: { badge: "bg-shopfront/10 text-shopfront", label: "Credits" },
  inventory: { badge: "bg-terracotta/10 text-terracotta", label: "Inventory" },
  connections: { badge: "bg-slate-100 text-slate-700", label: "Connections" },
  general: { badge: "bg-black/5 text-ink/70", label: "General" },
};

export default function NotificationCenterPage() {
  const { t } = useOutletContext();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNotificationCenter({ search, category, page, limit });
      setItems(data.notifications || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setUnread(data.unread || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [category, limit, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id) => {
    await api.markNotificationRead(id);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setUnread((current) => Math.max(0, current - 1));
  };

  const remove = async (id) => {
    await api.deleteNotification(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setTotal((current) => Math.max(0, current - 1));
    setUnread((current) => Math.max(0, current - 1));
  };

  const stats = useMemo(() => ({
    total,
    unread,
    read: Math.max(0, total - unread),
  }), [total, unread]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-shopfront">
              <Bell className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Notification Center</h1>
            </div>
            <p className="mt-1 text-sm text-ink/60">Track payments, orders, credits, inventory issues, and connection requests in one view.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl bg-marigold/10 px-3 py-2 text-sm text-shopfront">
              <span className="font-semibold">{stats.unread}</span> unread
            </div>
            <div className="rounded-2xl bg-black/5 px-3 py-2 text-sm text-ink/70">
              <span className="font-semibold">{stats.total}</span> total
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-2xl border border-black/5 bg-paper px-3 py-2.5">
            <Search className="h-4 w-4 text-ink/40" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search notifications"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-black/5 bg-paper px-3 py-2.5">
            <Filter className="h-4 w-4 text-ink/40" />
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="bg-transparent text-sm outline-none"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => load()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-shopfront px-3 py-2.5 text-sm font-semibold text-paper"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm text-ink/60">Loading notifications…</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm text-ink/60">No notifications match this view yet.</div>
        ) : (
          items.map((item) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.general;
            return (
              <div key={item.id} className={`rounded-3xl border p-4 shadow-sm ${item.read ? "border-black/5 bg-white" : "border-shopfront/20 bg-marigold/5"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
                      {!item.read && <span className="rounded-full bg-terracotta/10 px-2.5 py-1 text-xs font-semibold text-terracotta">Unread</span>}
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-ink">{item.title}</h2>
                    <p className="mt-1 text-sm text-ink/70">{item.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink/50">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {item.amount ? <span>Amount: ₹{item.amount}</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!item.read ? (
                      <button onClick={() => markRead(item.id)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-shopfront ring-1 ring-black/5">
                        <CheckCheck className="h-4 w-4" />
                        Mark read
                      </button>
                    ) : null}
                    <button onClick={() => remove(item.id)} className="inline-flex items-center gap-2 rounded-full bg-terracotta/10 px-3 py-2 text-sm font-medium text-terracotta">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between rounded-3xl bg-white p-3 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        <div className="text-sm text-ink/60">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex items-center gap-1 rounded-full border border-black/5 px-3 py-2 text-sm disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="inline-flex items-center gap-1 rounded-full border border-black/5 px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
