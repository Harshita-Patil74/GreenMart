import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import orderApi from "../../api/orderApi";
import { formatCurrency } from "../../utils/constants.js";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import Button from "../../components/common/Button.jsx";
import OrderStepper from "../../components/orders/OrderStepper.jsx";
import { subscribeOrderStatus } from "../../socket/socketClient.js";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

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
