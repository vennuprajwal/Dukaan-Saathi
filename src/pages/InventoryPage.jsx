import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Package, AlertTriangle, Download, QrCode, ScanLine,
  Plus, X, CheckCircle2, ChevronDown, Tag, Layers,
  IndianRupee, Truck, CalendarDays, Hash, Barcode, Info, Loader2, Pencil, Save,
  Trash2, AlertCircle,
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

/* ── Product Modal (Add & Edit) ─────────────────────────── */
// `product` prop: if provided the modal opens in Edit mode, pre-filled.
function AddProductModal({ onClose, onSaved, product = null }) {
  const isEdit = Boolean(product);
  const toast  = useToast();

  const initialForm = isEdit ? {
    name:                product.name              ?? "",
    category:            product.category          ?? "",
    stock_qty:           String(product.stock_qty  ?? ""),
    unit:                product.unit              ?? "unit",
    purchase_price:      String(product.purchase_price ?? product.cost_price ?? ""),
    selling_price:       String(product.selling_price  ?? product.sell_price  ?? ""),
    supplier:            product.supplier          ?? "",
    expiry_date:         product.expiry_date       ?? "",
    batch_number:        product.batch_number      ?? "",
    barcode:             product.barcode           ?? "",
    low_stock_threshold: String(product.low_stock_threshold ?? "5"),
  } : EMPTY_FORM;

  const [form, setForm]     = useState(initialForm);
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
    const payload = {
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
    };
    try {
      if (isEdit) {
        await api.updateProduct(product.id, payload);
        toast.success(`"${form.name.trim()}" updated successfully!`);
      } else {
        await api.addProduct(payload);
        toast.success(`"${form.name.trim()}" added to inventory!`);
      }
      onSaved();
      onClose();
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
            <div className={`grid h-10 w-10 place-items-center rounded-2xl shadow-sm bg-gradient-to-br ${isEdit ? "from-marigold to-marigold/70" : "from-shopfront to-shopfront/70"}`}>
              {isEdit ? <Pencil className="h-5 w-5 text-white" /> : <Package className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h2 className="font-semibold text-ink text-base">{isEdit ? "Edit Product" : "Add New Product"}</h2>
              <p className="text-xs text-ink/40">{isEdit ? `Editing: ${product.name}` : "Fill in the details to add a product to inventory"}</p>
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

/* ── Delete Confirm Modal ──────────────────────────────────── */
function DeleteConfirmModal({ product, onClose, onDeleted }) {
  const toast    = useToast();
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await api.deleteProduct(product.id);
      toast.success(`"${product.name}" deleted from inventory.`);
      onDeleted(); // refresh
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to delete product.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">

        {/* Red accent top-bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-terracotta to-terracotta/60" />

        {/* Body */}
        <div className="px-6 pt-6 pb-5 space-y-4">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-terracotta/10">
              <Trash2 className="h-6 w-6 text-terracotta" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-base font-bold text-ink">Delete Product</h2>
              <p className="mt-0.5 text-sm text-ink/50">This action cannot be undone.</p>
            </div>
          </div>

          {/* Product name badge */}
          <div className="flex items-center gap-2 rounded-xl bg-terracotta/5 border border-terracotta/15 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-terracotta" />
            <p className="text-sm text-ink/80">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-ink">&ldquo;{product.name}&rdquo;</span>?
            </p>
          </div>

          {/* Warning note */}
          <p className="text-xs text-ink/40 leading-relaxed">
            Deleting this product will remove it from your inventory. Sales records
            that referenced this product will not be affected.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-black/5 bg-paper/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-ink/60 hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {busy
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
              : <><Trash2 className="h-4 w-4" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inventory Page ──────────────────────────────────────── */
/* ── Sort helpers ──────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "name",           label: "Product Name"   },
  { value: "stock_qty",      label: "Stock"           },
  { value: "purchase_price", label: "Purchase Price"  },
  { value: "selling_price",  label: "Selling Price"   },
  { value: "expiry_date",    label: "Expiry Date"     },
];

const STOCK_FILTERS = [
  { value: "all",      label: "All"       },
  { value: "in_stock", label: "In Stock"  },
  { value: "low",      label: "Low Stock" },
  { value: "out",      label: "Out of Stock" },
];

function sortProducts(list, field, dir) {
  return [...list].sort((a, b) => {
    let va = a[field] ?? "";
    let vb = b[field] ?? "";
    if (field === "name") {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
    } else if (field === "expiry_date") {
      va = va || "9999-99-99";
      vb = vb || "9999-99-99";
    } else {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    }
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ?  1 : -1;
    return 0;
  });
}

export default function InventoryPage() {
  const { data, load, t } = useOutletContext();
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [editingProduct,  setEditingProduct]  = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  // ── Filter / Search / Sort state ────────────────────────
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortField,   setSortField]   = useState("name");
  const [sortDir,     setSortDir]     = useState("asc");

  const openEdit    = (p) => setEditingProduct(p);
  const closeEdit   = ()  => setEditingProduct(null);
  const openDelete  = (p) => setDeletingProduct(p);
  const closeDelete = ()  => setDeletingProduct(null);

  const exportCsv = () => alert("Full inventory export coming soon!");

  // ── Derive filtered + sorted list ───────────────────────
  const allCategories = [...new Set(
    (data?.inventory || []).map((p) => p.category).filter(Boolean)
  )].sort();

  const filtered = sortProducts(
    (data?.inventory || []).filter((p) => {
      const threshold = Number(p.low_stock_threshold || 5);
      const qty       = Number(p.stock_qty || 0);
      const low       = qty <= threshold;
      const out       = qty === 0;

      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hit = [p.name, p.category, p.supplier, p.barcode, p.batch_number]
          .filter(Boolean).some((v) => v.toLowerCase().includes(q));
        if (!hit) return false;
      }
      // Category
      if (catFilter !== "all" && (p.category || "") !== catFilter) return false;
      // Stock status
      if (stockFilter === "in_stock" && (low || out)) return false;
      if (stockFilter === "low"      && !low)          return false;
      if (stockFilter === "out"      && qty !== 0)     return false;

      return true;
    }),
    sortField, sortDir
  );

  const hasFilters = search || catFilter !== "all" || stockFilter !== "all";
  const clearFilters = () => { setSearch(""); setCatFilter("all"); setStockFilter("all"); };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-shopfront" />
      : <ChevronDown className="h-3 w-3 text-shopfront" />;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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

      {/* ── Search + Filter + Sort bar ── */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 px-4 py-3 space-y-3">
        {/* Row 1: Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, supplier, barcode…"
            className="w-full rounded-xl border border-black/10 bg-paper py-2.5 pl-9 pr-4 text-sm text-ink outline-none focus:border-shopfront focus:ring-2 focus:ring-shopfront/20 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Row 2: Filters + Sort + Clear */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <div className="relative">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className={`appearance-none rounded-full border pl-3 pr-7 py-1.5 text-xs font-semibold outline-none transition cursor-pointer
                ${catFilter !== "all"
                  ? "border-shopfront/40 bg-shopfront/5 text-shopfront"
                  : "border-black/10 bg-paper text-ink/60 hover:border-black/20"}`}
            >
              <option value="all">All Categories</option>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink/40" />
          </div>

          {/* Stock status filter */}
          <div className="flex items-center gap-1 rounded-full border border-black/10 bg-paper p-0.5">
            {STOCK_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStockFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all
                  ${stockFilter === f.value
                    ? f.value === "low"  ? "bg-terracotta text-white shadow-sm"
                    : f.value === "out"  ? "bg-ink text-white shadow-sm"
                    : f.value === "in_stock" ? "bg-leaf text-white shadow-sm"
                    : "bg-shopfront text-white shadow-sm"
                    : "text-ink/50 hover:text-ink"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort by */}
          <div className="relative ml-auto">
            <select
              value={sortField}
              onChange={(e) => { setSortField(e.target.value); setSortDir("asc"); }}
              className="appearance-none rounded-full border border-black/10 bg-paper pl-3 pr-7 py-1.5 text-xs font-semibold text-ink/60 outline-none hover:border-black/20 cursor-pointer transition"
            >
              {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink/40" />
          </div>
          <button
            onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
            className="grid h-7 w-7 place-items-center rounded-full border border-black/10 bg-paper text-ink/50 hover:border-black/20 hover:text-ink transition"
          >
            {sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {/* Result count + Clear */}
          <span className="text-xs text-ink/40">
            {filtered.length} / {data?.inventory?.length ?? 0} products
          </span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta hover:underline"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Inventory Table ── */}
      <Card title={t("dashboard.inventoryStock")} icon={Package}>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/40">
                <tr>
                  {/* Sortable column headers */}
                  <th className="py-2">
                    <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-shopfront transition-colors">
                      {t("dashboard.item")} <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="py-2 text-right">
                    <button onClick={() => toggleSort("stock_qty")} className="inline-flex items-center gap-1 hover:text-shopfront transition-colors">
                      <SortIcon field="stock_qty" /> {t("dashboard.stock")}
                    </button>
                  </th>
                  <th className="py-2 text-right">
                    <button onClick={() => toggleSort("purchase_price")} className="inline-flex items-center gap-1 hover:text-shopfront transition-colors">
                      <SortIcon field="purchase_price" /> Purchase Price
                    </button>
                  </th>
                  <th className="py-2 text-right">
                    <button onClick={() => toggleSort("selling_price")} className="inline-flex items-center gap-1 hover:text-shopfront transition-colors">
                      <SortIcon field="selling_price" /> Selling Price
                    </button>
                  </th>
                  <th className="py-2">Supplier</th>
                  <th className="py-2">
                    <button onClick={() => toggleSort("expiry_date")} className="inline-flex items-center gap-1 hover:text-shopfront transition-colors">
                      Expiry <SortIcon field="expiry_date" />
                    </button>
                  </th>
                  <th className="py-2">Batch</th>
                  <th className="py-2">Barcode / QR</th>
                  <th className="py-2 text-right">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const threshold = Number(p.low_stock_threshold || 5);
                  const low = Number(p.stock_qty || 0) <= threshold;
                  return (
                    <tr key={p.id} className="border-t border-black/5 hover:bg-black/[0.015] transition-colors">
                      <td className="py-2.5 font-medium capitalize text-shopfront">
                        <div className="flex items-center gap-2">
                          {low && <AlertTriangle className="h-4 w-4 text-terracotta" />}
                          <div>
                            <div>{p.name}</div>
                            {p.category && (
                              <div className="text-[11px] text-ink/40 font-normal">{p.category}</div>
                            )}
                          </div>
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
                      <td className="py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit product"
                            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-shopfront/40 hover:bg-shopfront/5 hover:text-shopfront transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => openDelete(p)}
                            title="Delete product"
                            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-terracotta/40 hover:bg-terracotta/5 hover:text-terracotta transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center space-y-2">
            <Search className="mx-auto h-8 w-8 text-ink/20" />
            <p className="text-sm text-ink/40">No products match your filters.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs font-semibold text-shopfront hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal onClose={() => setShowAddModal(false)} onSaved={load} />
      )}
      {/* Edit Product Modal */}
      {editingProduct && (
        <AddProductModal product={editingProduct} onClose={closeEdit} onSaved={load} />
      )}
      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <DeleteConfirmModal product={deletingProduct} onClose={closeDelete} onDeleted={load} />
      )}
    </div>
  );
}
