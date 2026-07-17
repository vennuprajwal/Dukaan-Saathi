import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet, TrendingUp, ShoppingBag,
  Package, Users,
  Receipt, BarChart3, Star, Plus, Sparkles, Download, X,
  CalendarClock, BellRing, AlertCircle, CircleDollarSign, Trash2
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { api } from "../lib/api";
import MorningBrief from "../components/MorningBrief";
import CustomerSearchSelector from "../components/CustomerSearchSelector";

export default function DashboardPage() {
  const { data, load, money, t, err, loading, busy, setBusy, setErr } = useOutletContext();
  const [showAddSale, setShowAddSale] = useState(false);

  const loadDemo = async () => {
    setBusy("demo");
    setErr("");
    try {
      await api.loadDemo();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const exportCsv = async () => {
    setBusy("export");
    setErr("");
    try {
      const blob = await api.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dukaan-${(data?.shop?.name || "shop").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-sales.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const resetData = async () => {
    if (!window.confirm(t("dashboard.resetConfirm", "This will delete all sales, expenses, and inventory data. Are you sure?"))) return;
    setBusy("reset");
    setErr("");
    try {
      await api.resetData();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const submitSale = async (sale) => {
    await api.addSale(sale);
    setShowAddSale(false);
    load();
  };

  if (loading && !data) {
    return <div className="grid h-full place-items-center text-ink/50">{t("common.loading")}</div>;
  }

  const s = data?.summary || {};
  const trend = data?.trend || [];
  const maxRev = Math.max(1, ...trend.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {err && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">{err}</motion.p>}
      </AnimatePresence>

      <MorningBrief data={data} money={money} />

      {/* action toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddSale(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-4 py-2.5 text-xs font-semibold text-paper hover:-translate-y-0.5 transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" /> {t("dashboard.addSale")}
          </button>
          <button
            onClick={loadDemo}
            disabled={busy === "demo"}
            className="inline-flex items-center gap-1.5 rounded-full bg-marigold/20 px-4 py-2.5 text-xs font-semibold text-shopfront hover:bg-marigold/30 disabled:opacity-50 active:scale-95"
          >
            <Sparkles className="h-4 w-4 text-marigold" />
            {busy === "demo" ? t("dashboard.loading") || "Loading…" : t("dashboard.loadDemo")}
          </button>
          <button
            onClick={exportCsv}
            disabled={busy === "export"}
            className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-shopfront px-4 py-2 text-xs font-semibold text-ink/70 ring-1 ring-black/5 dark:ring-white/5 hover:bg-paper-deep disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {t("dashboard.exportCsv")}
          </button>
          <button
            onClick={resetData}
            disabled={busy === "reset"}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-shopfront px-3 py-2 text-xs font-semibold text-terracotta ring-1 ring-terracotta/20 hover:bg-terracotta/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> {t("dashboard.resetData")}
          </button>
        </div>

        {/* stat tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Wallet} tone="leaf" label={t("dashboard.moneyToday")} value={money(s.moneyReceived)} />
          <Stat icon={TrendingUp} tone="marigold" label={t("dashboard.netProfitToday")} value={money(s.netProfit)} sub={`${t("dashboard.grossProfit")}: ${money(s.profit)}`} />
          <Stat icon={Receipt} tone="terracotta" label={t("dashboard.expensesToday")} value={money(s.expenses)} />
          <Stat icon={ShoppingBag} tone="shopfront" label={t("dashboard.orders")} value={s.orders || 0} />
        </div>

        <InsightsStrip data={data} t={t} money={money} />

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Today's Sales" value={money(data?.overview?.todaySales || 0)} icon={CircleDollarSign} tone="leaf" />
          <SummaryCard title="Monthly Sales" value={money(data?.overview?.monthlySales || 0)} icon={TrendingUp} tone="shopfront" />
          <SummaryCard title="Pending Credits" value={data?.overview?.pendingCredits || 0} icon={Receipt} tone="marigold" />
          <SummaryCard title="Received Payments" value={money(data?.overview?.receivedPayments || 0)} icon={Wallet} tone="terracotta" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card title="Financial Pulse" icon={BarChart3} accent={money(data?.overview?.outstandingAmount || 0)}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MiniStat label="Outstanding" value={money(data?.overview?.outstandingAmount || 0)} tone="terracotta" />
                <MiniStat label="Recent Transactions" value={data?.overview?.recentTransactions?.length || 0} tone="shopfront" />
              </div>
            </Card>

            <Card title="Recent Transactions" icon={Receipt}>
              <div className="space-y-2">
                {(data?.overview?.recentTransactions || []).length ? (
                  data.overview.recentTransactions.map((item) => (
                    <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between rounded-xl bg-paper px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        <p className="text-xs text-ink/50">{item.kind === "sale" ? "Sale" : item.kind === "payment" ? "Payment" : "Credit"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-shopfront">{money(item.amount)}</p>
                        <p className="text-xs text-ink/50">{new Date(item.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty>No recent transactions yet.</Empty>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Recent Notifications" icon={BellRing}>
              <div className="space-y-2">
                {(data?.overview?.recentNotifications || []).length ? (
                  data.overview.recentNotifications.map((item) => (
                    <div key={item.id} className="rounded-xl bg-paper px-3 py-3">
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-ink/60">{item.message}</p>
                    </div>
                  ))
                ) : (
                  <Empty>No notifications right now.</Empty>
                )}
              </div>
            </Card>

            <Card title="Upcoming Due Dates" icon={CalendarClock}>
              <div className="space-y-2">
                {(data?.overview?.upcomingDueDates || []).length ? (
                  data.overview.upcomingDueDates.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-paper px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.invoice_number}</p>
                        <p className="text-xs text-ink/50">{item.due_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-terracotta">{money(item.remaining)}</p>
                        <p className="text-xs text-ink/50">{item.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty>No upcoming dues.</Empty>
                )}
              </div>
            </Card>

            <Card title="Low Stock Alerts" icon={AlertCircle}>
              <div className="space-y-2">
                {(data?.overview?.lowStockAlerts || []).length ? (
                  data.overview.lowStockAlerts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-paper px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-ink/50">{item.unit}</p>
                      </div>
                      <span className="rounded-full bg-terracotta/10 px-2.5 py-1 text-xs font-semibold text-terracotta">{item.stock_qty} left</span>
                    </div>
                  ))
                ) : (
                  <Empty>All stock levels look healthy.</Empty>
                )}
              </div>
            </Card>
          </div>
        </div>

        {data?.bestSeller && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-marigold/10 px-4 py-3 text-sm text-shopfront ring-1 ring-marigold/20">
            <Star className="h-4 w-4 shrink-0 text-marigold" />
            <span className="font-semibold capitalize">{data.bestSeller.topSeller.item}</span>
            <span className="text-ink/60">{t("dashboard.bestSeller")}</span>
            {data.bestSeller.topProfit && (
              <span className="lg:ml-auto w-full lg:w-auto text-xs lg:text-sm text-ink/60">
                {t("dashboard.mostProfit")}: <span className="font-semibold capitalize text-shopfront">{data.bestSeller.topProfit.item}</span> ({money(data.bestSeller.topProfit.profit)})
              </span>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* left: trend */}
          <div className="lg:col-span-2 space-y-6">
            <Card title={t("dashboard.trend")}>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(27,58,75,0.08)" />
                    <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: "#22201c99" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(245,166,35,0.08)" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(27,58,75,0.1)", fontSize: 12 }}
                      formatter={(v, n) => [money(v), n === "revenue" ? t("dashboard.revenueChart") : t("dashboard.profitChart")]}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={38}>
                      {trend.map((d, i) => (
                        <Cell key={i} fill={d.revenue >= maxRev ? "#F5A623" : "#1B3A4B"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* right: shortcuts */}
          <div className="space-y-6">
            <Card title="Quick Actions">
               <div className="flex flex-col gap-3">
                 <Link to="/app/sales" className="flex items-center justify-between rounded-xl bg-black/5 px-4 py-3 hover:bg-black/10 transition-colors">
                   <div className="flex items-center gap-3">
                     <ShoppingBag className="h-5 w-5 text-shopfront" />
                     <span className="font-semibold text-sm">View Sales</span>
                   </div>
                 </Link>
                 <Link to="/app/inventory" className="flex items-center justify-between rounded-xl bg-black/5 px-4 py-3 hover:bg-black/10 transition-colors">
                   <div className="flex items-center gap-3">
                     <Package className="h-5 w-5 text-shopfront" />
                     <span className="font-semibold text-sm">Manage Inventory</span>
                   </div>
                 </Link>
                 <Link to="/app/udhaar" className="flex items-center justify-between rounded-xl bg-black/5 px-4 py-3 hover:bg-black/10 transition-colors">
                   <div className="flex items-center gap-3">
                     <Users className="h-5 w-5 text-shopfront" />
                     <span className="font-semibold text-sm">Collect Udhaar</span>
                   </div>
                 </Link>
               </div>
            </Card>
          </div>
        </div>
      
      <AnimatePresence>
        {showAddSale && (
          <AddSaleModal
            onClose={() => setShowAddSale(false)}
            onSubmit={submitSale}
            t={t}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

/* A small strip of plain-language observations derived from the live data —
   the kind of thing the shopkeeper would want a friend to point out. */
export function InsightsStrip({ data, t, money }) {
  if (!data) return null;
  const s = data.summary || {};
  const insights = [];

  const lowItems = (data.inventory || []).filter((p) => p.stock_qty <= 5);
  if (lowItems.length) {
    insights.push({
      tone: "terracotta",
      icon: "⚠️",
      text: t("dashboard.insightLowStock", { count: lowItems.length, items: lowItems.slice(0, 3).map((p) => p.name).join(", ") }),
    });
  }
  if ((data.dues?.total || 0) > 0) {
    insights.push({
      tone: "shopfront",
      icon: "🧾",
      text: t("dashboard.insightDues", { amount: money(data.dues.total), count: data.dues.customers.length }),
    });
  }
  if (s.netProfit < 0) {
    insights.push({ tone: "terracotta", icon: "📉", text: t("dashboard.insightLoss", { expenses: money(s.expenses) }) });
  } else if (s.orders > 0) {
    insights.push({ tone: "leaf", icon: "📈", text: t("dashboard.insightProfit", { profit: money(s.netProfit) }) });
  }
  if (data.bestSeller?.topSeller?.item && s.orders > 0) {
    insights.push({ tone: "marigold", icon: "⭐", text: t("dashboard.insightBest", { item: data.bestSeller.topSeller.item }) });
  }

  if (!insights.length) return null;
  const tones = {
    leaf: "bg-leaf/10 text-leaf ring-leaf/20",
    marigold: "bg-marigold/10 text-shopfront ring-marigold/25",
    shopfront: "bg-shopfront/8 text-shopfront ring-shopfront/15",
    terracotta: "bg-terracotta/10 text-terracotta ring-terracotta/20",
  };
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {insights.map((ins, i) => (
        <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${tones[ins.tone]}`}>
          <span>{ins.icon}</span> {ins.text}
        </span>
      ))}
    </div>
  );
}

export function AddSaleModal({ onClose, onSubmit, t, defaultPaymentType = "cash" }) {
  const [form, setForm] = useState({ item: "", qty: "1", amount: "", unit: "unit", payment_type: defaultPaymentType, party_name: "" });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setForm((f) => ({ ...f, party_name: customer ? customer.name : "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.item.trim() || !(Number(form.amount) > 0)) {
      setError(t("dashboard.saleValidation") || "Enter an item and a positive amount");
      return;
    }
    if (form.payment_type === "udhaar" && !form.party_name.trim()) {
      setError(t("dashboard.saleNeedCustomer") || "Enter a customer name for udhaar");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        item: form.item.trim(),
        qty: Number(form.qty) || 1,
        amount: Number(form.amount),
        unit: form.unit.trim() || "unit",
        payment_type: form.payment_type,
        party_name: form.payment_type === "udhaar" ? form.party_name.trim() : undefined,
        customer_id: form.payment_type === "udhaar" ? selectedCustomer?.id : undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-shopfront p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-shopfront">{t("dashboard.addSale")}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink rounded-full p-1.5 hover:bg-paper transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="ds-input" placeholder={t("dashboard.item")} value={form.item} onChange={set("item")} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <input className="ds-input" type="number" min="0" step="0.1" placeholder={t("dashboard.qty")} value={form.qty} onChange={set("qty")} />
            <input className="ds-input" type="number" min="0" placeholder={"₹ " + t("dashboard.amount")} value={form.amount} onChange={set("amount")} />
          </div>
          <div className="flex gap-2">
            {["cash", "udhaar"].map((pt) => (
              <button
                type="button"
                key={pt}
                onClick={() => setForm((f) => ({ ...f, payment_type: pt }))}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium ${form.payment_type === pt ? (pt === "udhaar" ? "bg-terracotta/15 text-terracotta ring-1 ring-terracotta/30" : "bg-leaf/15 text-leaf ring-1 ring-leaf/30") : "bg-paper text-ink/50"}`}
              >
                {pt === "udhaar" ? t("dashboard.udhaar") : t("dashboard.cash")}
              </button>
            ))}
          </div>
          {form.payment_type === "udhaar" && (
            <CustomerSearchSelector
              selectedCustomer={selectedCustomer}
              onSelect={handleSelectCustomer}
              t={t}
            />
          )}
          {error && <p className="rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-full bg-marigold px-6 py-3 text-sm font-semibold text-shopfront disabled:opacity-50 active:scale-[0.98] transition-transform">
            {busy ? t("dashboard.saving") || "Saving…" : t("dashboard.addSale")}
          </button>
        </form>
        <style>{`.ds-input{width:100%;border-radius:0.6rem;border:1px solid rgba(27,58,75,0.15);padding:0.65rem 0.75rem;font-size:0.9rem;outline:none}.ds-input:focus{border-color:var(--color-marigold);box-shadow:0 0 0 3px rgba(245,166,35,0.2)}`}</style>
      </div>
    </div>
  );
}

export function SummaryCard({ title, value, icon: Icon, tone }) {
  const tones = {
    leaf: "bg-leaf/10 text-leaf",
    marigold: "bg-marigold/15 text-marigold",
    shopfront: "bg-shopfront/10 text-shopfront",
    terracotta: "bg-terracotta/10 text-terracotta",
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
      <div className={`inline-grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-shopfront">{value}</p>
    </div>
  );
}

export function MiniStat({ label, value, tone }) {
  const tones = {
    terracotta: "bg-terracotta/10 text-terracotta",
    shopfront: "bg-shopfront/10 text-shopfront",
  };
  return (
    <div className={`rounded-2xl px-3 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function Stat({ icon: Icon, label, value, sub, tone }) {
  const tones = {
    leaf: "bg-leaf/10 text-leaf",
    marigold: "bg-marigold/15 text-marigold",
    shopfront: "bg-shopfront/10 text-shopfront",
    terracotta: "bg-terracotta/10 text-terracotta",
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-shopfront p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5 dark:ring-white/5">
      <div className={`inline-grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-shopfront">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/50">{sub}</p>}
    </div>
  );
}

export function Card({ title, icon: Icon, accent, children }) {
  return (
    <section className="rounded-2xl bg-white dark:bg-shopfront p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5 dark:ring-white/5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wide text-shopfront">
          {Icon && <Icon className="h-4 w-4 text-terracotta" />} {title}
        </h2>
        {accent && <span className="font-display text-lg font-semibold text-terracotta">{accent}</span>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="rounded-lg bg-paper px-3 py-6 text-center text-sm text-ink/50">{children}</p>;
}
