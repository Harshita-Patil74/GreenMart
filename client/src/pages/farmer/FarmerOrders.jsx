import React, { useEffect, useMemo, useState } from "react";
import BackButton from "../../components/common/BackButton.jsx";
import orderApi from "../../api/orderApi";
import { formatCurrency, formatDate, getOrderAmount, getOrderStatus, getOwnedItems, getStatusClasses, unwrapList } from "./farmerUtils";
import { useSelector } from "react-redux";
import { LoaderCircle, Search } from "lucide-react";
const filters = ["All Orders", "Pending", "Packed", "Shipped", "Delivered", "Delivery Failed", "Cancelled"];
const nextActions = {
  "Order Placed": [{ status: "Packed", label: "Mark as Packed" }, { status: "Cancelled", label: "Cancel Order", confirm: "Cancel this order? This cannot be undone." }],
  Packed: [{ status: "Out for Delivery", label: "Mark as Out for Delivery" }, { status: "Cancelled", label: "Cancel Order", confirm: "Cancel this order? This cannot be undone." }],
  "Out for Delivery": [
    { status: "Delivered", label: "Mark as Delivered", confirm: "Confirm that this order was successfully delivered." },
    { status: "Delivery Failed", label: "Mark as Delivery Failed" },
    { status: "Cancelled", label: "Cancel Order", confirm: "Cancel this order before delivery? This cannot be undone." },
  ],
  "Delivery Failed": [
    { status: "Out for Delivery", label: "Retry Delivery" },
    { status: "Cancelled", label: "Cancel Order", confirm: "Cancel this order before delivery? This cannot be undone." },
  ],
};

export default function FarmerOrders() {
  const { user } = useSelector((state) => state.auth);
  const farmerId = user?._id || user?.id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Orders");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedOrder, setExpandedOrder] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState("");
  const [failureOrder, setFailureOrder] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [statusError, setStatusError] = useState("");

  const updateStatus = async (order, status, reason = "") => {
    if (updatingOrder) return;
    const action = (nextActions[order.status] || []).find((item) => item.status === status);
    if (!action) return;
    if (action.confirm && !window.confirm(action.confirm)) return;
    if (status === "Delivery Failed" && !reason.trim()) {
      setStatusError("Enter a reason for the failed delivery.");
      return;
    }
    setUpdatingOrder(order._id);
    setStatusError("");
    try {
      const { data } = await orderApi.updateStatus(order._id, { status, reason });
      setOrders((current) => current.map((item) => item._id === order._id ? data : item));
      setFailureOrder("");
      setFailureReason("");
    } catch (requestError) {
      setStatusError(requestError?.message || "Couldn't update the order status.");
    } finally {
      setUpdatingOrder("");
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await orderApi.farmer();
      setOrders(unwrapList(response.data));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't load your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const ownItems = getOwnedItems(order, farmerId);
    if (!ownItems.length) return false;
    const status = getOrderStatus(order.status);
    const customer = order.address?.name || order.user?.name || "";
    const names = ownItems.map((item) => item.name || item.product?.name || "").join(" ");
    const searchable = `${order.orderNumber || order._id || ""} ${customer} ${names}`.toLowerCase();
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    return (activeFilter === "All Orders" || status === activeFilter || order.status === activeFilter)
      && (!search || searchable.includes(search.toLowerCase()))
      && (!fromDate || (createdAt && createdAt >= new Date(`${fromDate}T00:00:00`)))
      && (!toDate || (createdAt && createdAt <= new Date(`${toDate}T23:59:59`)));
  }), [orders, farmerId, activeFilter, search, fromDate, toDate]);

  return (
    <section className="space-y-4 pb-5 text-[13px] text-[#20312E]">
      <BackButton fallback="/farmer/dashboard" />
      <header>
        <h1 className="text-xl font-bold tracking-tight text-[#172A27]">My Orders</h1>
        <p className="mt-1 text-xs text-[#71817D]">View and track orders containing your products.</p>
      </header>
      {statusError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{statusError}</p>}

      <div className="flex flex-wrap gap-1 border-b border-[#DFE8E4]">
        {filters.map((filter) => (
          <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`rounded-t-md px-3 py-2 text-[11px] font-medium ${activeFilter === filter ? "border-b-2 border-[#07814E] bg-white text-[#087449]" : "text-[#778680] hover:bg-white/70"}`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EDF1F0] p-3">
          <label className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#91A09B]" />
            <input aria-label="Search orders" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders…" className="h-8 w-full rounded-md border border-[#DDE6E2] pl-8 pr-2 text-xs outline-none focus:border-[#179361]" />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-[#74827E]">From <input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-8 rounded-md border border-[#DDE6E2] px-2 text-xs text-[#41514D]" /></label>
          <label className="flex items-center gap-1 text-[10px] text-[#74827E]">To <input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-8 rounded-md border border-[#DDE6E2] px-2 text-xs text-[#41514D]" /></label>
        </div>

        {error ? (
          <div role="alert" className="p-8 text-center text-sm text-[#6A7773]">
            <p>{error}</p>
            <button type="button" onClick={loadOrders} className="mt-3 font-semibold text-[#07814E]">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-xs text-[#778681]">Loading orders…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-[#E9EFED] bg-[#F7F9F8] text-[10px] font-semibold uppercase tracking-wide text-[#71817D]">
                <tr>
                  <th className="px-3 py-2.5">Order ID</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Products</th>
                  <th className="px-3 py-2.5">Total</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F0]">
                {visibleOrders.map((order) => {
                  const items = getOwnedItems(order, farmerId);
                  const orderId = order.orderNumber || `#${String(order._id || "").slice(-7)}`;
                  return (
                    <React.Fragment key={order._id}>
                    <tr className="hover:bg-[#FBFCFC]">
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#344640]">{orderId}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#74827E]">{formatDate(order.createdAt)}</td>
                      <td className="px-3 py-2.5 text-[#52615D]">{order.address?.name || order.user?.name || "Customer"}</td>
                      <td className="max-w-[190px] px-3 py-2.5 text-[#52615D]">{items.map((item) => `${item.name || item.product?.name || "Product"} × ${item.quantity || 0}`).join(", ")}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#344640]">{formatCurrency(getOrderAmount(order, farmerId))}</td>
                      <td className="px-3 py-2.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(order.status)}`}>{order.status}</span></td>
                      <td className="px-3 py-2.5 text-right"><button type="button" aria-expanded={expandedOrder === order._id} onClick={() => setExpandedOrder(expandedOrder === order._id ? "" : order._id)} className="inline-flex h-6 items-center rounded border border-[#B9D9CC] px-2.5 text-[10px] font-medium text-[#087449] hover:bg-[#F1F8F4]">{expandedOrder === order._id ? "Hide" : "View"}</button></td>
                    </tr>
                    {expandedOrder === order._id && (
                      <tr className="bg-[#F8FBF9]">
                        <td colSpan="7" className="px-4 py-2.5">
                          <p className="text-[10px] font-semibold text-[#52615D]">Your items in this order</p>
                          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-[#71817D]">
                            {items.map((item) => <li key={item._id || item.product}>
                              {item.name || item.product?.name || "Product"} · {item.quantity || 0} × {formatCurrency(item.price)}
                              <span className="ml-2 font-semibold">{item.fulfillmentStatus || order.status}</span>
                              {item.deliveryFailureReason && <span className="ml-1 text-red-700">— {item.deliveryFailureReason}</span>}
                            </li>)}
                          </ul>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {(nextActions[order.status] || []).map((action) => (
                              <button
                                key={action.status}
                                type="button"
                                disabled={Boolean(updatingOrder)}
                                onClick={() => action.status === "Delivery Failed"
                                  ? (setFailureOrder(order._id), setStatusError(""))
                                  : updateStatus(order, action.status)}
                                className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${action.status === "Cancelled" ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-[#087449] text-white hover:bg-[#06653F]"}`}
                              >
                                {updatingOrder === order._id && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                                {action.label}
                              </button>
                            ))}
                            {failureOrder === order._id && (
                              <form
                                className="flex w-full flex-wrap items-start gap-2 pt-1"
                                onSubmit={(event) => { event.preventDefault(); updateStatus(order, "Delivery Failed", failureReason); }}
                              >
                                <label className="min-w-[220px] flex-1 text-[10px] font-medium text-[#52615D]">
                                  Reason for failed delivery
                                  <textarea
                                    required
                                    maxLength={500}
                                    value={failureReason}
                                    onChange={(event) => setFailureReason(event.target.value)}
                                    className="mt-1 min-h-16 w-full rounded-md border border-[#DDE6E2] p-2 text-xs outline-none focus:border-[#179361]"
                                    placeholder="Describe why delivery could not be completed"
                                  />
                                </label>
                                <button type="submit" disabled={Boolean(updatingOrder) || !failureReason.trim()} className="mt-4 min-h-8 rounded-md bg-red-700 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">
                                  {updatingOrder === order._id ? "Saving…" : "Confirm failure"}
                                </button>
                                <button type="button" disabled={Boolean(updatingOrder)} onClick={() => { setFailureOrder(""); setFailureReason(""); }} className="mt-4 min-h-8 rounded-md border px-3 py-1.5 text-[10px] text-gray-600 disabled:opacity-50">Dismiss</button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
                {!visibleOrders.length && <tr><td colSpan="7" className="px-3 py-10 text-center text-xs text-[#82908B]">No orders match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!error && !loading && <div className="border-t border-[#EDF1F0] px-3 py-2 text-[10px] text-[#788782]">Showing {visibleOrders.length} orders</div>}
      </div>
    </section>
  );
}
