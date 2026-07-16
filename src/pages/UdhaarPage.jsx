import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Users, Plus, Landmark, QrCode, Copy, Check, X, Send, History, MessageSquare, PhoneCall } from "lucide-react";
import { Card, Empty, AddSaleModal } from "./DashboardPage";
import { api } from "../lib/api";

export default function UdhaarPage() {
  const { data, load, money, t } = useOutletContext();
  const [showAddSale, setShowAddSale] = useState(false);
  const [activeUpiCustomer, setActiveUpiCustomer] = useState(null);
  const [showReminders, setShowReminders] = useState(false);

  const submitSale = async (sale) => {
    await api.addSale(sale);
    setShowAddSale(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h1 className="font-display text-2xl font-bold text-shopfront">Udhaar Khata</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReminders(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-xs font-semibold text-ink/75 ring-1 ring-black/5 hover:bg-paper-deep transition-all"
          >
            <Send className="h-3.5 w-3.5 text-marigold" /> Send Reminders
          </button>
          <button
            onClick={() => setShowAddSale(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-4 py-2 text-xs font-semibold text-paper hover:-translate-y-0.5 transition-transform"
          >
            <Plus className="h-4 w-4" /> Create Udhaar Bill
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={t("dashboard.pendingUdhaar")} icon={Users} accent={money(data?.dues?.total || 0)}>
            {data?.dues?.customers?.length ? (
              <ul className="space-y-2">
                {data.dues.customers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 rounded-xl bg-paper px-4 py-3 hover:bg-black/5 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-shopfront capitalize text-base">{c.name}</span>
                      <span className="text-xs text-ink/60 mt-0.5">Customer since {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-ink/50 uppercase tracking-wide">Due</span>
                        <span className="text-lg font-bold text-terracotta">{money(c.outstanding)}</span>
                      </div>
                      <button 
                        onClick={() => setActiveUpiCustomer(c)} 
                        className="rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-leaf/90 hover:shadow transition-all"
                      >
                        Pay via UPI
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{t("dashboard.noDues")}</Empty>
            )}
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card title="Summary">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-4 border-b border-black/5">
                <span className="text-ink/60">Total Outstanding</span>
                <span className="font-bold text-lg text-terracotta">{money(data?.dues?.total || 0)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-black/5">
                <span className="text-ink/60">Customers in Debt</span>
                <span className="font-bold text-lg text-shopfront">{data?.dues?.customers?.length || 0}</span>
              </div>
              <p className="text-xs text-ink/50 leading-relaxed mt-2">
                * Collecting Udhaar faster improves your Dukaan Saathi health score and increases your working capital.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {showAddSale && (
        <AddSaleModal
          onClose={() => setShowAddSale(false)}
          onSubmit={submitSale}
          t={t}
          defaultPaymentType="udhaar"
        />
      )}

      {activeUpiCustomer && (
        <UpiPaymentModal
          customer={activeUpiCustomer}
          onClose={() => setActiveUpiCustomer(null)}
          onConfirm={() => load()}
          money={money}
        />
      )}

      {showReminders && (
        <SendRemindersModal
          data={data}
          load={load}
          money={money}
          onClose={() => setShowReminders(false)}
        />
      )}
    </div>
  );
}

function UpiPaymentModal({ customer, onClose, onConfirm, money }) {
  const [upiId, setUpiId] = useState(customer.upi_id || "");
  const [amount, setAmount] = useState(String(customer.outstanding || ""));
  const [step, setStep] = useState(customer.upi_id ? "qr" : "details"); // details | qr | success
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txnRef, setTxnRef] = useState("");

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!upiId.trim()) {
      setError("Please enter a valid UPI ID");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a positive amount");
      return;
    }
    setError("");
    setStep("qr");
  };

  const upiLink = useMemo(() => {
    if (!upiId) return "";
    return `upi://pay?pa=${upiId.trim()}&pn=${encodeURIComponent(customer.name)}&am=${amount}&cu=INR&tn=Dukaan-Saathi`;
  }, [upiId, amount, customer.name]);

  const qrCodeUrl = useMemo(() => {
    if (!upiLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
  }, [upiLink]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const generatedRef = "UPI-TXN-" + Date.now().toString().slice(-6);
      setTxnRef(generatedRef);
      await api.collect(customer.id, Number(amount), "UPI", generatedRef, upiId.trim());
      onConfirm();
      setStep("success");
    } catch (err) {
      setError(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-black/5 pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-shopfront">UPI Repayment</h3>
            <span className="text-xs text-ink/40">Collect dues digitally</span>
          </div>
          {step !== "success" && (
            <button 
              onClick={onClose} 
              className="text-ink/40 hover:text-ink rounded-full bg-paper p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-terracotta/10 p-3 text-xs font-semibold text-terracotta">
            {error}
          </div>
        )}

        {/* Step 1: Input details (if no saved UPI ID) */}
        {step === "details" && (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/50 mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                disabled
                value={customer.name}
                className="w-full rounded-xl border border-black/10 bg-black/[0.02] px-4 py-2.5 text-sm capitalize outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/50 mb-1.5">
                Customer UPI ID (VPA)
              </label>
              <input
                type="text"
                placeholder="example@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/50 mb-1.5">
                Amount to Collect (₹)
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20 transition-all"
                required
              />
              <span className="mt-1 block text-[10px] text-ink/40 font-semibold text-terracotta">
                Outstanding Balance: {money(customer.outstanding)}
              </span>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-shopfront py-2.5 text-sm font-semibold text-paper hover:bg-shopfront-700 transition-colors mt-2"
            >
              Generate Payment QR Code
            </button>
          </form>
        )}

        {/* Step 2: Show QR Code & Payment link */}
        {step === "qr" && (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center justify-center p-4 bg-paper rounded-2xl border border-black/5">
              <img 
                src={qrCodeUrl} 
                alt="UPI Payment QR Code" 
                className="h-48 w-48 object-contain rounded-lg shadow-sm"
              />
              <span className="text-[10px] text-ink/40 mt-2 italic">
                Scan using any UPI app (GPay, PhonePe, Paytm, BHIM)
              </span>
            </div>

            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center rounded-xl bg-paper px-4 py-2.5 border border-black/5">
                <div className="overflow-hidden mr-2">
                  <span className="text-[10px] uppercase text-ink/40 font-mono block">UPI VPA</span>
                  <span className="text-xs font-bold text-shopfront truncate block">{upiId}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase text-ink/40 font-mono block">Amount</span>
                  <span className="text-xs font-bold text-terracotta block">{money(amount)}</span>
                </div>
              </div>

              {/* Action options */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-paper py-2 text-xs font-semibold text-ink/75 ring-1 ring-black/5 hover:bg-paper-deep transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy UPI Link"}
                </button>
                {!customer.upi_id && (
                  <button
                    onClick={() => setStep("details")}
                    className="inline-flex items-center justify-center rounded-xl bg-paper px-3 py-2 text-xs font-semibold text-ink/75 ring-1 ring-black/5 hover:bg-paper-deep transition-all"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-black/5">
              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-leaf py-3 text-sm font-semibold text-white shadow-sm hover:bg-leaf/90 transition-colors"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirm Payment Received
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === "success" && (
          <div className="space-y-4 text-center py-6">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf/10 text-leaf">
              <Check className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold text-shopfront">Repayment Successful!</h4>
              <p className="text-xs text-ink/50">The payment details have been saved to the ledger.</p>
            </div>

            <div className="rounded-xl bg-paper p-4 border border-black/5 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-ink/40">Customer</span>
                <span className="font-semibold text-shopfront capitalize">{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/40">Amount Paid</span>
                <span className="font-semibold text-leaf">{money(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/40">Payment Type</span>
                <span className="font-semibold text-shopfront">UPI</span>
              </div>
              {txnRef && (
                <div className="flex justify-between">
                  <span className="text-ink/40">Transaction Ref</span>
                  <span className="font-mono text-shopfront font-semibold">{txnRef}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-full bg-shopfront py-2.5 text-sm font-semibold text-paper"
            >
              Back to Udhaar Khata
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function SendRemindersModal({ data, load, money, onClose }) {
  const [shopUpiId, setShopUpiId] = useState(data?.shop?.upi_id || "");
  const [activeTab, setActiveTab] = useState("send"); // send | history
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewId, setPreviewId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const pendingCustomers = useMemo(() => {
    return (data?.dues?.customers || []).filter(c => c.outstanding > 0);
  }, [data]);

  // Select all by default on open
  useEffect(() => {
    if (pendingCustomers.length > 0) {
      setSelectedIds(new Set(pendingCustomers.map(c => c.id)));
    }
  }, [pendingCustomers]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getReminderHistory();
      setHistory(res.history || []);
    } catch (err) {
      console.error("Failed to load reminder history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  const generateMessage = (customerName, amount) => {
    return `Hello ${customerName},

Thank you for shopping with ${data?.shop?.name || "our shop"}.

Your pending Udhaar balance is ₹${amount}.

Please complete your payment using our UPI ID:
${shopUpiId || "[Shop UPI ID]"}

Thank you.`;
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(pendingCustomers.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSendSingle = async (customer, channel) => {
    const text = generateMessage(customer.name, customer.outstanding);
    const encText = encodeURIComponent(text);
    
    // Open message client
    if (channel === "whatsapp") {
      window.open(`https://wa.me/${customer.phone}?text=${encText}`, "_blank");
    } else {
      window.open(`sms:${customer.phone}?body=${encText}`, "_blank");
    }

    try {
      await api.sendReminder({
        customer_id: customer.id,
        message: text,
        amount: customer.outstanding,
        sent_via: channel,
        shop_upi_id: shopUpiId
      });
      load(); // refresh main context shop upi if changed
    } catch (err) {
      console.error("Failed to save single reminder log:", err);
    }
  };

  const handleSendBulk = async (channel) => {
    if (selectedIds.size === 0) return;
    setSending(true);
    setSuccessMsg("");
    
    const selectedCustomers = pendingCustomers.filter(c => selectedIds.has(c.id));
    
    // Auto launch one-by-one window tabs for the shop owner to click send (integration-ready click triggers)
    selectedCustomers.forEach(customer => {
      const text = generateMessage(customer.name, customer.outstanding);
      const encText = encodeURIComponent(text);
      if (channel === "whatsapp") {
        window.open(`https://wa.me/${customer.phone}?text=${encText}`, "_blank");
      } else {
        window.open(`sms:${customer.phone}?body=${encText}`, "_blank");
      }
    });

    try {
      const payload = selectedCustomers.map(c => ({
        customer_id: c.id,
        message: generateMessage(c.name, c.outstanding),
        amount: c.outstanding,
        sent_via: channel
      }));

      await api.sendBulkReminders({
        reminders: payload,
        shop_upi_id: shopUpiId
      });

      setSuccessMsg(`Successfully logged ${selectedCustomers.length} month-end reminders in history!`);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      console.error("Failed to save batch reminder logs:", err);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-black/5 pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-shopfront flex items-center gap-1.5">
              <Send className="h-5 w-5 text-marigold" />
              Month-End Payment Reminders
            </h3>
            <p className="text-xs text-ink/40">Identify debtors and trigger automated payment alerts via WhatsApp or SMS.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-ink/40 hover:text-ink rounded-full bg-paper p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Configuration Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-paper p-4 rounded-xl border border-black/5 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Shop UPI ID (used in messages)
            </label>
            <input
              type="text"
              placeholder="e.g. shopname@upi"
              value={shopUpiId}
              onChange={(e) => setShopUpiId(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-marigold transition-all"
            />
          </div>
          <div className="flex items-end justify-start md:justify-end gap-2 mt-2 md:mt-0">
            <button
              onClick={() => setActiveTab("send")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                activeTab === "send" 
                  ? "bg-shopfront text-white shadow-md shadow-shopfront/10" 
                  : "bg-white text-ink/75 border border-black/5 hover:bg-black/5"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
              Send Reminders
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                activeTab === "history" 
                  ? "bg-shopfront text-white shadow-md shadow-shopfront/10" 
                  : "bg-white text-ink/75 border border-black/5 hover:bg-black/5"
              }`}
            >
              <History className="h-3.5 w-3.5 inline mr-1" />
              Reminder History
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 rounded-xl bg-leaf/10 p-3 text-xs font-semibold text-leaf">
            {successMsg}
          </div>
        )}

        {/* Tab 1: Send Reminders Grid list */}
        {activeTab === "send" && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto rounded-xl border border-black/5 mb-4 custom-scrollbar">
              {pendingCustomers.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-black/5 bg-paper text-xs text-ink/50 uppercase font-semibold">
                      <th className="py-2.5 px-4 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pendingCustomers.length && pendingCustomers.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded text-marigold focus:ring-marigold"
                        />
                      </th>
                      <th className="py-2.5 px-2">Customer</th>
                      <th className="py-2.5 px-2">Phone</th>
                      <th className="py-2.5 px-2 text-right">Outstanding</th>
                      <th className="py-2.5 px-4 text-center w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCustomers.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <tr key={c.id} className="border-b border-black/5 hover:bg-black/[0.01] transition-colors">
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(c.id)}
                              className="rounded text-marigold focus:ring-marigold"
                            />
                          </td>
                          <td className="py-3 px-2 font-semibold capitalize text-shopfront">{c.name}</td>
                          <td className="py-3 px-2 text-xs font-mono text-ink/60">{c.phone || "No phone"}</td>
                          <td className="py-3 px-2 text-right font-bold text-terracotta">{money(c.outstanding)}</td>
                          <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                            <button
                              onClick={() => setPreviewId(previewId === c.id ? null : c.id)}
                              className="px-2 py-1 text-[10px] font-bold bg-paper rounded text-ink/60 hover:bg-paper-deep hover:text-ink transition-colors"
                            >
                              {previewId === c.id ? "Close Prev" : "Preview"}
                            </button>
                            <button
                              onClick={() => handleSendSingle(c, "whatsapp")}
                              disabled={!c.phone}
                              className="p-1.5 rounded-full bg-leaf/10 text-leaf hover:bg-leaf hover:text-white transition-colors"
                              title="Send via WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSendSingle(c, "sms")}
                              disabled={!c.phone}
                              className="p-1.5 rounded-full bg-shopfront/10 text-shopfront hover:bg-shopfront hover:text-white transition-colors"
                              title="Send via SMS"
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-ink/40">No pending debtors found for month-end payments.</div>
              )}
            </div>

            {/* Preview Box details */}
            {previewId && (
              <div className="p-4 bg-paper rounded-xl border border-black/5 mb-4 max-h-[150px] overflow-y-auto">
                <span className="text-[10px] uppercase font-bold text-marigold tracking-wider block mb-2">Live Template Preview</span>
                <pre className="text-xs font-mono text-ink/80 whitespace-pre-wrap leading-relaxed">
                  {generateMessage(
                    pendingCustomers.find(c => c.id === previewId)?.name || "Customer",
                    pendingCustomers.find(c => c.id === previewId)?.outstanding || "0"
                  )}
                </pre>
              </div>
            )}

            {/* Bulk send footer */}
            <div className="flex items-center justify-between border-t border-black/5 pt-4">
              <span className="text-xs text-ink/50">
                Selected: <strong>{selectedIds.size}</strong> of {pendingCustomers.length} customers
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSendBulk("sms")}
                  disabled={selectedIds.size === 0 || sending}
                  className="px-4 py-2 bg-paper text-xs font-semibold rounded-full ring-1 ring-black/5 hover:bg-paper-deep transition-all"
                >
                  Bulk SMS Selected
                </button>
                <button
                  onClick={() => handleSendBulk("whatsapp")}
                  disabled={selectedIds.size === 0 || sending}
                  className="px-4 py-2 bg-shopfront text-white text-xs font-semibold rounded-full hover:bg-shopfront-700 transition-all flex items-center gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  Bulk WhatsApp Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Reminder History Logs */}
        {activeTab === "history" && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto rounded-xl border border-black/5 custom-scrollbar">
              {loadingHistory ? (
                <div className="py-12 text-center text-ink/40">Loading log history…</div>
              ) : history.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-black/5 bg-paper text-xs text-ink/50 uppercase font-semibold">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-2">Customer</th>
                      <th className="py-2.5 px-2 text-right">Amount</th>
                      <th className="py-2.5 px-2 text-center w-24">Channel</th>
                      <th className="py-2.5 px-4">Message Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((log) => (
                      <tr key={log.id} className="border-b border-black/5 hover:bg-black/[0.01] transition-colors text-xs">
                        <td className="py-2.5 px-4 font-mono text-ink/50">{formatDate(log.created_at)}</td>
                        <td className="py-2.5 px-2 font-semibold capitalize text-shopfront">{log.customer_name}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-terracotta">{money(log.amount)}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.sent_via === 'whatsapp' ? 'bg-leaf/10 text-leaf' : 'bg-shopfront/10 text-shopfront'
                          }`}>
                            {log.sent_via.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 truncate max-w-xs text-ink/60" title={log.message}>
                          {log.message.replace(/\n+/g, " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-ink/40">No sent reminder history found in database logs.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
