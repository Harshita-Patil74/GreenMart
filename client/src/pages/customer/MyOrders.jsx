import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import orderApi from "../../api/orderApi";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import { formatCurrency } from "../../utils/constants.js";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { subscribeOrderStatus } from "../../socket/socketClient.js";
import toast from "react-hot-toast";
import { Search, X, Download, ArrowRight } from "lucide-react";
import { showConfirm, showSuccess, showError } from "../../utils/alertUtils";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";

const statuses = ["All Orders", "Pending", "Packed", "Shipped", "Delivered", "Cancelled"];
export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [status, setStatus] = useState("All Orders");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [downloading, setDownloading] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const ordersRequest = useRef(0);

  useEffect(() => {
    const normalizedSearch = search.trim();
    const timeoutId = setTimeout(() => {
      if (normalizedSearch !== submittedSearch) {
        setPage(1);
        setSubmittedSearch(normalizedSearch);
      }
    }, 450);
    return () => clearTimeout(timeoutId);
  }, [search, submittedSearch]);

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

  const cancelOrder = async (order) => {
    const cancellable = ["Order Placed", "Packed", "Out for Delivery"];
    if (!cancellable.includes(order.status)) {
      showError("Cannot cancel", `Orders with status "${order.status}" cannot be cancelled.`);
      return;
    }
    const confirmed = await showConfirm("Cancel order?", `Are you sure you want to cancel order #${order.orderNumber}?`);
    if (!confirmed.isConfirmed) return;
    try {
      await orderApi.updateStatus(order._id, { status: "Cancelled", reason: "Cancelled by customer" });
      await loadOrders();
      showSuccess("Cancelled", `Order #${order.orderNumber} has been cancelled.`);
    } catch (e) {
      showError("Cancel failed", e?.message || "Couldn't cancel the order.");
    }
  };

  const loadOrders = useCallback(async () => {
    const requestId = ++ordersRequest.current;
    setLoading(true);
    setError(null);
    try {
      const { data } = await orderApi.mine({
        page,
        limit: pageSize,
        search: submittedSearch,
        status: status === "All Orders" ? undefined : status,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      if (requestId !== ordersRequest.current) return;
      setOrders(Array.isArray(data?.items) ? data.items : data);
      setTotal(data?.total || 0);
    } catch (requestError) {
      if (requestId !== ordersRequest.current) return;
      setError(requestError?.message || "Couldn't load your orders.");
    } finally {
      if (requestId === ordersRequest.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, [submittedSearch, status, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    loadOrders();
    return () => { ordersRequest.current += 1; };
  }, [loadOrders]);
  useEffect(() => subscribeOrderStatus((updated) => {
    setOrders((current) => current.map((order) => String(order._id) === String(updated?._id) ? updated : order));
  }), []);

  if (loading && !hasLoaded) return <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">Loading orders...</div>;
  if (error) return <ErrorState message={error} onRetry={loadOrders} />;

  return (
    <div className="space-y-4 pb-12">
      <BackButton fallback="/customer/dashboard" />
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="space-y-1"
      >
        <h1 className="text-xl font-heading font-bold text-gray-900">My Orders</h1>
        <p className="mt-1 text-xs text-gray-500">Review your purchases and follow their delivery status.</p>
      </motion.div>
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1 shadow-sm"
      >
        {statuses.map((item) => (
          <button key={item} onClick={() => { setStatus(item); setPage(1); }} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium ${status === item ? "bg-emerald-50 text-primary" : "text-gray-500 hover:bg-gray-50"}`}>
            {item}
          </button>
        ))}
      </motion.div>
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
      >
        <label className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search orders"
            placeholder="Search orders by order/product ID, product, or status"
            className="h-9 w-full appearance-none rounded-lg border border-gray-200 pl-9 pr-9 text-xs focus:border-primary focus:outline-none"
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
        <label className="flex items-center gap-2 text-[10px] text-gray-500">From<input aria-label="From date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-gray-200 px-2 text-xs text-gray-700" /></label>
        <label className="flex items-center gap-2 text-[10px] text-gray-500">To<input aria-label="To date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-gray-200 px-2 text-xs text-gray-700" /></label>
      </motion.div>
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      >
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
            <tbody className="divide-y divide-gray-100" variants={staggerContainer} initial="hidden" animate="visible">
              {orders.map((order) => {
                const items = order.items || [];
                return (
                  <motion.tr key={order._id} variants={staggerItem} initial="hidden" animate="visible" className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">#{order.orderNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="max-w-[220px] px-4 py-3 text-gray-600">
                      {items.length ? <div className="space-y-1">
                        {items.map((item, index) => <div key={item._id || item.product?._id || item.product || index} className="min-w-0">
                          <span className="block truncate">{item.name || item.product?.name || "Product"}</span>
                          <ProductIdentifier productId={item.productId || item.product} className="mt-0.5 flex" />
                        </div>)}
                      </div> : <span className="block">No item details</span>}
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
                      {["Order Placed", "Packed", "Out for Delivery"].includes(order.status) && (
                        <button onClick={() => cancelOrder(order)} disabled={downloading[order._id]} className="ml-3 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-800">
                          Cancel
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-xs text-gray-500">
                    {submittedSearch || status !== "All Orders" || fromDate || toDate
                      ? "No orders match these filters."
                      : <>You haven't placed any orders yet. <Link to="/shop" className="font-semibold text-primary">Browse products</Link></>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.section>
      {!loading && total > 0 && (
        <Pagination page={page} pageSize={pageSize} totalRecords={total} onChange={(p, ps) => { setPage(p); if (ps) setPageSize(ps); }} />
      )}
    </div>
  );
}
