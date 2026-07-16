import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Users, Phone, MapPin, Landmark, Info, Edit, Trash2, BookOpen, Printer, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { api } from "../lib/api";

export default function CustomerDetailsPage() {
  const { id } = useParams(); // customer id from URL
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch customer ledger detail
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const detail = await api.getLedgerDetail(id);
        setCustomer(detail.customer);
        setBills(detail.bills || []);
        setPayments(detail.payments || []);
        // fetch reminder history and filter for this customer
        const reminderRes = await api.getReminderHistory();
        const custReminders = reminderRes.history.filter(r => r.customer_id === Number(id));
        setReminders(custReminders);
      } catch (err) {
        setError(err.message || "Failed to load customer details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  // Compute stats
  const totalBillsAmount = useMemo(() => bills.reduce((s, b) => s + (b.amount || 0), 0), [bills]);
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + (p.amount || 0), 0), [payments]);
  const outstanding = totalBillsAmount - totalPaid;

  // Monthly purchases (last 30 days)
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);
  const monthlyPurchases = useMemo(() => {
    return bills.filter(b => new Date(b.created_at) >= monthStart).length;
  }, [bills, monthStart]);

  const totalBills = bills.length;
  const lastReminder = reminders.length ? reminders[reminders.length - 1] : null;

  const handleDelete = async () => {
    if (!window.confirm("Delete this customer permanently?")) return;
    try {
      await api.deleteCustomer(id);
      navigate("/app/ledger");
    } catch (e) {
      alert(e.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="grid h-64 place-items-center text-ink/50">Loading customer details…</div>;
  }
  if (error) {
    return <div className="rounded-xl bg-terracotta/10 p-4 text-sm text-terracotta">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <h1 className="font-display text-2xl font-bold text-shopfront">Customer Details</h1>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink/75 ring-1 ring-black/5 hover:bg-paper-deep transition-all">
            <Printer className="h-3.5 w-3.5" /> Print Details
          </button>
          <Link to={`/app/ledger/${customer.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-3 py-1.5 text-xs font-semibold text-paper hover:bg-shopfront-700 transition-all">
            View Ledger
          </Link>
        </div>
      </div>

      {/* Customer Summary Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-black/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-black/5 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-shopfront capitalize flex items-center gap-2">
              {customer.name}
            </h2>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink/60">
              {customer.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-ink/30" /> {customer.phone}
                </span>
              )}
              {customer.upi_id && (
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-ink/30" /> UPI: {customer.upi_id}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5 sm:col-span-2">
                  <MapPin className="h-3.5 w-3.5 text-ink/30" /> {customer.address}
                </span>
              )}
              {customer.notes && (
                <span className="flex items-center gap-1.5 sm:col-span-2 italic">
                  <Info className="h-3.5 w-3.5 text-ink/30" /> Notes: {customer.notes}
                </span>
              )}
            </div>
          </div>
          {/* Current Balance */}
          <div className="rounded-xl bg-paper p-4 text-right ring-1 ring-black/5 shrink-0 self-start md:self-auto min-w-[140px]">
            <span className="text-[10px] uppercase tracking-wider text-ink/50 block font-semibold">Outstanding Balance</span>
            <span className={`font-display text-2xl font-bold ${outstanding > 0 ? "text-terracotta" : "text-leaf"}`}>{customer.money ? customer.money(outstanding) : `$${outstanding.toFixed(2)}`}</span>
          </div>
        </div>
        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-paper px-3 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-ink/40 block font-medium">Total Credit</span>
            <span className="font-semibold text-shopfront text-base">{customer.money ? customer.money(totalBillsAmount) : `$${totalBillsAmount.toFixed(2)}`}</span>
          </div>
          <div className="rounded-xl bg-paper px-3 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-ink/40 block font-medium">Total Repaid</span>
            <span className="font-semibold text-leaf text-base">{customer.money ? customer.money(totalPaid) : `$${totalPaid.toFixed(2)}`}</span>
          </div>
          <div className="rounded-xl bg-paper px-3 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-ink/40 block font-medium">Total Bills</span>
            <span className="font-semibold text-shopfront text-base">{totalBills}</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-black/5 no-print">
        <button onClick={() => {/* placeholder edit */}} className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-3 py-1.5 text-xs font-semibold text-paper hover:bg-shopfront-700 transition-all">
          <Edit className="h-3.5 w-3.5" /> Edit Customer
        </button>
        <button onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-600 px-3 py-1.5 text-xs font-semibold text-paper hover:bg-terracotta-700 transition-all">
          <Trash2 className="h-3.5 w-3.5" /> Delete Customer
        </button>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        <h3 className="font-semibold text-shopfront text-sm mb-4">Udhaar Bill History</h3>
        {bills.length ? (
          <ul className="space-y-2">
            {bills.map(b => (
              <li key={b.id} className="flex justify-between items-center p-2 bg-paper rounded">
                <div>
                  <span className="font-medium">{b.item_text}</span> • {new Date(b.created_at).toLocaleDateString()}
                </div>
                <span className="text-terracotta font-bold">+{customer.money ? customer.money(b.amount) : `$${b.amount.toFixed(2)}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-4 text-center text-sm text-ink/40">No Udhaar bills.</div>
        )}
      </div>

      {/* Payment History */}
      <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        <h3 className="font-semibold text-shopfront text-sm mb-4">Payment History</h3>
        {payments.length ? (
          <ul className="space-y-2">
            {payments.map(p => (
              <li key={p.id} className="flex justify-between items-center p-2 bg-paper rounded">
                <div>{new Date(p.created_at).toLocaleDateString()}</div>
                <span className="text-leaf font-bold">-{customer.money ? customer.money(p.amount) : `$${p.amount.toFixed(2)}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-4 text-center text-sm text-ink/40">No payments recorded.</div>
        )}
      </div>

      {/* Reminder Info */}
      <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        <h3 className="font-semibold text-shopfront text-sm mb-4">Last Reminder Sent</h3>
        {lastReminder ? (
          <div className="text-sm">{new Date(lastReminder.created_at).toLocaleString()} via {lastReminder.sent_via}</div>
        ) : (
          <div className="text-sm text-ink/40">No reminder sent yet.</div>
        )}
      </div>
    </div>
  );
}
