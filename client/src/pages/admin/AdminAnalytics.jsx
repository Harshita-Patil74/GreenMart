import React, { useEffect, useMemo, useState } from "react";
import adminApi from "../../api/adminApi";
import BackButton from "../../components/common/BackButton.jsx";
import AdminCharts from "../../components/admin/AdminCharts.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import { formatCurrency } from "../../utils/constants.js";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";

const dateValue = (date) => date.toISOString().slice(0, 10);

export default function AdminAnalytics() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const [from, setFrom] = useState(dateValue(start));
  const [to, setTo] = useState(dateValue(end));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.analytics({ from, to });
      setData(response.data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Couldn't load sales analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [from, to]);

  const totals = useMemo(() => {
    if (!data) {
      return { labels: [], values: [], revenue: 0, count: 0, average: 0, topProducts: [], categories: [] };
    }
    const trend = data.salesTrend || { labels: [], values: [] };
    return {
      labels: trend.labels || [],
      values: trend.values || [],
      revenue: data.totalSales || 0,
      count: data.totalOrders || 0,
      average: data.averageOrderValue || 0,
      topProducts: data.topSellingProducts || [],
      categories: (data.salesByCategory || []).map((c) => ({ name: c.category, count: c.revenue })),
    };
  }, [data]);

  if (error && !data) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-4 pb-10">
      <BackButton fallback="/admin/dashboard" />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-heading font-bold text-gray-900">Sales Analytics</h1>
          <p className="mt-1 text-xs text-gray-500">Sales performance and product-category insights.</p>
        </div>
        <div className="flex gap-2">
          <label className="text-[10px] text-gray-500">
            From
            <input aria-label="Analytics start date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-9 rounded-lg border px-2 text-xs" />
          </label>
          <label className="text-[10px] text-gray-500">
            To
            <input aria-label="Analytics end date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-9 rounded-lg border px-2 text-xs" />
          </label>
        </div>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error} <button onClick={load} className="underline">Retry</button>
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Total Sales", formatCurrency(totals.revenue)],
          ["Total Orders", totals.count],
          ["Average Order Value", formatCurrency(totals.average)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{loading ? "—" : value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-12">
        <section className="rounded-xl border bg-white p-4 shadow-sm xl:col-span-7">
          <h2 className="mb-3 text-sm font-semibold">Sales Overview</h2>
          {loading ? (
            <p className="text-xs text-gray-500">Loading sales...</p>
          ) : (
            <AdminCharts.SalesTrend labels={totals.labels} values={totals.values} />
          )}
        </section>
        <section className="rounded-xl border bg-white p-4 shadow-sm xl:col-span-5">
          <h2 className="mb-3 text-sm font-semibold">Sales by Category</h2>
          {loading ? (
            <p className="text-xs text-gray-500">Loading categories...</p>
          ) : (
            <AdminCharts.CategoryShare categories={totals.categories} />
          )}
        </section>
      </div>
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">Top Selling Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Units Sold</th>
                <th className="px-3 py-2">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {totals.topProducts.map((product) => (
                <tr key={product.name}>
                  <td className="flex items-center gap-2 px-3 py-2">
                    <ImageWithFallback src={getImageUrl(product.image)} alt={`${product.name} product`} className="h-8 w-8 rounded object-cover" />
                    <span className="text-gray-800">{product.name}
                      {(product.productIds || []).map((productId) => <ProductIdentifier key={productId} productId={productId} compact className="mt-1 flex" />)}
                    </span>
                  </td>
                  <td className="px-3 py-2">{product.quantity}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !totals.topProducts.length && (
            <div className="p-8 text-center text-gray-500">No product sales in this date range.</div>
          )}
        </div>
      </section>
    </div>
  );
}
