import React from "react";
export default function StatCard({ label, value, helper }) {
  return (
    <div className="bg-card rounded-card border border-border p-5 shadow-card">
      <div className="w-11 h-11 rounded-lg bg-mint flex items-center justify-center mb-3">📊</div>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-bold text-dark-green">{value}</div>
      {helper && <div className="text-xs text-primary mt-1">{helper}</div>}
    </div>
  );
}
export function PromoBanner({ title, sub, img }) {
  return <div className="rounded-card overflow-hidden relative h-32"><img src={img} className="absolute inset-0 w-full h-full object-cover" /><div className="relative z-10 p-4 text-white"><div className="font-semibold">{title}</div><div className="text-xs">{sub}</div></div></div>;
}
export function RecentOrdersTable({ orders }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-muted"><tr><th className="p-2 text-left">Order ID</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.map((o) => <tr key={o._id} className="border-b border-border"><td className="p-2">{o.orderNumber}</td><td>{o.items?.[0]?.name}</td><td>{o.items?.[0]?.quantity}</td><td>₹ {o.total}</td><td>{o.status}</td><td>{new Date(o.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>;
}
export function WelcomeCard({ name }) { return <div className="bg-card rounded-card p-4 border border-border">Welcome, {name}</div>; }
