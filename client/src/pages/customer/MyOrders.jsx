import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import orderApi from "../../api/orderApi";
import BackButton from "../../components/common/BackButton.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import { formatCurrency } from "../../utils/constants.js";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import { subscribeOrderStatus } from "../../socket/socketClient.js";
import toast from "react-hot-toast";
import { Search, X, Download, ArrowRight } from "lucide-react";

const statuses = ["All Orders", "Pending", "Packed", "Shipped", "Delivered", "Cancelled"];
const statusAliases = {
  Pending: ["Order Placed", "Pending"],
  Shipped: ["Shipped", "Out for Delivery"],
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("All Orders");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [downloading, setDownloading] = useState({});

  const downloadInvoice = async (order) => {
    const id = order._id || order.orderNumber;
    setDownloading((d) => ({ ...d, [order._id]: true }));
    try {
      const res = await orderApi.downloadInvoice(id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers?.["content-disposition"] || "";
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1];
      a.href = url;
      a.download = filename || `GreenMart-Invoice-${order.invoiceNumber || order.orderNumber || order._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to download invoice");
    } finally {
      setDownloading((d) => ({ ...d, [order._id]: false }));
    }
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await orderApi.mine({ search });
      setOrders(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError?.message || "Couldn't load your orders.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => subscribeOrderStatus((updated) => {
    setOrders((current) => current.map((order) => String(order._id) === String(updated?._id) ? updated : order));
  }), []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = status === "All Orders" || (statusAliases[status] || [status]).some((value) => order.status?.toLowerCase() === value.toLowerCase());
      const matchesSearch = !query || [order.orderNumber, ...(order.items || []).map((item) => item.name)].some((value) => value?.toLowerCase().includes(query));
      const date = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "";
      return matchesStatus && matchesSearch && (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
    });
  }, [orders, status, search, fromDate, toDate]);

  if (loading) return <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">Loading orders...</div>;
  if (error) return <ErrorState message={error} onRetry={loadOrders} />;

  return (
    <div className="space-y-4 pb-12">
      <BackButton fallback="/customer/dashboard" />
      <div>
        <h1 className="text-xl font-heading font-bold text-gray-900">My Orders</h1>
        <p className="mt-1 text-xs text-gray-500">Review your purchases and follow their delivery status.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
        {statuses.map((item) => (
          <button key={item} onClick={() => setStatus(item)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium ${status === item ? "bg-emerald-50 text-primary" : "text-gray-500 hover:bg-gray-50"}`}>
            {item}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <label className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search orders"
            placeholder="Search orders by ID, product, or status"
            className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs focus:border-primary focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
        <label className="flex items-center gap-2 text-[10px] text-gray-500">From<input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-xs text-gray-700" /></label>
        <label className="flex items-center gap-2 text-[10px] text-gray-500">To<input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-xs text-gray-700" /></label>
      </div>
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const items = order.items || [];
                const itemNames = items.map((item) => item.name).filter(Boolean);
                return (
                  <tr key={order._id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">#{order.orderNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="max-w-[220px] px-4 py-3 text-gray-600">
                      <span className="block truncate">{itemNames.join(", ") || "No item details"}</span>
                      <span className="text-[10px] text-gray-400">{items.length} item{items.length === 1 ? "" : "s"}</span>
                      {items.some((item) => item.fulfillmentStatus && item.fulfillmentStatus !== order.status) && (
                        <span className="mt-1 block truncate text-[10px] text-gray-500">
                          {items.map((item) => `${item.name}: ${item.fulfillmentStatus || order.status}`).join(" · ")}
                        </span>
                      )}
                      {items.find((item) => item.deliveryFailureReason)?.deliveryFailureReason && (
                        <span className="mt-1 block text-[10px] text-red-700">
                          Delivery issue: {items.find((item) => item.deliveryFailureReason).deliveryFailureReason}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">{formatCurrency(order.total || 0)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => downloadInvoice(order)} disabled={downloading[order._id]} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-50">
                        <Download className="h-3 w-3" /> {downloading[order._id] ? "Downloading..." : "Download Invoice"}
                      </button>
                      <Link to={`/track-order/${order._id}`} className="ml-3 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                        <ArrowRight className="h-3 w-3" /> Track
                      </Link>
                      <Link to={`/orders/${order._id}`} className="ml-3 font-medium text-gray-500 hover:text-primary">Details</Link>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-xs text-gray-500">
                    {orders.length ? "No orders match these filters." : "You haven't placed any orders yet."}
                    {orders.length === 0 && <Link to="/shop" className="font-semibold text-primary">Browse products</Link>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
