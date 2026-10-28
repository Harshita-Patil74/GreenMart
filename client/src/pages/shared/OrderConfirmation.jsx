import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import orderApi from "../../api/orderApi";
import { formatCurrency } from "../../utils/constants.js";
import BackButton from "../../components/common/BackButton.jsx";
import NextButton from "../../components/common/NextButton.jsx";

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const load = () => { setError(null); orderApi.get(id).then((r) => setOrder(r.data)).catch((e) => setError(e?.message || "Failed")); };
  useEffect(load, [id]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <div>Loading...</div>;
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <NextButton to="/customer/orders" label="View My Orders" />
        <BackButton fallback="/customer/orders" />
      </div>
      <h2 className="text-2xl font-heading mb-2">Order Confirmed</h2>
      <p className="text-muted mb-4">Order #{order.orderNumber}</p>
      <div className="bg-card border border-border rounded-card p-4 mb-4">
        {order.items.map((it, i) => <div key={i} className="flex justify-between text-sm"><span>{it.name} x{it.quantity}</span><span>{formatCurrency(it.price * it.quantity)}</span></div>)}
        <div className="font-bold mt-2">Total: {formatCurrency(order.total)}</div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="px-3 py-1 rounded bg-primary text-white" onClick={() => navigate(`/track-order/${id}`)}>Track Order</button>
        <button className="px-3 py-1 rounded border" onClick={() => navigate("/shop")}>Continue Shopping</button>
      </div>
    </div>
  );
}
