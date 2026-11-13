import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import orderApi from "../../api/orderApi";
import { formatINR } from "../../utils/cartTotals.js";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import Button from "../../components/common/Button.jsx";
import OrderStepper from "../../components/orders/OrderStepper.jsx";
import { subscribeOrderStatus } from "../../socket/socketClient.js";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";
import {
  hasOrderItemDiscountBreakdown,
  orderItemDiscount,
  orderItemGross,
  orderItemPremiumDiscount,
  orderItemRegularDiscount,
  orderItemTotal,
  orderTotals,
} from "../../utils/orderPricing.js";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const load = () => { setError(null); orderApi.get(id).then((r) => setOrder(r.data)).catch((e) => setError(e?.message || "Failed")); };
  useEffect(load, [id]);
  useEffect(() => subscribeOrderStatus((updated) => {
    if (String(updated?._id) === String(id)) setOrder(updated);
  }), [id]);
  const downloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const res = await orderApi.downloadInvoice(order._id || order.orderNumber || id);
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
      setDownloading(false);
    }
  };
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <div>Loading...</div>;
  const totals = orderTotals(order);
  return (
    <div>
      <BackButton fallback="/customer/orders" />
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-heading">Order {order.orderNumber}</h2>
        <div className="flex flex-wrap gap-2">
          {(user?.role === "customer" || user?.role === "admin") && <Button onClick={downloadInvoice} disabled={downloading} className="flex items-center gap-1"><Download className="h-4 w-4" /> {downloading ? "Downloading..." : "Download Invoice"}</Button>}
        </div>
      </div>
      <OrderStepper history={order.statusHistory || []} status={order.status} />
      <div className="bg-card border border-border rounded-card p-4 mb-4">
        {order.items.map((it, i) => {
          const gross = orderItemGross(it);
          const discount = orderItemDiscount(it);
          const regularSavings = orderItemRegularDiscount(it);
          const premiumSavings = orderItemPremiumDiscount(it);
          return <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 py-2 text-sm">
            <span>
              {it.name} x{it.quantity}<span className="ml-2 text-xs text-gray-500">{it.fulfillmentStatus || order.status}</span>
              <ProductIdentifier productId={it.productId || it.product} className="mt-1 flex" />
              {it.offerSnapshot?.offerTitle && <span className="block text-xs text-emerald-700">{it.offerSnapshot.offerTitle}</span>}
              {it.deliveryFailureReason && <span className="block text-xs text-red-700">Delivery attempt failed: {it.deliveryFailureReason}</span>}
              {it.fulfillmentHistory?.length > 1 && <ol className="mt-1 space-y-0.5 text-[10px] text-gray-500">
                {it.fulfillmentHistory.map((entry, historyIndex) => <li key={`${entry.status}-${entry.at || historyIndex}`}>
                  {entry.status}{entry.at ? ` · ${new Date(entry.at).toLocaleString("en-IN")}` : ""}{entry.reason ? ` — ${entry.reason}` : ""}
                </li>)}
              </ol>}
            </span>
            <span className="text-right">{discount > 0 && <span className="block text-xs text-gray-400 line-through">{formatINR(gross)}</span>}{formatINR(orderItemTotal(it))}
              {hasOrderItemDiscountBreakdown(it) && regularSavings > 0 && <span className="block text-[10px] text-emerald-700">Regular saved {formatINR(regularSavings)}</span>}
              {hasOrderItemDiscountBreakdown(it) && premiumSavings > 0 && <span className="block text-[10px] font-medium text-emerald-800">Premium saved {formatINR(premiumSavings)}</span>}
            </span>
          </div>;
        })}
        <div className="mt-2 space-y-1 text-sm">
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
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold"><span>Final Payable Amount</span><span>{formatINR(totals.total)}</span></div>
        </div>
      </div>
      <div className="text-sm text-muted">{order.address?.line1}, {order.address?.city}</div>
      <Button className="mt-3" onClick={() => navigate(`/track-order/${id}`)}>Track Order</Button>
    </div>
  );
}
