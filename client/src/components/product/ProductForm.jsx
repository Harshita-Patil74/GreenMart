import React, { useEffect, useState } from "react";
import Button from "../common/Button.jsx";
import Input from "../common/Input.jsx";
const CATEGORIES = ["Vegetables","Fruits","Grains & Pulses","Dairy & Eggs","Spices & Herbs","Eco Friendly","Others"];
export default function ProductForm({ initial, onSubmit }) {
  const normalizeDescription = (value) => String(value ?? "").replace(/\\r\\n/g, "\n").replace(/\r/g, "\n");
  const [form, setForm] = useState(initial ? { ...initial, description: normalizeDescription(initial.description) } : { name: "", description: "", category: "", price: "", unit: "kg", stock: "", lowStockThreshold: 5, harvestDate: "", seasonalAvailability: "", isOrganic: true });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initial) setForm((prev) => ({ ...prev, ...initial, description: normalizeDescription(initial.description) }));
  }, [initial]);
  const submit = (e) => {
    e.preventDefault();
    const trimmed = (form.description || "").trim();
    if (!form.category) { setError("Category is required"); return; }
    if (!trimmed) { setError("Description is required"); return; }
    if (trimmed.length > 1000) { setError("Description must be 1000 characters or fewer"); return; }
    setError("");
    const fd = new FormData();
    Object.entries({ ...form, description: trimmed }).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") fd.append(k, v); });
    files.forEach((f) => fd.append("images", f));
    onSubmit(fd);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
      <Input label="Stock Quantity" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
      <div>
        <label className="block text-sm font-medium mb-1">Unit of Measurement</label>
        <select className="h-8 border border-border rounded-btn px-2 text-sm w-full" value={form.unit || "kg"} onChange={(e) => setForm({ ...form, unit: e.target.value })} required>
          <option value="kg">Kilogram (kg)</option>
          <option value="g">Gram (g)</option>
          <option value="L">Litre (L)</option>
          <option value="mL">Millilitre (mL)</option>
          <option value="pcs">Piece (pcs)</option>
          <option value="dozen">Dozen</option>
          <option value="pack">Pack</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
        <select className="h-8 border border-border rounded-btn px-2 text-sm w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
          <option value="">Select category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Product Description</label>
        <textarea className="border border-border rounded-input p-2 w-full" placeholder="Describe your product, its freshness, quality, origin, and how it is grown or produced." maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <div className="text-xs text-gray-500 mt-1">{(form.description || "").length}/1000</div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Product Images</label>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
      </div>
      <Button type="submit">Save Product</Button>
    </form>
  );
}
export function StatusUpdateMenu({ status, onChange }) {
  const opts = ["Pending", "Processing", "Shipped", "Delivered"];
  return <select value={status} onChange={(e) => onChange(e.target.value)} className="h-8 border border-border rounded-btn px-2 text-sm">{opts.map((o) => <option key={o}>{o}</option>)}</select>;
}

