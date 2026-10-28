import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { AlertTriangle, ArrowRight, Boxes, ClipboardList, MapPin, Package, Plus, ShoppingBag, Wallet } from "lucide-react";
import farmerApi from "../../api/farmerApi";
import orderApi from "../../api/orderApi";
import productApi from "../../api/productApi";
import getImageUrl from "../../utils/imageUrl";
import { formatCurrency, formatDate, getOrderAmount, getOrderStatus, getOwnedItems, unwrapList } from "./farmerUtils";

function salesSeries(orders, farmerId, days) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  const values = Array.from({ length: 7 }, () => 0);
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    if (Number.isNaN(date.getTime()) || date < start || date > now) return;
    const index = Math.min(6, Math.floor(((date - start) / (now - start || 1)) * 7));
    values[index] += getOrderAmount(order, farmerId);
  });
  return values;
}

export default function FarmerDashboard() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const farmerId = user?._id || user?.id;
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState(7);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, orderResponse, farmResponse] = await Promise.all([
        productApi.mine(),
        orderApi.farmer(),
        farmerId ? farmerApi.get(farmerId) : Promise.resolve({ data: null }),
      ]);
      setProducts(unwrapList(productResponse.data));
      setOrders(unwrapList(orderResponse.data));
      setFarm(farmResponse.data || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAdmin) {
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [farmerId, isAdmin]);

  const metrics = useMemo(() => {
    const ownedOrders = orders.filter((order) => getOwnedItems(order, farmerId).length);
    const pendingOrders = ownedOrders.filter((order) => getOrderStatus(order.status) === "Pending").length;
    const earnings = ownedOrders
      .filter((order) => getOrderStatus(order.status) === "Delivered")
      .reduce((total, order) => total + getOrderAmount(order, farmerId), 0);
    const lowStock = products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= Number(product.lowStockThreshold ?? 5)).length
      + products.filter((product) => Number(product.stock) <= 0).length;
    return { productCount: products.length, pendingOrders, earnings, lowStock, ownedOrders };
  }, [products, orders, farmerId]);

  const chartValues = useMemo(() => salesSeries(orders, farmerId, range), [orders, farmerId, range]);
  const chartPoints = useMemo(() => {
    const highest = Math.max(...chartValues, 0);
    return chartValues.map((value, index) => {
      const x = 2 + index * (96 / Math.max(1, chartValues.length - 1));
      const y = highest ? 38 - (value / highest) * 33 : 38;
      return `${x},${y}`;
    }).join(" ");
  }, [chartValues]);
  const recentOrders = metrics.ownedOrders.slice(0, 4);

  if (isAdmin) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-[#DCE9E0] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#16804A]">GreenMart administration</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#172A27]">Farmer Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#71817D]">
          Platform-wide farmer verification and management are available in the authorized admin workspace.
        </p>
        <Link to="/admin/farmers" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#08764B] px-4 text-sm font-semibold text-white hover:bg-[#06643F]">
          Manage farmers <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-3.5 pb-5 text-[13px] text-[#20312E]">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Farmer Dashboard</h1>
        <p className="mt-1 text-xs text-[#71817D]">Welcome back, {user?.name || "Farmer"}. Here's what's happening with your farm and products.</p>
      </header>

      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error} <button type="button" onClick={loadDashboard} className="ml-2 font-semibold underline">Try again</button></div>}

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          { label: "Total Products", value: metrics.productCount, note: "Products in your catalog", icon: Package, accent: "text-[#07925B]", iconBg: "bg-emerald-50" },
          { label: "Pending Orders", value: metrics.pendingOrders, note: "Orders awaiting action", icon: ShoppingBag, accent: "text-[#D88A0A]", iconBg: "bg-amber-50" },
          { label: "Total Earnings", value: formatCurrency(metrics.earnings), note: "From delivered orders", icon: Wallet, accent: "text-[#1685A5]", iconBg: "bg-cyan-50" },
          { label: "Low Stock Items", value: metrics.lowStock, note: "Products to restock", icon: AlertTriangle, accent: "text-[#DF6A17]", iconBg: "bg-orange-50" },
        ].map(({ label, value, note, icon: Icon, accent, iconBg }) => (
          <div key={label} className="rounded-lg border border-[#E7EEEC] bg-white p-3 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-[10px] text-[#788681]">{label}</p><p className="mt-1 text-lg font-bold leading-none text-[#20312E]">{loading || error ? "—" : value}</p></div>
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${iconBg} ${accent}`}><Icon size={16} /></span>
            </div>
            <p className="mt-2 text-[9px] text-[#8A9692]">{note}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "16px", width: "100%", alignItems: "stretch" }} className="grid-cols-1">
        <section className="rounded-lg border border-[#E7EEEC] bg-white p-3.5 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div><h2 className="text-xs font-semibold text-[#2C3E39]">Sales Overview</h2><p className="text-[9px] text-[#86938E]">Order totals from your products</p></div>
            <select aria-label="Sales date range" value={range} onChange={(event) => setRange(Number(event.target.value))} className="h-7 rounded border border-[#E0E8E4] bg-white px-2 text-[10px] text-[#64736E]">
              <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
            </select>
          </div>
          {loading ? <div className="flex h-28 items-center justify-center text-[10px] text-[#82908B]">Loading sales data…</div> : error ? <div className="flex h-28 items-center justify-center text-[10px] text-[#82908B]">Sales data unavailable.</div> : (
            <div className="relative h-28 pl-8">
              <div className="absolute inset-y-1 left-0 flex flex-col justify-between text-[8px] text-[#91A09B]">
                <span>{formatCurrency(Math.max(...chartValues, 0))}</span><span>{formatCurrency(0)}</span>
              </div>
              <svg role="img" aria-label={`Sales overview for the last ${range} days`} viewBox="0 0 100 42" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                {[5, 16, 27, 38].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#E8EFEC" strokeWidth="0.4" />)}
                <polyline points={chartPoints} fill="none" stroke="#11A36A" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
                {chartPoints.split(" ").map((point, index) => {
                  const [cx, cy] = point.split(",");
                  return <circle key={index} cx={cx} cy={cy} r="0.9" fill="#fff" stroke="#11A36A" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              <div className="mt-1 flex justify-between text-[8px] text-[#91A09B]"><span>{range} days ago</span><span>Today</span></div>
            </div>
          )}
        </section>        <section className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">          <div className="flex items-center justify-between px-3.5 py-3">            <h2 className="text-xs font-semibold text-[#2C3E39]">Recent Orders</h2>
            <Link to="/farmer/orders" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#07814E]">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[10px]">
              <thead className="border-y border-[#EDF1F0] bg-[#F7F9F8] text-[9px] font-semibold text-[#7A8883]">
                <tr><th className="px-3 py-2">Order ID</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Status</th><th className="px-3 py-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-[#F0F3F2]">
                {!loading && !error && recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="px-3 py-2 font-medium text-[#455650]">{order.orderNumber || `#${String(order._id || "").slice(-7)}`}</td>
                    <td className="px-2 py-2 text-[#75837E]">{formatDate(order.createdAt, { day: "numeric", month: "short" })}</td>
                    <td className="px-2 py-2"><span className="rounded-full bg-[#E9F6EF] px-1.5 py-0.5 text-[9px] font-semibold text-[#168254]">{getOrderStatus(order.status)}</span></td>
                    <td className="px-3 py-2 text-right font-semibold text-[#44564F]">{formatCurrency(getOrderAmount(order, farmerId))}</td>
                  </tr>
                ))}
                {!loading && error && <tr><td colSpan="4" className="px-3 py-7 text-center text-[10px] text-[#87938F]">Order data unavailable.</td></tr>}
                {!loading && !error && !recentOrders.length && <tr><td colSpan="4" className="px-3 py-7 text-center text-[10px] text-[#87938F]">No orders yet.</td></tr>}
                {loading && <tr><td colSpan="4" className="px-3 py-7 text-center text-[10px] text-[#87938F]">Loading orders…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-[#E7EEEC] bg-white p-3.5 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
          <h2 className="mb-2.5 text-xs font-semibold text-[#2C3E39]">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Add Product", path: "/farmer/products/new", icon: Plus },
              { label: "Manage Products", path: "/farmer/products", icon: Package },
              { label: "View Orders", path: "/farmer/orders", icon: ClipboardList },
              { label: "Update Inventory", path: "/farmer/inventory", icon: Boxes },
            ].map(({ label, path, icon: Icon }) => (
              <Link key={path} to={path} className="flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#E3ECE7] bg-white px-2 text-center text-[10px] font-medium text-[#38524A] hover:border-[#B7DACA] hover:bg-[#F5FAF7]">
                <Icon size={13} className="shrink-0 text-[#07814E]" /> {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
          <div className="flex h-full min-h-[128px] flex-col sm:flex-row">
            <img src={getImageUrl(farm?.photo || "/images/default-farm.jpg")} alt={farm?.farmName || "Farm"} className="h-28 w-full object-cover sm:h-auto sm:w-[42%]" />
            <div className="flex flex-1 flex-col justify-center p-3">
              <p className="text-[9px] font-medium uppercase tracking-wide text-[#82908B]">Farm Information</p>
              <h2 className="mt-1 text-xs font-semibold text-[#2C3E39]">{loading ? "Loading farm details…" : error ? "Farm information unavailable" : farm?.farmName || "Farm details not added"}</h2>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-[#7A8883]"><MapPin size={11} /> {loading ? "Loading location…" : error ? "Please try loading again" : farm?.address || "Add your farm location"}</p>
              <Link to="/farmer/profile" className="mt-2 inline-flex h-7 items-center justify-center rounded bg-[#07814E] px-2.5 text-[10px] font-semibold text-white hover:bg-[#066B42]">View Farm Profile</Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}











