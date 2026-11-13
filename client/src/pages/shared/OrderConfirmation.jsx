import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import orderApi from "../../api/orderApi";
import { formatINR } from "../../utils/cartTotals.js";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import NextButton from "../../components/common/NextButton.jsx";
import {
  hasOrderItemDiscountBreakdown,
  orderItemDiscount,
  orderItemGross,
  orderItemPremiumDiscount,
  orderItemRegularDiscount,
  orderItemTotal,
  orderTotals,
} from "../../utils/orderPricing.js";

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const load = () => { setError(null); orderApi.get(id).then((r) => setOrder(r.data)).catch((e) => setError(e?.message || "Failed")); };
  useEffect(load, [id]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <div>Loading...</div>;
  const totals = orderTotals(order);
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <NextButton to="/customer/orders" label="View My Orders" />
        <BackButton fallback="/customer/orders" />
      </div>
      <h2 className="text-2xl font-heading mb-2">Order Confirmed</h2>
      <p className="text-muted mb-4">Order #{order.orderNumber}</p>
      <div className="bg-card border border-border rounded-card p-4 mb-4">
        {order.items.map((it, i) => {
          const gross = orderItemGross(it);
          const discount = orderItemDiscount(it);
          const regularSavings = orderItemRegularDiscount(it);
          const premiumSavings = orderItemPremiumDiscount(it);
          return <div key={i} className="flex justify-between gap-3 py-1 text-sm">
            <span>{it.name} x{it.quantity}<ProductIdentifier productId={it.productId || it.product} className="mt-1 flex" />{it.offerSnapshot?.offerTitle && <span className="block text-xs text-emerald-700">{it.offerSnapshot.offerTitle}</span>}</span>
            <span className="text-right">{discount > 0 && <span className="block text-xs text-gray-400 line-through">{formatINR(gross)}</span>}{formatINR(orderItemTotal(it))}
              {hasOrderItemDiscountBreakdown(it) && regularSavings > 0 && <span className="block text-[10px] text-emerald-700">Regular saved {formatINR(regularSavings)}</span>}
              {hasOrderItemDiscountBreakdown(it) && premiumSavings > 0 && <span className="block text-[10px] font-medium text-emerald-800">Premium saved {formatINR(premiumSavings)}</span>}
            </span>
          </div>;
        })}
        <div className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
          <div className="flex justify-between"><span>Original Product Subtotal</span><span>{formatINR(totals.subtotal)}</span></div>
          {totals.breakdownKnown ? (
            <>
              <div className="flex justify-between text-emerald-700"><span>Regular Offer Savings</span><span>− {formatINR(totals.regularDiscount)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>Exclusive Subscriber Savings</span><span>− {formatINR(totals.premiumDiscount)}</span></div>
              <div className="flex justify-between font-semibold text-emerald-700"><span>Total Discount</span><span>− {formatINR(totals.discount)}</span></div>
            </>
          ) : totals.discount > 0 ? (
            <div className="flex justify-between text-emerald-700"><span>Discount</span><span>− {formatINR(totals.discount)}</span></div>
          ) : null}
          <div className="flex justify-between"><span>Delivery Charge</span><span>{formatINR(totals.deliveryCharge)}</span></div>
          <div className="flex justify-between font-bold"><span>Final Payable Amount</span><span>{formatINR(totals.total)}</span></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="px-3 py-1 rounded bg-primary text-white" onClick={() => navigate(`/track-order/${id}`)}>Track Order</button>
        <button className="px-3 py-1 rounded border" onClick={() => navigate("/shop")}>Continue Shopping</button>
      </div>
    </div>
  );
}
