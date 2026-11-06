import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import { Link } from "react-router-dom";
import orderApi from "../../api/orderApi";
import BackButton from "../../components/common/BackButton.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import { formatCurrency } from "../../utils/constants.js";

const PAGE_SIZE = 10;
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
const [toastMsg, setToastMsg] = useState("");

  const getInitialStatus = (currentStatus) => {
    if (["Order Placed", "Cancelled"].includes(currentStatus)) return "Packed";
    if (currentStatus === "Packed") return "Out for Delivery";
    if (currentStatus === "Out for Delivery") return "Delivered";
    if (currentStatus === "Delivery Failed") return "Out for Delivery";
    return "Cancelled";
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await orderApi.adminAll({ search, page, limit: PAGE_SIZE });
      const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      setOrders(items);
    } catch (e) {
      setError(e?.message || "Couldn't load orders.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [search, status, from, to, page]);
  const statuses = useMemo(() => [...new Set(orders.map((o) => o.status).filter(Boolean))], [orders]);
  const filtered = useMemo(() => orders.filter((o) => {
    const date = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "";
    return (!status || o.status === status) && (!from || date >= from) && (!to || date <= to);
  }), [orders, status, from, to]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (error && !orders.length) return <div className="p-4 text-red-700">{error} <button onClick={load} className="underline">Retry</button></div>;
  return (
    <div className="space-y-4 pb-10">
      <BackButton fallback="/admin/dashboard" />
      <motion.header
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-xl font-heading font-bold text-gray-900">Order Monitoring</h1>
        <p className="mt-1 text-xs text-gray-500">Review platform orders and their current processing status.</p>
      </motion.header>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error} <button onClick={load} className="underline">Retry</button>
        </p>
      )}
      {toastMsg && (
        <p role="alert" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {toastMsg}
        </p>
      )}
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap gap-2"
      >
        {["", ...statuses].map((item) => (
          <button
            key={item || "all"}
            onClick={() => { setStatus(item); setPage(1); }}
            className={`rounded-lg px-3 py-2 text-[11px] ${status === item ? "bg-primary text-white" : "border bg-white text-gray-600"}`}
          >
            {item || "All Orders"}
            {item ? ` (${orders.filter((o) => o.status === item).length})` : ` (${orders.length})`}
          </button>
        ))}
      </motion.div>
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      >
        <div className="flex flex-wrap gap-2 border-b p-3">
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search orders by ID, customer, product, status, or payment method" ariaLabel="Search orders" />
          <label className="flex items-center gap-1 text-[10px] text-gray-500">
            From
            <input aria-label="From date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-9 rounded-lg border px-2 text-xs" />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-gray-500">
            To
            <input aria-label="To date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-9 rounded-lg border px-2 text-xs" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <th className="px-3 py-3">Order ID</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Products</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100" variants={staggerContainer} initial="hidden" animate="visible">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">Loading orders...</td>
                </tr>
              ) : current.map((o) => (
                <motion.tr key={o._id} variants={staggerItem} initial="hidden" animate="visible">
                  <td className="px-3 py-3 font-semibold">#{o.orderNumber}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "-"}</td>
                  <td className="px-3 py-3">{o.user?.name || "Customer"}</td>
                  <td className="max-w-48 truncate px-3 py-3 text-gray-600">
                    {(o.items || []).map((item) => item.name).filter(Boolean).join(", ") || "N/A"}
                  </td>
                  <td className="px-3 py-3 font-semibold">{formatCurrency(o.total || 0)}</td>
<td className="px-3 py-3">
  <OrderStatusBadge status={o.status} />
</td>
                  <td className="px-3 py-3">
                    <Link to={`/orders/${o._id}`} className="font-semibold text-primary hover:underline">View</Link>
                    <button onClick={() => { setModalOrder(o); setNewStatus(getInitialStatus(o.status)); setReason(""); }} className="ml-2 text-xs text-blue-600">Update</button>
                  </td>
                </motion.tr>
              ))}
              {loading === false && current.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No orders match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[10px] text-gray-500">
          <span>
            {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            {page}/{pages}
            <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </motion.section>
      {modalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <p className="text-sm font-semibold">Update Status</p>
            <p className="text-xs text-gray-500">Order #{modalOrder.orderNumber} current: {modalOrder.status}</p>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-xs">
              {(["Order Placed", "Cancelled"].includes(modalOrder.status) ? ["Packed", "Cancelled"] : modalOrder.status === "Packed" ? ["Out for Delivery", "Cancelled"] : modalOrder.status === "Out for Delivery" ? ["Delivered", "Delivery Failed", "Cancelled"] : ["Out for Delivery", "Cancelled"]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-xs" placeholder="Optional reason" />
            <div className="mt-3 flex gap-2">
              <button disabled={saving} onClick={async () => {
                setSaving(true);
                try {
                  await orderApi.updateStatus(modalOrder._id, { status: newStatus, reason });
                  setModalOrder(null);
                  setToastMsg("Status updated");
                  load();
                  setTimeout(() => setToastMsg(""), 3000);
                } catch (e) {
                  setError(e?.response?.data?.message || e.message);
                } finally {
                  setSaving(false);
                }
              }} className="rounded bg-primary px-3 py-1 text-xs text-white disabled:opacity-50">
                {saving ? "Saving..." : "Confirm"}
              </button>
              <button onClick={() => setModalOrder(null)} className="rounded border px-3 py-1 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
