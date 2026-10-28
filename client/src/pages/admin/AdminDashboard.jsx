import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Package, ShoppingBag, Tractor, Users, FileText } from "lucide-react";
import adminApi from "../../api/adminApi";
import orderApi from "../../api/orderApi";
import productApi from "../../api/productApi";
import ErrorState from "../../components/common/ErrorState.jsx";
import AdminCharts from "../../components/admin/AdminCharts.jsx";
import { formatCurrency } from "../../utils/constants.js";

const card = "rounded-xl border border-[#E5ECE8] bg-white p-4 shadow-sm";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResponse, ordersResponse, productsResponse, alertsResponse] = await Promise.all([
        adminApi.stats(),
        orderApi.adminAll(),
        productApi.list({ limit: 100 }),
        adminApi.lowStock(),
      ]);
      setStats(statsResponse.data);
      setOrders(Array.isArray(ordersResponse.data) ? ordersResponse.data : []);
      setProducts(Array.isArray(productsResponse.data?.items) ? productsResponse.data.items : []);
      setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
    } catch (requestError) {
      setError(requestError?.message || "Couldn't load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const series = useMemo(() => {
    const now = new Date();
    const labels = [];
    const totals = [];
    const counts = [];
    for (let week = 4; week >= 0; week -= 1) {
      const start = new Date(now);
      start.setDate(now.getDate() - (week + 1) * 7);
      const end = new Date(now);
      end.setDate(now.getDate() - week * 7);
      labels.push(start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
      const weeklyOrders = orders.filter((order) => {
        const date = new Date(order.createdAt);
        return date >= start && date < end && order.status !== "Cancelled";
      });
      counts.push(weeklyOrders.length);
      totals.push(weeklyOrders.reduce((sum, order) => sum + Number(order.total || 0), 0));
    }
    return { labels, totals, counts };
  }, [orders]);
  const categories = useMemo(() => {
    const counts = products.reduce((result, product) => {
      const name = product.category || "Other";
      result[name] = (result[name] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [products]);
  const cards = [
    ["Total Products", stats?.totalProducts, Package, "/admin/products", "bg-emerald-50 text-emerald-700"],
    ["Total Orders", stats?.totalOrders, ShoppingBag, "/admin/orders", "bg-blue-50 text-blue-700"],
    ["Total Customers", stats?.totalUsers, Users, "/admin/users", "bg-rose-50 text-rose-600"],
    ["Total Farmers", stats?.totalFarmers, Tractor, "/admin/farmers", "bg-amber-50 text-amber-700"],
  ];

  if (error && !stats) return <ErrorState message={error} onRetry={load} />;
  if (loading && !stats) return <div className="text-sm text-gray-500">Loading admin dashboard...</div>;

  return (
    <div className="space-y-4 pb-10">
      <header><h1 className="text-xl font-heading font-bold text-gray-900">Admin Dashboard</h1><p className="mt-1 text-xs text-gray-500">Overview of your platform’s performance and key metrics.</p></header>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error} <button onClick={load} className="font-semibold underline">Retry</button></p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(([label, value, Icon, to, tone]) => <Link key={label} to={to} className={card}>
          <div className="flex items-center justify-between text-xs text-gray-500"><span>{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span></div>
          <div className="mt-2 text-xl font-bold text-gray-900">{value ?? "—"}</div><span className="text-[10px] text-primary">View details →</span>
        </Link>)}
      </div>
      <div className="grid gap-3 xl:grid-cols-12">
        <section className={`${card} xl:col-span-7`}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-900">Platform Overview</h2><span className="text-[10px] text-gray-400">Orders &amp; revenue · weekly</span></div><AdminCharts.SalesTrend labels={series.labels} values={series.totals} orderValues={series.counts} /></section>
        <section className={`${card} xl:col-span-5`}><h2 className="mb-3 text-sm font-semibold text-gray-900">Recent Activity</h2><div className="space-y-3">
          {alerts.slice(0, 2).map((item) => <div key={item._id} className="flex items-center gap-2 text-xs"><Boxes className="h-4 w-4 text-amber-600" /><span className="min-w-0 flex-1 truncate">{item.name} stock is low ({item.stock})</span><Link to="/admin/inventory" className="text-primary">View</Link></div>)}
          {orders.slice(0, 4).map((order) => <div key={order._id} className="flex items-center gap-2 text-xs"><ShoppingBag className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate">Order #{order.orderNumber} · {order.status}</span><span className="shrink-0 text-[10px] text-gray-400">{formatCurrency(order.total || 0)}</span></div>)}
          {!alerts.length && !orders.length && <p className="text-xs text-gray-500">No recent activity.</p>}
        </div></section>
      </div>
      <div className="grid gap-3 xl:grid-cols-12">
        <section className={`${card} xl:col-span-7`}><h2 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Manage Products","/admin/products",Package],["Manage Users","/admin/users",Users],["View Orders","/admin/orders",ShoppingBag],["View Reports","/admin/reports",FileText]].map(([label,to,Icon])=><Link key={to} to={to} className="flex min-h-16 items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 text-[11px] font-semibold text-gray-700 hover:border-emerald-200"><Icon className="h-4 w-4 text-primary"/>{label}</Link>)}
        </div></section>
        <section className={`${card} xl:col-span-5`}><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-900">Products by Category</h2><Link to="/admin/products" className="text-[10px] font-semibold text-primary">Manage</Link></div><AdminCharts.CategoryShare categories={categories}/></section>
      </div>
      <section className="relative isolate min-h-36 overflow-hidden rounded-xl bg-[#064B35]">
        <img data-testid="admin-dashboard-banner" src="/images/banners/hero-basket.jpg" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#063D2D]/95 via-[#063D2D]/75 to-[#063D2D]/25" />
        <div className="max-w-lg p-5 sm:p-6">
          <h2 className="text-sm font-bold text-white">GreenMart Organic Products</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/90">Supporting local farmers and bringing fresh produce to customers.</p>
          <Link to="/admin/products" className="mt-3 inline-flex rounded-md bg-primary px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-primary-hover">Explore Products</Link>
        </div>
      </section>
    </div>
  );
}
