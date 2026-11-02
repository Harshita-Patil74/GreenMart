import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import farmerApi from "../../api/farmerApi";
import BackButton from "../../components/common/BackButton.jsx";

export default function InventoryManagement() {
  const location = useLocation();
  const [data, setData] = useState({ products: [], harvests: [] });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { (async () => { try { const res = await farmerApi.allInventoryHistory?.(); const data = res?.data; setHistory(Array.isArray(data) ? data : []); } catch (e) { setError(e?.message || ""); } })(); }, []);
  useEffect(() => { (async () => { setLoading(true); try { if (farmerApi.consolidatedInventory) { const res = await farmerApi.consolidatedInventory(); setData(res?.data || { products: [], harvests: [] }); } else if (farmerApi.inventory) { const res = await farmerApi.inventory(); const d = res?.data; setData(Array.isArray(d) ? { products: d, harvests: [] } : d || { products: [], harvests: [] }); } } catch (e) { setError(e?.message || ""); } finally { setLoading(false); } })(); }, []);
  return (
    <section className="space-y-4 pb-5">
      <BackButton fallback="/farmer/dashboard" />
      <h1 className="text-xl font-bold">{location.pathname.includes("adjustments") ? "Inventory Adjustments" : location.pathname.includes("history") ? "Inventory History" : "Consolidated Inventory"}</h1>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {loading ? <p>Loading...</p> : (
        <>
          <p>Products: {data.products?.length || 0}</p>
          <p>Harvests: {data.harvests?.length || 0}</p>
          <div className="space-y-2">
            {(data.products || []).map((p) => <div key={p._id} className="rounded border bg-white p-3 text-xs">Product: {p.name} · Stock {p.stock}</div>)}
            {(data.harvests || []).map((h) => <div key={h._id} className="rounded border bg-white p-3 text-xs">Harvest: {h.harvestName || h.name} · {h.harvestQuantity || h.quantity} {h.harvestUnit || h.unit}</div>)}
          </div>
          {!data.products?.length && !data.harvests?.length && <p>No inventory.</p>}
          <h2 className="mt-4 text-sm font-bold">History</h2>
          {history.map((h) => <div key={h._id} className="rounded border bg-white p-2 text-xs">{h.adjustmentType || h.type || "Adjustment"} {h.quantity} {h.unit || ""} - {h.reason || h.note || ""}</div>)}
          {!history.length && <p className="text-xs text-gray-500">No history.</p>}
        </>
      )}
    </section>
  );
}
