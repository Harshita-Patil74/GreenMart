import React, { useEffect, useState } from "react";
import farmerApi from "../../api/farmerApi";
import BackButton from "../../components/common/BackButton.jsx";

export default function HarvestManagement() {
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ harvestName: "", cropName: "", harvestQuantity: "", harvestUnit: "kg", harvestDate: "" });
  const [creating, setCreating] = useState(false);
  const load = async () => { setLoading(true); try { const { data } = await farmerApi.harvests(); setHarvests(Array.isArray(data) ? data : []); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const create = async (e) => { e.preventDefault(); setCreating(true); try { await farmerApi.createHarvest(form); setForm({ harvestName: "", cropName: "", harvestQuantity: "", harvestUnit: "kg", harvestDate: "" }); load(); } finally { setCreating(false); } };
  const remove = async (id) => { if (!window.confirm("Delete?")) return; await farmerApi.deleteHarvest(id); load(); };
  return (
    <section className="space-y-4 pb-5">
      <BackButton fallback="/farmer/dashboard" />
      <h1 className="text-xl font-bold">Harvest Management</h1>
      <form onSubmit={create} className="flex gap-2 flex-wrap">
        <input placeholder="Harvest Name" value={form.harvestName} onChange={(e) => setForm({ ...form, harvestName: e.target.value })} required className="rounded border px-2 py-1 text-xs" />
        <input placeholder="Crop Name" value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} className="rounded border px-2 py-1 text-xs" />
        <input type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} required className="rounded border px-2 py-1 text-xs" />
        <input type="number" placeholder="Qty" value={form.harvestQuantity} onChange={(e) => setForm({ ...form, harvestQuantity: e.target.value })} required className="rounded border px-2 py-1 text-xs" />
        <select value={form.harvestUnit} onChange={(e) => setForm({ ...form, harvestUnit: e.target.value })} className="rounded border px-2 py-1 text-xs"><option>kg</option><option>quintal</option><option>tonnes</option></select>
        <button disabled={creating} type="submit" className="rounded bg-[#07814E] px-3 py-1 text-xs text-white">{creating ? "Saving..." : "Add"}</button>
      </form>
      {loading ? <p>Loading...</p> : harvests.map((h) => (
        <div key={h._id} className="rounded border bg-white p-3 text-xs">
          <p className="font-semibold">{h.harvestName} - {h.cropName}</p>
          <p>{h.harvestQuantity} {h.harvestUnit} · {h.saleStatus}</p>
          <button onClick={() => remove(h._id)} className="mt-2 rounded bg-red-600 px-2 py-1 text-white">Delete</button>
        </div>
      ))}
      {!loading && !harvests.length && <p>No harvests.</p>}
    </section>
  );
}
