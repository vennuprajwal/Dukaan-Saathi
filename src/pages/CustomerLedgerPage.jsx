import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Search, Printer, Download, 
  ChevronRight, Info, Eye, BookOpen, Phone, 
  MapPin, Landmark, ArrowUpRight, ArrowDownLeft 
} from "lucide-react";
import { api } from "../lib/api";
import AutoPayReminderModal from "../components/AutoPayReminderModal";

export default function CustomerLedgerPage() {
  const { data, money } = useOutletContext();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Additional filter and sort controls
  const [filterStatus, setFilterStatus] = useState("all"); // all | pending | paid
  const [sortKey, setSortKey] = useState("name"); // name | outstanding | lastPurchase | totalBills
  
  // Selected Customer Details
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Active Bill Details Modal
  const [activeBill, setActiveBill] = useState(null);

  const fetchLedgerList = async () => {
    setLoading(true);
    try {
      const res = await api.getLedgerList();
      setCustomers(res.ledger || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load customer list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerList();
  }, []);

  // Fetch detail when selected customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomerDetail(null);
      setBills([]);
      setPayments([]);
      return;
    }

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.getLedgerDetail(selectedCustomerId);
        setSelectedCustomerDetail(res.customer);
        setBills(res.bills || []);
        setPayments(res.payments || []);
      } catch (err) {
        console.error("Failed to load customer ledger details:", err);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [selectedCustomerId]);

  // Combine bills and payments chronologically
  const timeline = useMemo(() => {
    const combined = [];
    
    bills.forEach(b => {
      combined.push({
        type: "bill",
        id: `bill-${b.id}`,
        rawId: b.id,
        date: new Date(b.created_at),
        created_at: b.created_at,
        title: `Bill for ${b.item_text}`,
        sub: `${b.qty} ${b.unit || 'unit'} × ₹${b.unit_price || b.amount}`,
        amount: b.amount,
        rawObj: b
      });
    });

    payments.forEach(p => {
      combined.push({
        type: "payment",
        id: `payment-${p.id}`,
        rawId: p.id,
        date: new Date(p.created_at),
        created_at: p.created_at,
        title: "Repayment Received",
        sub: "Cash / UPI collected",
        amount: p.amount,
        rawObj: p
      });
    });

    return combined.sort((a, b) => b.date - a.date);
  }, [bills, payments]);

  // Filter and sort customers list
  const displayedCustomers = useMemo(() => {
    // Apply search query
    const query = searchQuery.toLowerCase().trim();
    const filtered = customers.filter(c => {
      const matchesQuery = c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query));
      // Status filter
      const isPending = c.total_outstanding > 0;
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "pending" && isPending) ||
        (filterStatus === "paid" && !isPending);
      return matchesQuery && statusMatch;
    });
    // Sort
    const sorted = [...filtered];
    switch (sortKey) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "outstanding":
        sorted.sort((a, b) => b.total_outstanding - a.total_outstanding);
        break;
      case "lastPurchase":
        sorted.sort((a, b) => new Date(b.last_purchase_date) - new Date(a.last_purchase_date));
        break;
      case "totalBills":
        sorted.sort((a, b) => b.total_bills - a.total_bills);
        break;
      default:
        break;
    }
    return sorted;
  }, [customers, searchQuery, filterStatus, sortKey]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Stats aggregate for selected customer
  const detailStats = useMemo(() => {
    if (!selectedCustomerDetail) return { totalOutstanding: 0, totalPaid: 0, totalBillsAmount: 0 };
    const totalBillsAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOutstanding = totalBillsAmount - totalPaid;
    return { totalOutstanding, totalPaid, totalBillsAmount };
  }, [selectedCustomerDetail, bills, payments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="font-display text-2xl font-bold text-shopfront">Customer Ledger</h1>
          <p className="mt-1 text-sm text-ink/60">View aggregated stats, purchase histories, and clear due sheets.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid h-64 place-items-center text-ink/50 no-print">Loading customer ledgers…</div>
      ) : error ? (
        <div className="rounded-xl bg-terracotta/10 p-4 text-sm text-terracotta no-print">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 no-print">
          
          {/* Left panel: Customers List */}
          <div className="space-y-4 xl:col-span-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20 transition-all"
              />
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            </div>
            {/* Filter and Sort Controls */}
            <div className="flex flex-wrap gap-2 mt-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm focus:border-marigold focus:ring-2 focus:ring-marigold/20 transition-all"
              >
                <option value="all">All Customers</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm focus:border-marigold focus:ring-2 focus:ring-marigold/20 transition-all"
              >
                <option value="name">Name</option>
                <option value="outstanding">Outstanding</option>
                <option value="lastPurchase">Last Purchase</option>
                <option value="totalBills">Total Bills</option>
              </select>
            </div>

            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-black/5 bg-white/50 p-2 space-y-1.5 custom-scrollbar">
              {displayedCustomers.length > 0 ? (
                displayedCustomers.map(c => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`flex w-full flex-col gap-1.5 rounded-xl p-3.5 text-left transition-all ${
                        isSelected 
                          ? "bg-shopfront text-white shadow-lg shadow-shopfront/20 ring-1 ring-shopfront" 
                          : "bg-white hover:bg-black/5 ring-1 ring-black/5"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold capitalize text-base leading-tight">
                          {c.name}
                        </span>
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-marigold rotate-90" : "text-ink/30"}`} />
                      </div>
                      
                      <div className="flex w-full items-end justify-between gap-2 mt-1">
                        {c.phone ? (
                          <span className={`text-xs ${isSelected ? "text-white/60" : "text-ink/50"}`}>
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-xs italic opacity-40">No phone</span>
                        )}
                        
                        <div className="text-right">
                          <span className={`text-xs block ${isSelected ? "text-white/50" : "text-ink/40"}`}>Outstanding</span>
                          <span className={`font-bold text-sm ${c.total_outstanding > 0 ? (isSelected ? "text-marigold" : "text-terracotta") : (isSelected ? "text-white" : "text-leaf")}`}>
                            {money(c.total_outstanding)}
                          </span>
                        </div>
                      </div>

                      {/* Small metadata strip */}
                      <div className={`mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] border-t pt-2 ${isSelected ? "border-white/10 text-white/50" : "border-black/5 text-ink/40"}`}>
                        <span>Bills: {c.total_bills}</span>
                        <span>Paid: {money(c.total_paid)}</span>
                        <span className="col-span-2">Last Bill: {formatDate(c.last_purchase_date)}</span>
                        <span className="col-span-2">Last Pay: {formatDate(c.last_payment_date)}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-ink/40">No customers found.</div>
              )}
            </div>
          </div>

          {/* Right panel: Selected Customer Ledger details */}
          <div className="xl:col-span-2">
            {selectedCustomerId ? (
              loadingDetail ? (
                <div className="grid h-64 place-items-center rounded-2xl border border-black/5 bg-white/50 text-ink/50">
                  Loading statement detail…
                </div>
              ) : selectedCustomerDetail ? (
                <div className="space-y-6">
                  {/* Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-black/5">
                    <h3 className="font-semibold text-shopfront text-sm flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-marigold" />
                      Statements & Ledgers
                    </h3>
                    <div className="flex gap-2">
                      {detailStats.totalOutstanding > 0 && (
                        <button
                          onClick={() => setShowReminderModal(true)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-shopfront ring-1 ring-black/10 hover:bg-black/5 transition-all"
                        >
                          Send Reminder
                        </button>
                      )}
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink/75 ring-1 ring-black/5 hover:bg-paper-deep transition-all"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print Statement
                      </button>
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-3 py-1.5 text-xs font-semibold text-paper hover:bg-shopfront-700 transition-all"
                      >
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </button>
                    </div>
                  </div>

                  {/* Customer summary card */}
                  <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-black/5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-black/5 pb-4">
                      <div>
                        <h2 className="font-display text-xl font-bold text-shopfront capitalize flex items-center gap-2">
                          {selectedCustomerDetail.name}
                        </h2>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink/60">
                          {selectedCustomerDetail.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-ink/30" /> {selectedCustomerDetail.phone}
                            </span>
                          )}
                          {selectedCustomerDetail.upi_id && (
                            <span className="flex items-center gap-1.5">
                              <Landmark className="h-3.5 w-3.5 text-ink/30" /> UPI: {selectedCustomerDetail.upi_id}
                            </span>
                          )}
                          {selectedCustomerDetail.address && (
                            <span className="flex items-center gap-1.5 sm:col-span-2">
                              <MapPin className="h-3.5 w-3.5 text-ink/30" /> {selectedCustomerDetail.address}
                            </span>
                          )}
                          {selectedCustomerDetail.notes && (
                            <span className="flex items-center gap-1.5 sm:col-span-2 italic">
                              <Info className="h-3.5 w-3.5 text-ink/30" /> Notes: {selectedCustomerDetail.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Current Balance */}
                      <div className="rounded-xl bg-paper p-4 text-right ring-1 ring-black/5 shrink-0 self-start md:self-auto min-w-[140px]">
                        <span className="text-[10px] uppercase tracking-wider text-ink/50 block font-semibold">Outstanding Balance</span>
                        <span className={`font-display text-2xl font-bold ${detailStats.totalOutstanding > 0 ? "text-terracotta" : "text-leaf"}`}>
                          {money(detailStats.totalOutstanding)}
                        </span>
                      </div>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-xl bg-paper px-3 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-ink/40 block font-medium">Total Credit</span>
                        <span className="font-semibold text-shopfront text-base">{money(detailStats.totalBillsAmount)}</span>
                      </div>
                      <div className="rounded-xl bg-paper px-3 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-ink/40 block font-medium">Total Repaid</span>
                        <span className="font-semibold text-leaf text-base">{money(detailStats.totalPaid)}</span>
                      </div>
                      <div className="rounded-xl bg-paper px-3 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-ink/40 block font-medium">Total Bills</span>
                        <span className="font-semibold text-shopfront text-base">{bills.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ledger Timeline */}
                  <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5">
                    <h3 className="font-semibold text-shopfront text-sm mb-4">Transaction History</h3>

                    {timeline.length > 0 ? (
                      <div className="relative border-l-2 border-black/5 pl-4 ml-2 space-y-5 py-1">
                        {timeline.map((item) => {
                          const isBill = item.type === "bill";
                          return (
                            <div key={item.id} className="relative">
                              {/* Indicator dot */}
                              <div className={`absolute -left-[25px] top-1.5 grid h-4 w-4 place-items-center rounded-full border bg-white ${isBill ? "border-terracotta text-terracotta" : "border-leaf text-leaf"}`}>
                                {isBill ? (
                                  <ArrowUpRight className="h-2.5 w-2.5" />
                                ) : (
                                  <ArrowDownLeft className="h-2.5 w-2.5" />
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-paper p-3.5 hover:bg-paper-deep transition-all ring-1 ring-black/5">
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-ink/40 font-mono block">
                                    {formatDateTime(item.created_at)}
                                  </span>
                                  <span className="font-semibold text-shopfront text-sm mt-0.5 block">
                                    {item.title}
                                  </span>
                                  <span className="text-xs text-ink/60 mt-0.5 block">
                                    {item.sub}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-3 justify-between sm:justify-end">
                                  <span className={`font-bold text-base ${isBill ? "text-terracotta" : "text-leaf"}`}>
                                    {isBill ? "+" : "-"}{money(item.amount)}
                                  </span>
                                  
                                  {isBill && (
                                    <button
                                      onClick={() => setActiveBill(item.rawObj)}
                                      className="rounded-full bg-white p-1.5 text-ink/50 hover:bg-black/5 hover:text-ink ring-1 ring-black/5 transition-all"
                                      title="View Bill Details"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-ink/40">No transactions recorded for this customer.</div>
                    )}
                  </div>
                </div>
              ) : null
            ) : (
              <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-black/10 text-ink/40">
                Select a customer from the left list to view their outstanding ledger statement.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Sheet (Visible only when window.print() is called) */}
      {selectedCustomerDetail && (
        <div id="print-section" className="print-only p-8 bg-white text-black space-y-6">
          <div className="flex justify-between items-start border-b border-black pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dukaan Saathi Statement</h1>
              <p className="text-sm text-gray-500 mt-1">Multilingual Shop Credit Ledger Record</p>
              <div className="mt-4 space-y-0.5 text-sm">
                <p><span className="font-bold">Customer:</span> {selectedCustomerDetail.name}</p>
                {selectedCustomerDetail.phone && <p><span className="font-bold">Mobile:</span> {selectedCustomerDetail.phone}</p>}
                {selectedCustomerDetail.address && <p><span className="font-bold">Address:</span> {selectedCustomerDetail.address}</p>}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-gray-700">ACCOUNT STATUS</h3>
              <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString("en-IN")}</p>
              <div className="mt-4 rounded bg-gray-100 p-3 inline-block">
                <span className="text-xs uppercase text-gray-500 font-semibold block">Outstanding Due</span>
                <span className="text-2xl font-bold text-red-600">{money(detailStats.totalOutstanding)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm border-b border-black pb-4">
            <div>
              <span className="text-gray-500 uppercase text-xs block">Total Bills value</span>
              <span className="font-bold text-lg">{money(detailStats.totalBillsAmount)}</span>
            </div>
            <div>
              <span className="text-gray-500 uppercase text-xs block">Total paid back</span>
              <span className="font-bold text-lg">{money(detailStats.totalPaid)}</span>
            </div>
            <div>
              <span className="text-gray-500 uppercase text-xs block">Total Bills</span>
              <span className="font-bold text-lg">{bills.length} bills</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold border-b pb-2 mb-3">Transaction Timeline</h3>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-400 bg-gray-50">
                  <th className="py-2 px-1">Date</th>
                  <th className="py-2">Transaction Type</th>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Debit (+)</th>
                  <th className="py-2 text-right">Credit (-)</th>
                </tr>
              </thead>
              <tbody>
                {timeline.length > 0 ? (
                  timeline.map((item) => {
                    const isBill = item.type === "bill";
                    return (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-2 px-1 font-mono text-xs">{formatDateTime(item.created_at)}</td>
                        <td className="py-2 font-semibold">{isBill ? "Udhaar Sale" : "Payment Recv"}</td>
                        <td className="py-2 text-gray-600">{item.sub}</td>
                        <td className="py-2 text-right font-bold text-red-600">{isBill ? money(item.amount) : ""}</td>
                        <td className="py-2 text-right font-bold text-green-600">{!isBill ? money(item.amount) : ""}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-gray-500">No transaction records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black pt-6 text-center text-xs text-gray-400">
            * This is a digitally generated ledger statement compiled by Dukaan Saathi on behalf of your vendor shop.
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {activeBill && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4" onClick={() => setActiveBill(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-shopfront capitalize">Bill Details</h3>
                <span className="text-xs text-ink/40 font-mono block mt-0.5">{formatDateTime(activeBill.created_at)}</span>
              </div>
              <button 
                onClick={() => setActiveBill(null)} 
                className="text-ink/40 hover:text-ink rounded-full bg-paper p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl bg-paper p-4 border border-black/5 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <span className="text-xs text-ink/50 uppercase tracking-wide">Item Name</span>
                  <span className="font-semibold text-shopfront capitalize text-sm">{activeBill.item_text}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <span className="text-xs text-ink/50 uppercase tracking-wide">Quantity</span>
                  <span className="font-semibold text-shopfront text-sm">{activeBill.qty} {activeBill.unit || 'unit'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <span className="text-xs text-ink/50 uppercase tracking-wide">Unit Price</span>
                  <span className="font-semibold text-shopfront text-sm">{money(activeBill.unit_price || activeBill.amount / activeBill.qty)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink/50 uppercase tracking-wide font-bold">Total Amount</span>
                  <span className="font-display text-lg font-bold text-terracotta">{money(activeBill.amount)}</span>
                </div>
              </div>
              
              <div className="text-xs text-ink/40 leading-relaxed italic bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-marigold" />
                This sale was logged on credit (Udhaar) and is outstanding on the customer's ledger sheet.
              </div>

              <button 
                onClick={() => setActiveBill(null)}
                className="w-full rounded-full bg-shopfront py-2 text-sm font-semibold text-paper"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && selectedCustomerDetail && (
        <AutoPayReminderModal
          customer={{...selectedCustomerDetail, outstanding: detailStats.totalOutstanding}}
          shopName={data?.shop?.name}
          money={money}
          onClose={() => setShowReminderModal(false)}
        />
      )}
    </div>
  );
}

// Reusable X icon since we use X but didn't import it in standard react flow (lucide-react has X)
function X(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
