import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Package, AlertTriangle, Download, QrCode, ScanLine,
  Plus, X, CheckCircle2, ChevronDown, Tag, Layers,
  IndianRupee, Truck, CalendarDays, Hash, Barcode, Info, Loader2,
} from "lucide-react";
import { Card, Empty } from "./DashboardPage";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

/* ── Constants ───────────────────────────────────────────── */
const CATEGORIES = [
  "Grocery & Staples",
  "Dairy & Eggs",
  "Bakery & Snacks",
  "Beverages",
  "Personal Care",
  "Household & Cleaning",
  "Medicines & Health",
  "Stationery & Office",
  "Electronics & Accessories",
  "Clothing & Textiles",
  "Fruits & Vegetables",
  "Meat & Seafood",
  "Baby Products",
  "Pet Supplies",
  "Hardware & Tools",
  "Other",
];

const UNITS = [
  { value: "unit",   label: "Unit / Piece" },
  { value: "packet", label: "Packet" },
  { value: "box",    label: "Box" },
  { value: "dozen",  label: "Dozen" },
  { value: "kg",     label: "Kilogram (kg)" },
  { value: "g",      label: "Gram (g)" },
  { value: "litre",  label: "Litre (L)" },
  { value: "ml",     label: "Millilitre (ml)" },
  { value: "metre",  label: "Metre (m)" },
  { value: "bundle", label: "Bundle" },
];

const EMPTY_FORM = {
  name: "",
  category: "",
  stock_qty: "",
  unit: "unit",
  purchase_price: "",
  selling_price: "",
  supplier: "",
  expiry_date: "",
  batch_number: "",
  barcode: "",
  low_stock_threshold: "5",
};

const EMPTY_ERRORS = Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, ""]));

/* ── Validation ──────────────────────────────────────────── */
function validate(form) {
  const errors = { ...EMPTY_ERRORS };
  let valid = true;

  if (!form.name.trim()) {
    errors.name = "Product name is required.";
    valid = false;
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
    valid = false;
  }

  if (!form.category) {
    errors.category = "Please select a category.";
    valid = false;
  }

  if (form.stock_qty === "" || isNaN(Number(form.stock_qty))) {
    errors.stock_qty = "Stock quantity is required.";
    valid = false;
  } else if (Number(form.stock_qty) < 0) {
    errors.stock_qty = "Stock cannot be negative.";
    valid = false;
  }

  if (form.purchase_price === "" || isNaN(Number(form.purchase_price))) {
    errors.purchase_price = "Purchase price is required.";
    valid = false;
  } else if (Number(form.purchase_price) < 0) {
    errors.purchase_price = "Price cannot be negative.";
    valid = false;
  }

  if (form.selling_price === "" || isNaN(Number(form.selling_price))) {
    errors.selling_price = "Selling price is required.";
    valid = false;
  } else if (Number(form.selling_price) < 0) {
    errors.selling_price = "Price cannot be negative.";
    valid = false;
  } else if (Number(form.selling_price) < Number(form.purchase_price)) {
    errors.selling_price = "Selling price should be ≥ purchase price.";
    valid = false;
  }

  return { errors, valid };
}

/* ── Field wrappers ──────────────────────────────────────── */
function FieldLabel({ icon: Icon, label, required }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      {required && <span className="text-terracotta ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-terracotta">
      <Info className="h-3 w-3 shrink-0" /> {msg}
    </p>
  );
}

function inputCls(hasError) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm text-ink outline-none transition
    ${hasError
      ? "border-terracotta/60 bg-terracotta/5 focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
      : "border-black/10 bg-paper focus:border-shopfront focus:ring-2 focus:ring-shopfront/20"
    }`;
}

/* ── Add Product Modal ───────────────────────────────────── */
function AddProductModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field live after first submit attempt
    if (submitted) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const { errors: errs, valid } = validate(form);
    setErrors(errs);
    if (!valid) return;

    setSaving(true);
    try {
      await api.addProduct({
        name:                form.name.trim(),
        category:            form.category,
        stock_qty:           Number(form.stock_qty),
        unit:                form.unit,
        purchase_price:      Number(form.purchase_price),
        selling_price:       Number(form.selling_price),
        supplier:            form.supplier.trim() || null,
        expiry_date:         form.expiry_date || null,
        batch_number:        form.batch_number.trim() || null,
        barcode:             form.barcode.trim() || null,
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
      });
      toast.success(`"${form.name.trim()}" added to inventory!`);
      onSaved();   // refresh inventory list
      onClose();   // close modal
    } catch (err) {
      toast.error(err.message || "Failed to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Profit margin preview
  const margin =
    form.purchase_price && form.selling_price
      ? (((Number(form.selling_price) - Number(form.purchase_price)) / Number(form.purchase_price)) * 100).toFixed(1)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col max-h-[95dvh] sm:max-h-[88vh]">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-shopfront to-shopfront/70 shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-ink text-base">Add New Product</h2>
              <p className="text-xs text-ink/40">Fill in the details to add a product to inventory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink/40 hover:bg-black/5 hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable form body ── */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Section: Basic Info */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-shopfront/70">
                <span className="h-px flex-1 bg-shopfront/10" />
                Basic Information
                <span className="h-px flex-1 bg-shopfront/10" />
              </p>
              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <FieldLabel icon={Tag} label="Product Name" required />
                  <input
                    value={form.name}
                    onChange={set("name")}
                    placeholder="e.g. Basmati Rice 5kg"
                    className={inputCls(!!errors.name)}
                  />
                  <FieldError msg={errors.name} />
                </div>

                {/* Category */}
                <div>
                  <FieldLabel icon={Layers} label="Category" required />
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={set("category")}
                      className={inputCls(!!errors.category) + " appearance-none pr-8"}
                    >
                      <option value="">— Select a category —</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  </div>
                  <FieldError msg={errors.category} />
                </div>
              </div>
            </div>

            {/* Section: Stock */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-shopfront/70">
                <span className="h-px flex-1 bg-shopfront/10" />
                Stock Details
                <span className="h-px flex-1 bg-shopfront/10" />
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Stock Qty */}
                <div>
                  <FieldLabel icon={Package} label="Stock Quantity" required />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.stock_qty}
                    onChange={set("stock_qty")}
                    placeholder="0"
                    className={inputCls(!!errors.stock_qty)}
                  />
                  <FieldError msg={errors.stock_qty} />
                </div>

                {/* Unit */}
                <div>
                  <FieldLabel label="Unit" required />
                  <div className="relative">
                    <select
                      value={form.unit}
                      onChange={set("unit")}
                      className={inputCls(false) + " appearance-none pr-8"}
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  </div>
                </div>

                {/* Low Stock Threshold */}
                <div className="col-span-2">
                  <FieldLabel label="Low Stock Alert Threshold" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.low_stock_threshold}
                    onChange={set("low_stock_threshold")}
                    placeholder="5"
                    className={inputCls(false)}
                  />
                  <p className="mt-1 text-xs text-ink/40">You'll get an alert when stock falls below this number.</p>
                </div>
              </div>
            </div>

            {/* Section: Pricing */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-shopfront/70">
                <span className="h-px flex-1 bg-shopfront/10" />
                Pricing
                <span className="h-px flex-1 bg-shopfront/10" />
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Purchase Price */}
                <div>
                  <FieldLabel icon={IndianRupee} label="Purchase Price" required />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink/40">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.purchase_price}
                      onChange={set("purchase_price")}
                      placeholder="0.00"
                      className={inputCls(!!errors.purchase_price) + " pl-7"}
                    />
                  </div>
                  <FieldError msg={errors.purchase_price} />
                </div>

                {/* Selling Price */}
                <div>
                  <FieldLabel icon={IndianRupee} label="Selling Price" required />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink/40">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.selling_price}
                      onChange={set("selling_price")}
                      placeholder="0.00"
                      className={inputCls(!!errors.selling_price) + " pl-7"}
                    />
                  </div>
                  <FieldError msg={errors.selling_price} />
                </div>
              </div>

              {/* Profit Margin Preview */}
              {margin !== null && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
                  ${Number(margin) >= 0
                    ? "bg-leaf/10 text-leaf"
                    : "bg-terracotta/10 text-terracotta"
                  }`}>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Profit margin: {margin}%
                  {Number(margin) < 0 && " — Selling below cost!"}
                </div>
              )}
            </div>

            {/* Section: Supplier */}
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-shopfront/70">
                <span className="h-px flex-1 bg-shopfront/10" />
                Supplier & Tracking
                <span className="h-px flex-1 bg-shopfront/10" />
              </p>
              <div className="space-y-4">
                {/* Supplier Name */}
                <div>
                  <FieldLabel icon={Truck} label="Supplier Name" />
                  <input
                    value={form.supplier}
                    onChange={set("supplier")}
                    placeholder="Supplier or vendor name (optional)"
                    className={inputCls(false)}
                  />
                </div>

                {/* Expiry + Batch */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel icon={CalendarDays} label="Expiry Date" />
                    <input
                      type="date"
                      value={form.expiry_date}
                      onChange={set("expiry_date")}
                      className={inputCls(false)}
                    />
                  </div>
                  <div>
                    <FieldLabel icon={Hash} label="Batch Number" />
                    <input
                      value={form.batch_number}
                      onChange={set("batch_number")}
                      placeholder="Batch / Lot no."
                      className={inputCls(false)}
                    />
                  </div>
                </div>

                {/* Barcode */}
                <div>
                  <FieldLabel icon={Barcode} label="Barcode / QR Code" />
                  <input
                    value={form.barcode}
                    onChange={set("barcode")}
                    placeholder="Scan or type barcode (optional)"
                    className={inputCls(false)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 flex items-center justify-between gap-3 border-t border-black/5 bg-paper/60 px-6 py-4">
            <p className="text-xs text-ink/40">
              <span className="text-terracotta">*</span> Required fields
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-ink/60 hover:bg-black/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-shopfront px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : <><Plus className="h-4 w-4" /> Save Product</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Inventory Page ──────────────────────────────────────── */
export default function InventoryPage() {
  const { data, load, t } = useOutletContext();
  const [showAddModal, setShowAddModal] = useState(false);

  const exportCsv = () => {
    alert("Full inventory export coming soon!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-shopfront">Inventory</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink/70 ring-1 ring-black/5 hover:bg-paper-deep"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-4 py-2 text-xs font-semibold text-white shadow hover:-translate-y-0.5 transition-transform"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Inventory Table (unchanged) */}
      <Card title={t("dashboard.inventoryStock")} icon={Package}>
        {data?.inventory?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="py-2">{t("dashboard.item")}</th>
                  <th className="py-2 text-right">{t("dashboard.stock")}</th>
                  <th className="py-2 text-right">Purchase Price</th>
                  <th className="py-2 text-right">Selling Price</th>
                  <th className="py-2">Supplier</th>
                  <th className="py-2">Expiry</th>
                  <th className="py-2">Batch</th>
                  <th className="py-2">Barcode / QR</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory.map((p) => {
                  const threshold = Number(p.low_stock_threshold || 5);
                  const low = Number(p.stock_qty || 0) <= threshold;
                  return (
                    <tr key={p.id} className="border-t border-black/5">
                      <td className="py-2.5 font-medium capitalize text-shopfront">
                        <div className="flex items-center gap-2">
                          {low && <AlertTriangle className="h-4 w-4 text-terracotta" />}
                          {p.name}
                        </div>
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${low ? "text-terracotta" : "text-ink/70"}`}>
                        {+Number(p.stock_qty || 0).toFixed(1)} {p.unit !== "unit" ? p.unit : ""}
                      </td>
                      <td className="py-2.5 text-right text-ink/70">₹{Number(p.purchase_price || p.cost_price || 0).toFixed(2)}</td>
                      <td className="py-2.5 text-right text-ink/70">₹{Number(p.selling_price || p.sell_price || 0).toFixed(2)}</td>
                      <td className="py-2.5 text-ink/70">{p.supplier || "—"}</td>
                      <td className="py-2.5 text-ink/70">{p.expiry_date || "—"}</td>
                      <td className="py-2.5 text-ink/70">{p.batch_number || "—"}</td>
                      <td className="py-2.5 text-ink/70">
                        <div className="flex items-center gap-2">
                          {p.barcode
                            ? <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{p.barcode}</span>
                            : <span className="text-ink/40">—</span>}
                          {p.qr_code
                            ? <QrCode className="h-4 w-4 text-shopfront" />
                            : <ScanLine className="h-4 w-4 text-ink/30" />}
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        {low ? (
                          <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-semibold text-terracotta">
                            {t("dashboard.lowStockTag")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-xs font-semibold text-leaf">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t("dashboard.noStock")}</Empty>
        )}
      </Card>

      {/* Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
