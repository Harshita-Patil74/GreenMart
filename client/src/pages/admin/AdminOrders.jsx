import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import BackButton from "../../components/common/BackButton.jsx";
import toast from "react-hot-toast";
import orderApi from "../../api/orderApi";
import Pagination from "../../components/common/Pagination.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import { formatCurrency } from "../../utils/constants.js";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";
import {
  orderItemTotal,
} from "../../utils/orderPricing.js";

const PAGE_SIZE = 10;
function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusOrderId, setStatusOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusCounts, setStatusCounts] = useState({});
  const [toastMsg, setToastMsg] = useState("");
  const toastTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  const getInitialStatus = (currentStatus) => {
    if (["Order Placed", "Cancelled"].includes(currentStatus)) return "Packed";
    if (currentStatus === "Packed") return "Out for Delivery";
    if (currentStatus === "Delivery Failed") return "Out for Delivery";
    return "Cancelled";
  };

  const downloadInvoice = async (id) => {
    try {
      const res = await orderApi.downloadInvoice(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `GreenMart-Invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download invoice.");
    }
  };

  const confirmStatus = async () => {
    if (!statusOrderId || !newStatus) return;
    try {
      await orderApi.updateStatus(statusOrderId, { status: newStatus, reason: reason || undefined });
      setModalOrder(null);
      setStatusOrderId("");
      setNewStatus("");
      setReason("");
      load();
    } catch {
      toast.error("Failed to update order status.");
    }
  };

  const load = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { data } = await orderApi.adminAll({ search, page, limit: pageSize, status, from, to });
      if (requestId !== requestIdRef.current) return;
      const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      setOrders(items);
      setTotal(Number(data?.total) || items.length);
      setStatusCounts(data?.statusCounts || {});
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e?.message || "Couldn't load orders.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };
  useEffect(() => { load(); }, [search, status, from, to, page, pageSize]);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const statuses = useMemo(() => Object.keys(statusCounts).filter(Boolean), [statusCounts]);
  const current = orders;
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
            className={`rounded-lg px-3 py-2 text-[10px] ${status === item ? "bg-primary text-white" : "border bg-white text-gray-600"}`}
          >
            {item || "All Orders"}
            {` (${statusCounts[item] ?? (item ? orders.filter((o) => o.status === item).length : total)})`}
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
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search orders by order/product ID, customer, product, status, or payment method" ariaLabel="Search orders" />
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
                <React.Fragment key={o._id}>
                <motion.tr key={o._id} variants={staggerItem} initial="hidden" animate="visible">
                  <td className="px-3 py-3 font-semibold">#{o.orderNumber}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "-"}</td>
                  <td className="px-3 py-3">{o.user?.name || "Customer"}</td>
                  <td className="max-w-56 px-3 py-3 text-gray-600">
                    <div className="space-y-1">
                      {(o.items || []).map((item, index) => <div key={item._id || item.product?._id || item.product || index}>
                        <span className="block truncate">{item.name || item.product?.name || "Product"}</span>
                        <ProductIdentifier productId={String(item.productId || item.product?._id || item.product?.id || "")} className="mt-0.5 flex" />
                      </div>)}
                      {!o.items?.length && "N/A"}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold">{formatCurrency(o.total || 0)}</td>
                  <td className="px-3 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => setModalOrder(o)} className="font-semibold text-primary hover:underline">
                      View Details
                    </button>
                    <button onClick={() => { setStatusOrderId(o._id || o.id); setNewStatus(getInitialStatus(o.status)); setReason(""); }} className="ml-2 text-xs text-blue-600">Update</button>
                  </td>
                </motion.tr>
                </React.Fragment>
              ))}
              {loading === false && current.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No orders match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-3 py-2">
          <Pagination page={page} pageSize={pageSize} totalRecords={total} onChange={(nextPage, nextSize) => { setPage(nextPage); if (nextSize) setPageSize(nextSize); }} />
        </div>
      </motion.section>

      {/* Order Details Modal */}
      {modalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-[1100px] max-h-[85vh] rounded-xl border border-gray-200 bg-white shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-heading font-bold text-gray-900">Order Details</h3>
                <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-semibold text-white" style={{ backgroundColor: modalOrder.status === "Delivered" ? "#10b981" : modalOrder.status === "Cancelled" ? "#ef4444" : "#245c3a" }}>
                  {modalOrder.status}
                </span>
              </div>
                <button
                onClick={() => setModalOrder(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="max-h-[60vh] overflow-y-auto py-4 px-6">
              {/* Order Information */}
              <section className="mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3">Order Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px]">
                  <div>
                    <p className="text-[#71817D] font-semibold">Order ID</p>
                    <p className="text-[#344640] truncate">#{modalOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Order Date</p>
                    <p className="text-[#344640]">{modalOrder.createdAt ? new Date(modalOrder.createdAt).toLocaleDateString("en-IN") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Customer</p>
                    <p className="text-[#344640] truncate">{modalOrder.user?.name || "Customer"}</p>
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Customer ID</p>
                    <p className="text-[#344640]">{modalOrder.user?._id || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Status</p>
                    <OrderStatusBadge status={modalOrder.status} />
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Payment Method</p>
                    <p className="text-[#344640]">{modalOrder.paymentMethod ? modalOrder.paymentMethod.charAt(0).toUpperCase() + modalOrder.paymentMethod.slice(1) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Payment Status</p>
                    <p className="text-[#344640]">{modalOrder.paymentStatus || "—"}</p>
                  </div>
                </div>
              </section>

              {/* Product Details */}
              <section className="mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3">Product Details</h4>
                <table className="w-full text-[10px] text-gray-600">
                  <thead className="bg-gray-50 text-[9px] uppercase">
                    <tr>
                      <th className="px-2 py-1.5 text-left min-w-[120px]">Product</th>
                      <th className="px-2 py-1.5 text-right w-[40px]">Qty</th>
                      <th className="px-2 py-1.5 text-left min-w-[100px] overflow-hidden">Product ID</th>
                      <th className="px-2 py-1.5 text-right min-w-[70px]">Unit Price</th>
                      <th className="px-2 py-1.5 text-right min-w-[70px]">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(modalOrder.items || []).map((item) => {
                      const itemTotal = orderItemTotal(item);
                      return (
                        <tr key={item._id || item.product?._id || item.product?.id || item.id || index} className="border-b border-gray-100 py-1.5">
                          <td className="px-2 py-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {item.product?.images?.[0] && (
                                <img src={item.product.images[0]} alt={item.name} className="h-6 w-6 rounded object-cover" />
                              )}
                              <span className="text-[10px] truncate">{item.name || item.product?.name || "Product"}</span>
                              <ProductIdentifier productId={String(item.productId || item.product?._id || item.product?.id || "")} className="ml-1 h-3 w-3" />
                              {item.offerSnapshot?.offerTitle && (
                                <span className="block text-[9px] text-emerald-700">{item.offerSnapshot.offerTitle}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-right">{item.quantity}</td>
                          <td className="px-2 py-1 text-right whitespace-nowrap overflow-hidden text-ellipsis max-w-[72px]">{String(item.productId || item.product?._id || item.product?.id || "") || "—"}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(item.price || 0)}</td>
                          <td className="px-2 py-1 text-right font-semibold">{formatCurrency(itemTotal)}</td>
                        </tr>
                      );
                    })}
                    {!modalOrder.items?.length && (
                      <tr>
                        <td colSpan="5" className="px-2 py-2 text-center text-[9px] text-gray-500">No items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              {/* Financial Summary */}
              <section className="mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3">Financial Summary</h4>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#71817D] font-semibold">Original Product Subtotal</span>
                    <span className="text-[#344640]">{formatCurrency(modalOrder.subtotal || 0)}</span>
                  </div>
                  {(modalOrder.discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span className="font-semibold">Total Discount</span>
                      <span>− {formatCurrency(modalOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#71817D] font-semibold">Delivery Charge</span>
                    <span className="text-[#344640] font-semibold text-[#087449]">{formatCurrency(modalOrder.deliveryCharge || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 font-bold">
                    <span>Final Payable Amount</span>
                    <span className="text-[#245c3A] font-bold">{formatCurrency(modalOrder.total || 0)}</span>
                  </div>
                </div>
              </section>

              {/* Customer Delivery Address */}
              <section className="mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3">Customer Delivery Address</h4>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-[10px] text-gray-600">
                  <p className="font-semibold text-gray-900 mb-1">{modalOrder.address?.name || "Customer"}</p>
                  <p>{modalOrder.address?.line1 || ""}</p>
                  <p>{modalOrder.address?.city || ""}</p>
                  <p>{modalOrder.address?.phone || ""}</p>
                </div>
              </section>

              {/* Order Delivery Information */}
              <section className="mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3">Order Delivery Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                  <div>
                    <p className="text-[#71817D] font-semibold">Delivery Option</p>
                    <p className="text-[#344640]">{modalOrder.deliverySnapshot?.option || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Order Distance</p>
                    <p className="text-[#344640]">{modalOrder.deliverySnapshot?.distanceKm != null ? modalOrder.deliverySnapshot.distanceKm.toFixed(2) + " km" : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#71817D] font-semibold">Delivery Charge</p>
                    <p className="text-[#344640] font-semibold text-[#087449]">{modalOrder.deliverySnapshot?.charge != null ? formatCurrency(modalOrder.deliverySnapshot.charge) : (modalOrder.deliveryCharge != null ? formatCurrency(modalOrder.deliveryCharge) : "—")}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[#71817D] font-semibold">Customer Address</p>
                    <p className="text-[#344640]">{[modalOrder.address?.line1, modalOrder.address?.city].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                  <div className="sm:col-span-4">
                    <p className="text-[#71817D] font-semibold">Dispatch Locations</p>
                    {modalOrder.deliverySnapshot?.dispatchLocations && modalOrder.deliverySnapshot.dispatchLocations.length > 0 ? (
                      <ul className="mt-1 space-y-1 text-[10px] text-[#52615D]">
                        {modalOrder.deliverySnapshot.dispatchLocations.map((dl, i) => (
                          <li key={i} className="flex justify-between">
                            <span className="flex flex-col gap-0.5">
                              <span className="font-semibold text-[#344640]">{dl.farmerName || `Shipment ${i + 1}`}</span>
                              {dl.farmName && <span className="text-[9px] text-[#71817D]">{dl.farmName}</span>}
                              {dl.farmAddress && <span className="text-[9px] text-[#71817D]">{dl.farmAddress}</span>}
                              {dl.location?.lat != null && dl.location?.lng != null && (
                                <span className="text-[9px] text-[#71817D]">{dl.location.lat}, {dl.location.lng}</span>
                              )}
                            </span>
                            <span className="text-[#344640] font-semibold">{dl.distanceKm != null ? dl.distanceKm.toFixed(2) + " km" : "—"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[9px] text-[#71817D]">No dispatch locations recorded.</p>
                    )}
                  </div>
                </div>
                {modalOrder.deliverySnapshot?.settingsSnapshot && (
                  <div className="mt-2 pt-2 border-t border-[#EEF1F0]">
                    <p className="text-[9px] text-[#71817D]">Settings at time of order</p>
                    <div className="flex justify-between text-[10px] text-[#71817D] mt-1">
                      <span>Max Remote Distance</span>
                      <span>{modalOrder.deliverySnapshot.settingsSnapshot.maxRemoteDistanceKm} km</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#71817D]">
                      <span>Express Max Distance</span>
                      <span>{modalOrder.deliverySnapshot.settingsSnapshot.expressMaxKm} km</span>
                    </div>
                  </div>
                )}
                {!modalOrder.deliverySnapshot && (
                  <p className="text-[10px] text-[#71817D] mt-1">Delivery information unavailable for this order.</p>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalOrder(null)}
                className="rounded-lg px-3 py-1.5 text-[10px] text-gray-600 border border-gray-200 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => downloadInvoice(modalOrder._id || modalOrder.id)}
                className="rounded-lg px-3 py-1.5 text-[10px] text-gray-700 border border-gray-200 hover:bg-gray-100"
              >
                Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Status Update Modal */}
      {statusOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl p-5">
            <h3 className="text-lg font-heading font-bold text-gray-900 mb-1">Update Status</h3>
            <p className="text-[10px] text-gray-500 mb-4">
              Order #{current.find((o) => (o._id || o.id) === statusOrderId)?.orderNumber || statusOrderId} current: {newStatus}
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-10 rounded border border-gray-300 bg-white px-3 text-[10px] text-gray-900 focus:outline-none focus:border-primary"
            >
              <option value="Order Placed">Order Placed</option>
              <option value="Packed">Packed</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Delivery Failed">Delivery Failed</option>
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason"
              className="mt-3 w-full h-20 rounded border border-gray-300 bg-white px-3 py-2 text-[10px] text-gray-900 focus:outline-none focus:border-primary"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setStatusOrderId(""); setNewStatus(""); setReason(""); }}
                className="rounded-lg px-3 py-1.5 text-[10px] text-gray-600 border border-gray-200 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatus}
                className="rounded-lg px-3 py-1.5 text-[10px] text-white bg-primary hover:bg-[#1e6a34]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

export default AdminOrders;
