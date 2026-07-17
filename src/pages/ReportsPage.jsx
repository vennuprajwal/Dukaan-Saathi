import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart3, FileDown, FileSpreadsheet, FileText, Receipt, ShoppingBag, Star, TrendingUp, Wallet, Package, CircleDollarSign } from "lucide-react";
import { Card, Empty, Stat } from "./DashboardPage";

const REPORTS = [
  { key: "sales", label: "Sales Report", icon: ShoppingBag },
  { key: "purchase", label: "Purchase Report", icon: Receipt },
  { key: "credit", label: "Credit Report", icon: CircleDollarSign },
  { key: "payment", label: "Payment Report", icon: Wallet },
  { key: "inventory", label: "Inventory Report", icon: Package },
  { key: "profit", label: "Profit Report", icon: TrendingUp },
];

function escapeCsv(value) {
  const stringValue = value == null ? "" : String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

export default function ReportsPage() {
  const { data, money, t } = useOutletContext();
  const [activeReport, setActiveReport] = useState("sales");
  const s = data?.summary || {};

  const report = useMemo(() => {
    const salesRows = (data?.sales || []).map((row) => ({
      date: row.created_at,
      item: row.item_text || row.title || "-",
      qty: Number(row.qty || 0),
      amount: Number(row.amount || 0),
      paymentType: row.payment_type || "cash",
      customer: row.customer || "-",
    }));

    const purchaseRows = (data?.expenses?.items || []).map((row) => ({
      date: row.created_at,
      category: row.category || "misc",
      note: row.note || "-",
      amount: Number(row.amount || 0),
    }));

    const creditRows = (data?.overview?.upcomingDueDates || []).map((row) => ({
      invoice: row.invoice_number || "-",
      dueDate: row.due_date || "-",
      status: row.status || "Pending",
      outstanding: Number(row.remaining || 0),
    }));

    const paymentRows = (data?.overview?.recentTransactions || []).filter((row) => row.kind === "payment").map((row) => ({
      date: row.created_at,
      title: row.title || "Payment",
      amount: Number(row.amount || 0),
    }));

    const inventoryRows = (data?.inventory || []).map((row) => ({
      item: row.name || "-",
      stock: Number(row.stock_qty || 0),
      cost: Number(row.cost_price || 0),
      sell: Number(row.sell_price || 0),
      unit: row.unit || "unit",
    }));

    const profitRows = (data?.itemProfit || []).map((row) => ({
      item: row.item || "-",
      qty: Number(row.qty || 0),
      revenue: Number(row.revenue || 0),
      profit: Number(row.profit || 0),
    }));

    const summaries = {
      sales: {
        title: "Sales Report",
        rows: salesRows,
        summary: [
          { label: "Total Sales", value: money(salesRows.reduce((sum, row) => sum + row.amount, 0)) },
          { label: "Orders", value: salesRows.length },
          { label: "Cash Sales", value: money(salesRows.filter((row) => row.paymentType === "cash").reduce((sum, row) => sum + row.amount, 0)) },
        ],
      },
      purchase: {
        title: "Purchase Report",
        rows: purchaseRows,
        summary: [
          { label: "Total Purchases", value: money(purchaseRows.reduce((sum, row) => sum + row.amount, 0)) },
          { label: "Entries", value: purchaseRows.length },
          { label: "Categories", value: new Set(purchaseRows.map((row) => row.category)).size },
        ],
      },
      credit: {
        title: "Credit Report",
        rows: creditRows,
        summary: [
          { label: "Pending Credits", value: data?.overview?.pendingCredits || 0 },
          { label: "Outstanding", value: money(data?.overview?.outstandingAmount || 0) },
          { label: "Upcoming Due", value: creditRows.length },
        ],
      },
      payment: {
        title: "Payment Report",
        rows: paymentRows,
        summary: [
          { label: "Payments", value: paymentRows.length },
          { label: "Total", value: money(paymentRows.reduce((sum, row) => sum + row.amount, 0)) },
          { label: "Latest", value: paymentRows[0] ? money(paymentRows[0].amount) : money(0) },
        ],
      },
      inventory: {
        title: "Inventory Report",
        rows: inventoryRows,
        summary: [
          { label: "Items", value: inventoryRows.length },
          { label: "Low Stock", value: inventoryRows.filter((row) => row.stock <= 5).length },
          { label: "Total Value", value: money(inventoryRows.reduce((sum, row) => sum + row.stock * row.cost, 0)) },
        ],
      },
      profit: {
        title: "Profit Report",
        rows: profitRows,
        summary: [
          { label: "Items", value: profitRows.length },
          { label: "Revenue", value: money(profitRows.reduce((sum, row) => sum + row.revenue, 0)) },
          { label: "Profit", value: money(profitRows.reduce((sum, row) => sum + row.profit, 0)) },
        ],
      },
    };

    return summaries[activeReport] || summaries.sales;
  }, [activeReport, data, money, s]);

  const exportReport = (format) => {
    const headers = Object.keys(report.rows[0] || {}).join(format === "excel" ? "\t" : ",");
    const body = report.rows.map((row) => Object.values(row).join(format === "excel" ? "\t" : ",")).join(format === "excel" ? "\n" : "\n");
    const content = headers && body ? `${headers}\n${body}` : "No data";

    if (format === "csv") {
      const csvContent = [
        Object.keys(report.rows[0] || {}).map((key) => escapeCsv(key)).join(","),
        ...report.rows.map((row) => Object.values(row).map((value) => escapeCsv(value)).join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeReport}-report.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === "excel") {
      const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeReport}-report.xls`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    const html = `<!doctype html><html><head><title>${report.title}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>${report.title}</h1><p>Generated from Dukaan Saathi</p><table>${[Object.keys(report.rows[0] || {}).map((key) => `<th>${key}</th>`).join(""), ...report.rows.map((row) => `<tr>${Object.values(row).map((value) => `<td>${value}</td>`).join("")}</tr>`).join("")].join("")}</table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-shopfront truncate">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-ink/60">Generate concise operational reports and export them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportReport("csv")} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-2.5 text-sm font-medium text-ink/70 ring-1 ring-black/5 active:scale-95 transition-transform">
            <FileDown className="h-4 w-4" /> CSV
          </button>
          <button onClick={() => exportReport("excel")} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-2.5 text-sm font-medium text-ink/70 ring-1 ring-black/5 active:scale-95 transition-transform">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button onClick={() => exportReport("pdf")} className="inline-flex items-center gap-2 rounded-full bg-shopfront px-3 py-2.5 text-sm font-medium text-paper active:scale-95 transition-transform">
            <FileText className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Wallet} tone="leaf" label={t("dashboard.moneyToday")} value={money(s.moneyReceived)} />
        <Stat icon={TrendingUp} tone="marigold" label={t("dashboard.netProfitToday")} value={money(s.netProfit)} sub={`${t("dashboard.grossProfit")}: ${money(s.profit)}`} />
        <Stat icon={Receipt} tone="terracotta" label={t("dashboard.expensesToday")} value={money(s.expenses)} />
        <Stat icon={ShoppingBag} tone="shopfront" label={t("dashboard.orders")} value={s.orders || 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORTS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setActiveReport(item.key)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition active:scale-95 ${activeReport === item.key ? "bg-shopfront text-paper" : "bg-white text-ink/70 ring-1 ring-black/5"}`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </div>

      {data?.bestSeller && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-marigold/10 px-4 py-4 text-sm text-shopfront ring-1 ring-marigold/20">
          <Star className="h-5 w-5 text-marigold" />
          <span className="font-semibold capitalize text-base">{data.bestSeller.topSeller.item}</span>
          <span className="text-ink/60">is your {t("dashboard.bestSeller")} today!</span>
          {data.bestSeller.topProfit && (
            <span className="ml-auto text-ink/60 bg-white dark:bg-shopfront/50 px-3 py-1.5 rounded-full border border-marigold/20">
              {t("dashboard.mostProfit")}: <span className="font-semibold capitalize text-shopfront">{data.bestSeller.topProfit.item}</span> ({money(data.bestSeller.topProfit.profit)})
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t("dashboard.profitByItem")} icon={BarChart3}>
          {data?.itemProfit?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink/40">
                  <tr>
                    <th className="py-2">{t("dashboard.item")}</th>
                    <th className="py-2">{t("dashboard.qty")}</th>
                    <th className="py-2">{t("dashboard.revenue")}</th>
                    <th className="py-2 text-right">{t("dashboard.profitChart")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itemProfit.map((row) => (
                    <tr key={row.item} className="border-t border-black/5 dark:border-white/5">
                      <td className="py-2.5 font-medium capitalize text-shopfront">{row.item}</td>
                      <td className="py-2.5 text-ink/70">{+Number(row.qty).toFixed(1)}</td>
                      <td className="py-2.5 text-ink/70">{money(row.revenue)}</td>
                      <td className={`py-2.5 text-right font-semibold ${row.profit >= 0 ? "text-leaf" : "text-terracotta"}`}>{money(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>{t("dashboard.noSales")}</Empty>
          )}
        </Card>

        <Card title={t("dashboard.expensesToday")} icon={Receipt}>
          {data?.expenses?.items?.length ? (
            <ul className="space-y-2">
              {data.expenses.items.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2 border border-black/5 dark:border-white/5">
                  <span className="font-medium capitalize text-shopfront">{e.category}</span>
                  <span className="text-sm font-semibold text-terracotta">{money(e.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("dashboard.noExpenses")}</Empty>
          )}
        </Card>
      </div>

      <Card title={report.title} icon={BarChart3}>
        {report.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/40">
                <tr>
                  {Object.keys(report.rows[0]).map((key) => (
                    <th key={key} className="whitespace-nowrap py-2">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr key={`${row[Object.keys(row)[0]] || index}-${index}`} className="border-t border-black/5">
                    {Object.values(row).map((value, valueIndex) => (
                      <td key={`${value}-${valueIndex}`} className="py-2.5 text-ink/70">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No data available for this report.</Empty>
        )}
      </Card>
    </div>
  );
}
