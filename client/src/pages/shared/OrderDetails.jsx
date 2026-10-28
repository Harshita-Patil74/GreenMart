import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import orderApi from "../../api/orderApi";
import { formatCurrency } from "../../utils/constants.js";
import BackButton from "../../components/common/BackButton.jsx";
import Button from "../../components/common/Button.jsx";
import OrderStepper from "../../components/orders/OrderStepper.jsx";
import { subscribeOrderStatus } from "../../socket/socketClient.js";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const load = () => { setError(null); orderApi.get(id).then((r) => setOrder(r.data)).catch((e) => setError(e?.message || "Failed")); };
  useEffect(load, [id]);
  useEffect(() => subscribeOrderStatus((updated) => {
    if (String(updated?._id) === String(id)) setOrder(updated);
  }), [id]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <div>Loading...</div>;
  return (
    <div>
      <BackButton fallback="/customer/orders" />
      <h2 className="text-2xl font-heading mb-2">Order {order.orderNumber}</h2>
      <OrderStepper history={order.statusHistory || []} status={order.status} />
      <div className="bg-card border border-border rounded-card p-4 mb-4">
        {order.items.map((it, i) => <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 py-2 text-sm">
          <span>
            {it.name} x{it.quantity}<span className="ml-2 text-xs text-gray-500">{it.fulfillmentStatus || order.status}</span>
            {it.deliveryFailureReason && <span className="block text-xs text-red-700">Delivery attempt failed: {it.deliveryFailureReason}</span>}
            {it.fulfillmentHistory?.length > 1 && <ol className="mt-1 space-y-0.5 text-[10px] text-gray-500">
              {it.fulfillmentHistory.map((entry, historyIndex) => <li key={`${entry.status}-${entry.at || historyIndex}`}>
                {entry.status}{entry.at ? ` · ${new Date(entry.at).toLocaleString("en-IN")}` : ""}{entry.reason ? ` — ${entry.reason}` : ""}
              </li>)}
            </ol>}
          </span>
          <span>{formatCurrency(it.price * it.quantity)}</span>
        </div>)}
        <div className="font-bold mt-2">Total: {formatCurrency(order.total)}</div>
      </div>
      <div className="text-sm text-muted">{order.address?.line1}, {order.address?.city}</div>
      <Button className="mt-3" onClick={() => navigate(`/track-order/${id}`)}>Track Order</Button>
    </div>
  );
}
