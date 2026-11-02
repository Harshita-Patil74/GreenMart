import React, { useEffect, useState } from "react";
import farmerApi from "../../api/farmerApi";
import BackButton from "../../components/common/BackButton.jsx";

export default function SalesManagement() {
  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setLoading(true); try { const [o, s] = await Promise.all([farmerApi.salesOverview(), farmerApi.sales()]); setOverview(o.data); setSales(Array.isArray(s.data) ? s.data : []); } finally { setLoading(false); } })(); }, []);
  return (
    <section className="space-y-4 pb-5">
      <BackButton fallback="/farmer/dashboard" />
      <h1 className="text-xl font-bold">Sales Management</h1>
      {loading ? <p>Loading...</p> : (
        <>
          <p>Total Revenue: {overview?.totalRevenue}</p>
          <p>Total Orders: {overview?.totalOrders}</p>
          <p>Products Sold: {overview?.totalProductsSold}</p>
          <p>Quantity Sold: {overview?.totalQuantitySold}</p>
          {sales.map((s) => <div key={s._id} className="rounded border bg-white p-3 text-xs">Order {s.orderNumber} · {s.status}</div>)}
          {!sales.length && <p>No sales.</p>}
        </>
      )}
    </section>
  );
}
