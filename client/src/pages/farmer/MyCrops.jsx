import React, { useEffect, useState } from "react";
import farmerApi from "../../api/farmerApi";
import BackButton from "../../components/common/BackButton.jsx";

export default function MyCrops() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ cropName: "", cropCategory: "" });
  const [creating, setCreating] = useState(false);
  const load = async () => { setLoading(true); try { const { data } = await farmerApi.crops(); setCrops(Array.isArray(data) ? data : []); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const create = async (e) => { e.preventDefault(); setCreating(true); try { await farmerApi.createCrop(form); setForm({ cropName: "", cropCategory: "" }); load(); } finally { setCreating(false); } };
  const remove = async (id) => { if (!window.confirm("Delete?")) return; await farmerApi.deleteCrop(id); load(); };
  return (
    <section className="space-y-4 pb-5">
      <BackButton fallback="/farmer/dashboard" />
      <h1 className="text-xl font-bold">My Crops</h1>
      <form onSubmit={create} className="flex gap-2">
        <input placeholder="Crop Name" value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required className="rounded border px-2 py-1 text-xs" />
        <input placeholder="Category" value={form.cropCategory} onChange={(e) => setForm({ ...form, cropCategory: e.target.value })} required className="rounded border px-2 py-1 text-xs" />
        <button disabled={creating} type="submit" className="rounded bg-[#07814E] px-3 py-1 text-xs text-white">{creating ? "Saving..." : "Add"}</button>
      </form>
      {loading ? <p>Loading...</p> : crops.map((c) => (
        <div key={c._id} className="rounded border bg-white p-3 text-xs">
          <p className="font-semibold">{c.cropName} - {c.cropCategory}</p>
          <p>{c.growingSeason} {c.status}</p>
          <button onClick={() => remove(c._id)} className="mt-2 rounded bg-red-600 px-2 py-1 text-white">Delete</button>
        </div>
      ))}
      {!loading && !crops.length && <p>No crops.</p>}
    </section>
  );
}
