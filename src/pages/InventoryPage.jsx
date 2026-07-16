import { useOutletContext } from "react-router-dom";
import { Package, AlertTriangle, Download, QrCode, ScanLine } from "lucide-react";
import { Card, Empty } from "./DashboardPage";

export default function InventoryPage() {
  const { data, t } = useOutletContext();

  const exportCsv = () => {
    alert("Full inventory export coming soon!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-shopfront">Inventory</h1>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink/70 ring-1 ring-black/5 hover:bg-paper-deep"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

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
                          {p.barcode ? <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{p.barcode}</span> : <span className="text-ink/40">—</span>}
                          {p.qr_code ? <QrCode className="h-4 w-4 text-shopfront" /> : <ScanLine className="h-4 w-4 text-ink/30" />}
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
    </div>
  );
}
