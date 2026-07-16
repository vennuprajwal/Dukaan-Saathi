import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Download, Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Card, Empty, AddSaleModal } from "./DashboardPage";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

export default function SalesPage() {
  const { data, load, money, timeOf, t, busy, setBusy, setErr } = useOutletContext();
  const [showAddSale, setShowAddSale] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const toast = useToast();

  const submitSale = async (sale) => {
    await api.addSale(sale);
    setShowAddSale(false);
    load();
  };

  const handleDeleteSale = async (id) => {
    setBusy("delete");
    try {
      await api.deleteSale(id);
      toast.success(t("dashboard.saleDeleted") || "Sale deleted successfully!");
      setSaleToDelete(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete sale");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-shopfront">Sales</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={busy === "export"}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink/70 ring-1 ring-black/5 hover:bg-paper-deep disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {t("dashboard.exportCsv")}
          </button>
          <button
            onClick={() => setShowAddSale(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-4 py-2 text-xs font-semibold text-paper hover:-translate-y-0.5 transition-transform"
          >
            <Plus className="h-4 w-4" /> {t("dashboard.addSale")}
          </button>
        </div>
      </div>

      <Card title={t("dashboard.salesFeed")}>
        {data?.sales?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="py-2">{t("dashboard.item")}</th>
                  <th className="py-2">{t("dashboard.qty")}</th>
                  <th className="py-2">{t("dashboard.amount")}</th>
                  <th className="py-2">{t("dashboard.customer")}</th>
                  <th className="py-2 text-right">{t("dashboard.time")}</th>
                  <th className="py-2 text-right w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((row) => (
                  <tr key={row.id} className="border-t border-black/5">
                    <td className="py-2.5 font-medium capitalize text-shopfront">{row.item_text}</td>
                    <td className="py-2.5 text-ink/70">{+row.qty}</td>
                    <td className="py-2.5 font-semibold">{money(row.amount)}</td>
                    <td className="py-2.5">
                      {row.payment_type === "udhaar" ? (
                        <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs text-terracotta">
                          {row.customer || t("dashboard.udhaar")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-xs text-leaf">{t("dashboard.cash")}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-xs text-ink/40">{timeOf(row.created_at)}</td>
                    <td className="py-2.5 text-right">
                      <button
                        title="Delete Sale"
                        onClick={() => setSaleToDelete(row)}
                        className="text-terracotta/60 hover:text-terracotta transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t("dashboard.noSales")}</Empty>
        )}
      </Card>

      <AnimatePresence>
        {showAddSale && (
          <AddSaleModal
            onClose={() => setShowAddSale(false)}
            onSubmit={submitSale}
            t={t}
          />
        )}
      </AnimatePresence>

      {saleToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !busy && setSaleToDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-shopfront mb-2">Delete Sale</h3>
            <p className="text-sm text-ink/70 mb-6">Are you sure you want to delete this sale?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={() => setSaleToDelete(null)}
                className="rounded-full bg-paper px-5 py-2 text-sm font-semibold text-ink/70 hover:bg-paper-deep transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={() => handleDeleteSale(saleToDelete.id)}
                className="rounded-full bg-terracotta px-5 py-2 text-sm font-semibold text-white hover:bg-terracotta/90 transition-colors disabled:opacity-50"
              >
                {busy === "delete" ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
