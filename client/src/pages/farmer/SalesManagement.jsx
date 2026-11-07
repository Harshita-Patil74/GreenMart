import React, { useEffect, useMemo, useState } from "react";
import farmerApi from "../../api/farmerApi";
import BackButton from "../../components/common/BackButton.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { TrendingUp, DollarSign, Package, LayoutGrid, RotateCcw } from "lucide-react";

const DAY_OPTIONS = [7, 30, 90];

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

export default function SalesManagement() {
  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [o, s, a] = await Promise.all([
          farmerApi.salesOverview(),
          farmerApi.sales({ page, limit: pageSize }),
          farmerApi.analytics({ days }),
        ]);
        setOverview(o.data);
        const sdata = s.data;
        setSales(Array.isArray(sdata?.items) ? sdata.items : []);
        setTotal(Number(sdata?.total) || 0);
        setAnalytics(a.data);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || "We couldn't load sales data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize, days]);

  const chartData = useMemo(() => {
    if (!analytics || !analytics.byDate) return { labels: [], datasets: [] };
    const labels = Object.keys(analytics.byDate).sort();
    return {
      labels,
      datasets: [{
        label: "Revenue (INR)",
        data: labels.map((d) => analytics.byDate[d]),
        borderColor: "#16803C",
        backgroundColor: "rgba(22, 128, 60, 0.1)",
        fill: true,
        tension: 0.4,
      }],
    };
  }, [analytics]);

  const categoryData = useMemo(() => {
    if (!analytics || !analytics.topCategories) return { labels: [], datasets: [] };
    const sorted = [...analytics.topCategories].sort((a, b) => a.revenue - b.revenue).slice(0, 6);
    return {
      labels: sorted.map((c) => c.category),
      datasets: [{
        label: "Revenue by Category",
        data: sorted.map((c) => c.revenue),
        backgroundColor: ["#16803C", "#477A4E", "#6FA862", "#9CC89E", "#C7E3CD", "#EAF2E7"],
      }],
    };
  }, [analytics]);

  const productData = useMemo(() => {
    if (!analytics || !analytics.topProducts) return { labels: [], datasets: [] };
    const sorted = [...analytics.topProducts].sort((a, b) => a.units - b.units).slice(0, 6);
    return {
      labels: sorted.map((p) => p.name),
      datasets: [{
        label: "Units Sold",
        data: sorted.map((p) => p.units),
        backgroundColor: "#16803C",
      }],
    };
  }, [analytics]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => "\u20B9" + v } } },
  };

  const doughnutOptions = useMemo(() => ({
    ...commonOptions,
    plugins: { ...commonOptions.plugins, legend: { position: "bottom", labels: { font: { size: 10 } } } },
  }), [commonOptions]);

  if (loading) {
    return (
      <section className="space-y-4 pb-5 text-sm text-[#20312E]">
        <BackButton fallback="/farmer/dashboard" />
        <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Sales Analytics</h1>
        <p className="p-10 text-center text-xs text-[#778681]">Loading sales analytics?</p>
      </section>
    );
  }

  const rev = analytics?.revenue ?? overview?.totalRevenue ?? 0;
  const ord = analytics?.orders ?? overview?.totalOrders ?? 0;
  const unt = analytics?.units ?? overview?.totalQuantitySold ?? 0;

  return (
    <section className="space-y-5 pb-8 text-sm text-[#20312E]">
      <BackButton fallback="/farmer/dashboard" />
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Sales Analytics</h1>
          <p className="mt-1 text-xs text-[#71817D]">Track revenue, orders, and top-performing products.</p>
        </div>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-semibold border ${days === d ? "bg-[#16803C] border-[#16803C] text-white" : "bg-white border-[#DDE6E2] text-[#41514D] hover:bg-[#F0F5F2]"}`}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
          <button type="button" onClick={() => window.location.reload()} className="mt-2 underline font-semibold text-[#07814E]">Retry</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E7EEEC] bg-white p-4">
          <div className="flex items-center gap-3"><div className="p-2 rounded-md bg-[#EAF2E7] text-[#16803C]"><DollarSign size={18} /></div><span className="text-[10px] font-semibold text-[#71817D] uppercase">Total Revenue</span></div>
          <div className="mt-2 text-2xl font-bold text-[#172A27]">{formatCurrency(rev)}</div>
        </div>
        <div className="rounded-xl border border-[#E7EEEC] bg-white p-4">
          <div className="flex items-center gap-3"><div className="p-2 rounded-md bg-[#EAF2E7] text-[#16803C]"><Package size={18} /></div><span className="text-[10px] font-semibold text-[#71817D] uppercase">Total Orders</span></div>
          <div className="mt-2 text-2xl font-bold text-[#172A27]">{ord}</div>
        </div>
        <div className="rounded-xl border border-[#E7EEEC] bg-white p-4">
          <div className="flex items-center gap-3"><div className="p-2 rounded-md bg-[#EAF2E7] text-[#16803C]"><Package size={18} /></div><span className="text-[10px] font-semibold text-[#71817D] uppercase">Units Sold</span></div>
          <div className="mt-2 text-2xl font-bold text-[#172A27]">{unt}</div>
        </div>
        <div className="rounded-xl border border-[#E7EEEC] bg-white p-4">
          <div className="flex items-center gap-3"><div className="p-2 rounded-md bg-[#EAF2E7] text-[#16803C]"><LayoutGrid size={18} /></div><span className="text-[10px] font-semibold text-[#71817D] uppercase">Avg. Order Value</span></div>
          <div className="mt-2 text-2xl font-bold text-[#172A27]">{formatCurrency(ord > 0 ? rev / ord : 0)}</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-[#E7EEEC] bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-[#172A27]">Revenue Over Time</span>
            <div className="text-[10px] text-[#71817D]">? per day</div>
          </div>
          <div className="h-64"><Line data={chartData} options={commonOptions} /></div>
        </div>
        <div className="rounded-xl border border-[#E7EEEC] bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-[#172A27]">Sales by Category</span>
            <div className="text-[10px] text-[#71817D]">Top categories</div>
          </div>
            <div className="h-64"><Doughnut data={categoryData} options={doughnutOptions} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E7EEEC] bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-[#172A27]">Top Selling Products</span>
          <div className="text-[10px] text-[#71817D]">By units sold</div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {analytics?.topProducts?.slice(0, 6).map((p) => (
            <div key={p.name} className="flex items-center justify-between p-2 rounded border border-[#EDF1F0] bg-[#FAF8F1]">
              <div>
                <div className="text-xs font-medium text-[#172A27]">{p.name}</div>
                <div className="text-[10px] text-[#71817D]">{formatCurrency(p.revenue)} revenue</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#16803C]">{p.units} units</div>
              </div>
            </div>
          ))}
          {!analytics?.topProducts?.length && <p className="text-xs text-center text-[#71817D] py-4">No top products yet.</p>}
        </div>
        <div className="h-64 mt-4"><Bar data={productData} options={commonOptions} /></div>
      </div>

      <div className="rounded-xl border border-[#E7EEEC] bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-[#172A27]">Recent Sales</span>
          <div className="text-[10px] text-[#71817D]">Orders containing your products</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF1F0] bg-[#F7F9F8] text-[10px] font-semibold uppercase tracking-wide text-[#71817D]">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Products</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F0]">
              {sales.map((s) => {
                const items = (s.items || []).filter((it) => String(it.farmer) === String(s.items[0]?.farmer));
                 const amount = items.reduce((sum, it) => sum + (Number((it.offerSnapshot?.finalLineTotal ?? it.price) || 0) * Number(it.quantity || 0)), 0);
                const names = items.map((it) => it.name || "Product").join(", ");
                return (
                  <tr key={s._id} className="h-[56px] hover:bg-[#FBFCFC]">
                    <td className="px-3 py-2 font-medium text-[#344640]">#{String(s.orderNumber || s._id).slice(-6)}</td>
                    <td className="px-3 py-2 text-[#74827E]">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "?"}</td>
                    <td className="px-3 py-2 text-[#52615D]">Customer</td>
                    <td className="px-3 py-2 text-[#52615D] max-w-[200px] truncate">{names}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#344640]">{formatCurrency(amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${s.status === "Delivered" ? "bg-emerald-50 text-emerald-700" : s.status === "Cancelled" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!sales.length && <tr><td colSpan="6" className="px-3 py-8 text-center text-xs text-[#82908B]">No recent sales.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px] text-[#71817D]">Showing {sales.length} of {total} orders</span>
          <Pagination page={page} pageSize={pageSize} totalRecords={total} onChange={(nextPage, nextSize) => { setPage(nextPage); if (nextSize) setPageSize(nextSize); }} />
        </div>
      </div>
    </section>
  );
}
