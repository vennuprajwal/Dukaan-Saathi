import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, Check, X, Phone, MapPin, User, FileText, Landmark } from "lucide-react";
import { api } from "../lib/api";

export default function CustomerSearchSelector({ selectedCustomer, onSelect, t }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New Customer Form State
  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    upi_id: "",
    address: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const containerRef = useRef(null);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!query.trim() || isCreating) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.getCustomers(query);
        setSuggestions(res.customers || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, isCreating]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer) => {
    onSelect(customer);
    setQuery("");
    setShowDropdown(false);
  };

  const handleStartCreate = () => {
    setNewCust({
      name: query,
      phone: "",
      upi_id: "",
      address: "",
      notes: "",
    });
    setError("");
    setIsCreating(true);
    setShowDropdown(false);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setError("");

    if (!newCust.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!newCust.phone.trim()) {
      setError("Mobile Number is required");
      return;
    }

    setSaving(true);
    try {
      const res = await api.createCustomer({
        name: newCust.name.trim(),
        phone: newCust.phone.trim(),
        upi_id: newCust.upi_id.trim() || undefined,
        address: newCust.address.trim() || undefined,
        notes: newCust.notes.trim() || undefined,
      });

      if (res.customer) {
        onSelect(res.customer);
        setIsCreating(false);
        setQuery("");
      }
    } catch (err) {
      setError(err.message || "Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-ink/50">
        {t("dashboard.customer") || "Customer"}
      </label>

      {/* Selected Customer View */}
      {selectedCustomer ? (
        <div className="rounded-xl border border-leaf/30 bg-leaf/5 p-3.5 relative overflow-hidden group hover:border-leaf/50 transition-all duration-300">
          <div className="absolute top-0 right-0 p-2 opacity-65 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="rounded-full bg-black/5 p-1 text-ink/60 hover:bg-black/10 hover:text-ink transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-leaf/10 p-2 text-leaf">
              <User className="h-4 w-4" />
            </div>
            <div className="space-y-1.5 pr-6">
              <h4 className="font-semibold text-shopfront capitalize leading-tight flex flex-wrap items-center gap-2">
                {selectedCustomer.name}
                {selectedCustomer.outstanding !== undefined && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${selectedCustomer.outstanding > 0 ? 'bg-terracotta/10 text-terracotta' : 'bg-leaf/10 text-leaf'}`}>
                    {selectedCustomer.outstanding > 0 ? `Pending: ₹${selectedCustomer.outstanding}` : 'No Pending Balance'}
                  </span>
                )}
              </h4>
              <div className="grid gap-x-4 gap-y-1 text-xs text-ink/70 sm:grid-cols-2">
                {selectedCustomer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-ink/40" /> {selectedCustomer.phone}
                  </span>
                )}
                {selectedCustomer.upi_id && (
                  <span className="flex items-center gap-1.5">
                    <Landmark className="h-3 w-3 text-ink/40" /> {selectedCustomer.upi_id}
                  </span>
                )}
                {selectedCustomer.address && (
                  <span className="flex items-center gap-1.5 sm:col-span-2">
                    <MapPin className="h-3 w-3 text-ink/40" /> {selectedCustomer.address}
                  </span>
                )}
                {selectedCustomer.notes && (
                  <span className="flex items-center gap-1.5 sm:col-span-2 italic text-ink/50">
                    <FileText className="h-3 w-3 text-ink/30" /> {selectedCustomer.notes}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : isCreating ? (
        /* Add New Customer Form */
        <div className="rounded-xl border border-black/10 bg-paper-deep/40 p-4 space-y-3 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <span className="text-sm font-semibold text-shopfront flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-marigold" /> New Customer
            </span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs font-medium text-ink/50 hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name *"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-marigold"
              value={newCust.name}
              onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
              required
            />
            <input
              type="tel"
              placeholder="Mobile Number *"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-marigold"
              value={newCust.phone}
              onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="UPI ID (Optional)"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-marigold"
              value={newCust.upi_id}
              onChange={(e) => setNewCust({ ...newCust, upi_id: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address (Optional)"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-marigold"
              value={newCust.address}
              onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
            />
            <textarea
              placeholder="Notes (Optional)"
              rows={2}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-marigold resize-none"
              value={newCust.notes}
              onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-terracotta/10 px-3 py-1.5 text-xs text-terracotta">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSaveCustomer}
            disabled={saving}
            className="w-full rounded-full bg-marigold py-2 text-sm font-semibold text-shopfront hover:bg-marigold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving Customer..." : "Save & Select"}
          </button>
        </div>
      ) : (
        /* Search Box & Suggestions list */
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              placeholder={t("dashboard.searchCustomer") || "Search by Name or Phone..."}
              className="w-full rounded-xl border border-black/15 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20 transition-all"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            {loading && (
              <div className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-marigold border-t-transparent animate-spin" />
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showDropdown && (query.trim() !== "") && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg custom-scrollbar">
              {suggestions.length > 0 ? (
                <div className="py-1">
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-paper-deep transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-shopfront capitalize">{c.name}</div>
                        <div className="flex gap-2 items-center text-xs text-ink/50 mt-0.5">
                          {c.phone && <span className="font-mono">{c.phone}</span>}
                          {c.phone && c.outstanding > 0 && <span>•</span>}
                          {c.outstanding > 0 && (
                            <span className="text-terracotta font-medium">Pending: ₹{c.outstanding}</span>
                          )}
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-leaf opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-2 text-sm text-ink/50 text-center">
                  No matching customers found.
                </div>
              )}
              <div className="border-t border-black/5 bg-paper-deep/30 px-3 py-2">
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-marigold/10 py-1.5 text-xs font-semibold text-shopfront hover:bg-marigold/20 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Create Customer "{query}"
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
