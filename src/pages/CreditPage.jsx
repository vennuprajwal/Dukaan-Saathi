import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, ReceiptText, CalendarDays, CheckCircle2, AlertTriangle, FileText, TrendingUp } from "lucide-react";
import { api } from "../lib/api";

export default function CreditPage() {
  const { t } = useOutletContext();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    buyer_shop_id: "",
    seller_shop_id: "",
    invoice_number: "",
    product_list: "",
    quantity: "1",
    price: "",
    total_amount: "",
    due_date: "",
  });

  const loadInvoices = async () => {
    try {
      const res = await api.listCreditInvoices();
      setInvoices(res.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const submitInvoice = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        invoice_number: form.invoice_number || `INV-${Date.now()}`,
        buyer_shop_id: Number(form.buyer_shop_id),
        seller_shop_id: Number(form.seller_shop_id),
        product_list: form.product_list.split("\n").filter(Boolean),
        quantity: Number(form.quantity || 1),
        price: Number(form.price || 0),
        total_amount: Number(form.total_amount || Number(form.quantity || 1) * Number(form.price || 0)),
        due_date: form.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      };
      await api.createCreditInvoice(payload);
      setForm({ buyer_shop_id: "", seller_shop_id: "", invoice_number: "", product_list: "", quantity: "1", price: "", total_amount: "", due_date: "" });
      await loadInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const summary = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const pending = invoices.filter((inv) => inv.status === "Pending").length;
    return { total, pending };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-shopfront">Business Credit</h1>
          <p className="mt-1 text-sm text-ink/60">Create credit invoices for purchases, track payment status, and manage due dates.</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-black/5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Open Receivables</p>
          <p className="font-display text-xl font-semibold text-shopfront">₹{summary.total.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
          <div className="mb-4 flex items-center gap-2 text-shopfront">
            <ReceiptText className="h-5 w-5" />
            <h2 className="font-semibold">Create Credit Invoice</h2>
          </div>
          <form onSubmit={submitInvoice} className="space-y-3">
            <input className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" placeholder="Invoice Number" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" placeholder="Buyer Shop ID" value={form.buyer_shop_id} onChange={(e) => setForm({ ...form, buyer_shop_id: e.target.value })} />
              <input className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" placeholder="Seller Shop ID" value={form.seller_shop_id} onChange={(e) => setForm({ ...form, seller_shop_id: e.target.value })} />
            </div>
            <textarea className="min-h-24 w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" placeholder="Product list (one per line)" value={form.product_list} onChange={(e) => setForm({ ...form, product_list: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <input className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <input className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <input className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" placeholder="Total Amount" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
            </div>
            <input type="date" className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-shopfront px-4 py-2.5 text-sm font-semibold text-paper">
              <Plus className="h-4 w-4" /> Create Invoice
            </button>
          </form>
          {error && <p className="mt-3 rounded-xl bg-terracotta/10 px-3 py-2 text-sm text-terracotta">{error}</p>}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
          <div className="mb-4 flex items-center gap-2 text-shopfront">
            <TrendingUp className="h-5 w-5" />
            <h2 className="font-semibold">Overview</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl bg-paper p-4">
              <p className="text-xs uppercase tracking-wide text-ink/50">Pending</p>
              <p className="mt-1 font-display text-2xl font-semibold text-shopfront">{summary.pending}</p>
            </div>
            <div className="rounded-xl bg-paper p-4">
              <p className="text-xs uppercase tracking-wide text-ink/50">Invoices</p>
              <p className="mt-1 font-display text-2xl font-semibold text-shopfront">{invoices.length}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        <div className="mb-4 flex items-center gap-2 text-shopfront">
          <FileText className="h-5 w-5" />
          <h2 className="font-semibold">Invoice List</h2>
        </div>
        {loading ? (
          <p className="text-sm text-ink/60">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-ink/60">No credit invoices yet.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-black/5 bg-paper p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-shopfront">{invoice.invoice_number}</p>
                    <p className="text-sm text-ink/60">Buyer: {invoice.buyer_name || invoice.buyer_shop_id} • Seller: {invoice.seller_name || invoice.seller_shop_id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status === "Pending" ? "bg-marigold/20 text-shopfront" : invoice.status === "Overdue" ? "bg-terracotta/10 text-terracotta" : invoice.status === "Partially Paid" ? "bg-leaf/10 text-leaf" : "bg-shopfront/10 text-shopfront"}`}>
                      {invoice.status}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink/60">
                      <CalendarDays className="mr-1 inline h-3.5 w-3.5" /> {invoice.due_date}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-ink/70">
                  <span>Amount: ₹{Number(invoice.total_amount || 0).toLocaleString("en-IN")}</span>
                  <span>Paid: ₹{Number(invoice.paid_amount || 0).toLocaleString("en-IN")}</span>
                  <span>{invoice.product_list ? JSON.parse(invoice.product_list).join(", ") : "No products listed"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
