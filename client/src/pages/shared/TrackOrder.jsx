import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Clock3, MapPin, PackageCheck, Search, Truck } from "lucide-react";
import orderApi from "../../api/orderApi";
import OrderStepper from "../../components/orders/OrderStepper.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import { formatCurrency } from "../../utils/constants.js";
import { subscribeOrderStatus } from "../../socket/socketClient.js";

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderId, setOrderId] = useState(id || "");
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);

  const loadOrder = async (targetId) => {
    if (!targetId?.trim()) return;
    const lookupId = targetId.trim().replace(/^#/, "");
    setLoading(true);
    setError(null);
    try {
      const { data } = await orderApi.get(encodeURIComponent(lookupId));
      setOrder(data);
      setOrderId(targetId.trim());
    } catch (requestError) {
      setOrder(null);
      setError(requestError?.message || "Couldn't find this order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadOrder(id);
  }, [id]);

  useEffect(() => subscribeOrderStatus((updated) => {
    if (order && String(updated?._id) === String(order._id)) setOrder(updated);
  }), [order?._id]);

  const submit = (event) => {
    event.preventDefault();
    if (orderId.trim()) navigate(`/track-order/${encodeURIComponent(orderId.trim())}`);
  };

  return (
    <div className="gm-container space-y-5 py-6 pb-16">
      <BackButton fallback="/customer/orders" />
      <div>
        <h1 className="text-xl font-heading font-bold text-gray-900">Track Your Order</h1>
        <p className="mt-1 text-xs text-gray-500">View live status updates for an order on your account.</p>
      </div>

      {!id && (
        <form onSubmit={submit} className="flex max-w-xl gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <label className="sr-only" htmlFor="track-order-id">Order ID</label>
          <input id="track-order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Enter an order ID" className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:border-primary focus:outline-none" />
          <button disabled={!orderId.trim()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50"><Search className="h-4 w-4" /> Track</button>
        </form>
      )}

      {loading && <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">Loading order...</div>}
      {error && <ErrorState message={error} onRetry={() => loadOrder(id || orderId)} />}

      {order && !loading && (
        <>
          <OrderStepper history={order.statusHistory || []} status={order.status} />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Order number</p>
                  <h2 className="mt-1 text-sm font-bold text-gray-900">#{order.orderNumber}</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">{order.status}</span>
              </div>
                {(order.items || []).some((item) => item.fulfillmentStatus || item.deliveryFailureReason) && (
                  <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    {(order.items || []).map((item, index) => (
                      <li key={item._id || item.product || index} className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">{item.name || "Product"}</span>
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px]">{item.fulfillmentStatus || order.status}</span>
                        {item.deliveryFailureReason && <p className="mt-1 text-red-700">Delivery attempt failed: {item.deliveryFailureReason}</p>}
                        {item.fulfillmentHistory?.length > 1 && (
                          <ol className="mt-1 space-y-0.5 pl-2 text-[10px] text-gray-500">
                            {item.fulfillmentHistory.map((entry, historyIndex) => (
                              <li key={`${entry.status}-${entry.at || historyIndex}`}>
                                {entry.status}{entry.at ? ` · ${new Date(entry.at).toLocaleString("en-IN")}` : ""}
                                {entry.reason ? ` — ${entry.reason}` : ""}
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              {order.estimatedDelivery && <p className="mt-4 flex items-center gap-2 text-xs text-gray-600"><Clock3 className="h-3.5 w-3.5 text-primary" />Estimated delivery {new Date(order.estimatedDelivery).toLocaleDateString("en-IN")}</p>}
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Delivery address</p>
                <p className="flex items-start gap-2 text-xs leading-5 text-gray-700"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{[order.address?.name, order.address?.line1, order.address?.city, order.address?.phone].filter(Boolean).join(", ") || "No delivery address available."}</p>
              </div>
              {order.currentLocation && <p className="mt-3 flex items-center gap-2 text-xs text-gray-600"><Truck className="h-3.5 w-3.5 text-primary" />Last location update {order.currentLocation.updatedAt ? new Date(order.currentLocation.updatedAt).toLocaleString("en-IN") : "available"}</p>}
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><PackageCheck className="h-4 w-4 text-primary" />Items in this order</h2>
              <div className="mt-3 divide-y divide-gray-100">
                {(order.items || []).map((item, index) => (
                  <div key={item._id || item.product || index} className="flex justify-between gap-3 py-2 text-xs">
                    <span className="text-gray-700">{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                    <span className="shrink-0 font-semibold text-gray-900">{formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-100 pt-3 text-sm font-bold text-gray-900"><span>Total</span><span>{formatCurrency(order.total || 0)}</span></div>
              <Link to={`/orders/${order._id}`} className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">View order details</Link>
            </section>
          </div>
        </>
      )}
      {!order && !loading && !error && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
          Sign in and enter an order ID from <Link to="/customer/orders" className="font-semibold text-primary">My Orders</Link> to see its latest status.
        </div>
      )}
    </div>
  );
}
