import React, { useEffect, useState, useCallback } from "react";
import Button from "../common/Button.jsx";
import Input from "../common/Input.jsx";
import ImageWithFallback from "../common/ImageWithFallback.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";
import ProductIdentifier from "./ProductIdentifier.jsx";
import categoryApi from "../../api/categoryApi";
const MAX_IMAGES = 6;
export default function ProductForm({ initial, onSubmit, isSubmitting = false }) {
  const normalizeDescription = (value) => String(value ?? "").replace(/\\r\\n/g, "\n").replace(/\r/g, "\n");
  const [form, setForm] = useState(initial ? { ...initial, description: normalizeDescription(initial.description) } : { name: "", description: "", category: "", price: "", unit: "kg", stock: "", lowStockThreshold: 5, harvestDate: "", seasonalAvailability: "", isOrganic: true });
  const [existingImages, setExistingImages] = useState(initial && Array.isArray(initial.images) ? initial.images.filter(Boolean) : []);
  const [existingToRemove, setExistingToRemove] = useState(new Set());
  const [newFiles, setNewFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [categoryList, setCategoryList] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  useEffect(() => {
    if (initial) setForm((prev) => ({ ...prev, ...initial, description: normalizeDescription(initial.description) }));
    if (initial && Array.isArray(initial.images)) setExistingImages(initial.images.filter(Boolean));
  }, [initial]);
  useEffect(() => {
    let active = true;
    categoryApi.list()
      .then(({ data }) => {
        if (active) {
          const cats = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
          setCategoryList(cats.filter((c) => c.isActive !== false));
        }
      })
      .catch(() => {
        if (active) setCategoryList([]);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, []);
  const totalImageCount = existingImages.filter((_, i) => !existingToRemove.has(existingImages[i])).length + newFiles.length;
  const canAddMore = totalImageCount < MAX_IMAGES;
  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const invalid = files.find((f) => !validTypes.includes(f.type));
    if (invalid) { setUploadError("Only JPEG, PNG, and WebP images are supported."); e.target.value = ""; return; }
    const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) { setUploadError("Each image must be 5 MB or smaller."); e.target.value = ""; return; }
    const combined = totalImageCount + files.length;
    if (combined > MAX_IMAGES) { setUploadError(`Maximum ${MAX_IMAGES} images per product. You can add ${MAX_IMAGES - totalImageCount} more.`); e.target.value = ""; return; }
    setUploadError("");
    const newPreviews = {};
    files.forEach((f) => { newPreviews[f.name + f.size] = URL.createObjectURL(f); });
    setPreviewUrls((prev) => ({ ...prev, ...newPreviews }));
    setNewFiles((current) => [...current, ...files]);
    e.target.value = "";
  }, [totalImageCount]);
  const removeNewFile = (index) => {
    const file = newFiles[index];
    if (file) { URL.revokeObjectURL(previewUrls[file.name + file.size] || ""); }
    setNewFiles((current) => current.filter((_, i) => i !== index));
    setPreviewUrls((prev) => { const next = { ...prev }; delete next[file.name + file.size]; return next; });
  };
  const toggleExistingRemove = (url) => {
    setExistingToRemove((prev) => { const next = new Set(prev); if (next.has(url)) next.delete(url); else next.add(url); return next; });
  };
  const isExistingRemoved = (url) => existingToRemove.has(url);
  const allDisplayImages = [
    ...existingImages.filter((_, i) => !existingToRemove.has(existingImages[i])).map((url) => ({ url, source: "existing", isRemoved: false })),
    ...newFiles.map((file) => ({ url: previewUrls[file.name + file.size] || URL.createObjectURL(file), source: "new", file })),
  ];
  const submit = (e) => {
    e.preventDefault();
    setError("");
    setUploadError("");
    const trimmed = (form.description || "").trim();
    if (!form.category) { setError("Category is required"); return; }
    if (!trimmed) { setError("Description is required"); return; }
    if (trimmed.length > 1000) { setError("Description must be 1000 characters or fewer"); return; }
    const fd = new FormData();
    Object.entries({ ...form, description: trimmed }).forEach(([k, v]) => {
      if (!["_id", "id", "productId"].includes(k) && v !== undefined && v !== null && v !== "") fd.append(k, v);
    });
    if (existingToRemove.size > 0) fd.append("removeImages", JSON.stringify([...existingToRemove]));
    newFiles.forEach((f) => fd.append("images", f));
    onSubmit(fd);
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
      {initial?._id && <div className="md:col-span-2">
        <p className="mb-1 text-sm font-medium">Product ID (read-only)</p>
        <div className="rounded-lg border border-border bg-[#F7F8F8] px-3 py-2">
          <ProductIdentifier productId={initial._id} />
        </div>
      </div>}
      <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={isSubmitting} />
      <div>
        <label className="mb-1 block text-sm font-medium">Category</label>
        {categoriesLoading ? (
          <select className="h-11 w-full rounded-btn border border-border bg-[#F7F8F8] px-3 text-sm" disabled={categoriesLoading || isSubmitting}>
            <option value="">Loading categories...</option>
          </select>
        ) : categoryList.length ? (
          <select className="h-11 w-full rounded-btn border border-border bg-[#F7F8F8] px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required disabled={categoriesLoading || isSubmitting}>
            <option value="">Select category</option>
            {categoryList.map((cat) => <option key={cat._id || cat.name} value={cat.name}>{cat.name}</option>)}
          </select>
        ) : (
          <select className="h-11 w-full rounded-btn border border-border bg-[#F7F8F8] px-3 text-sm" disabled={categoriesLoading || isSubmitting}>
            <option value="">No categories available</option>
          </select>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required disabled={isSubmitting} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Stock Quantity" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={isSubmitting} />
        <div>
          <label className="mb-1 block text-sm font-medium">Unit of Measurement</label>
          <select className="h-11 w-full rounded-btn border border-border bg-[#F7F8F8] px-3 text-sm" value={form.unit || "kg"} onChange={(e) => setForm({ ...form, unit: e.target.value })} required disabled={isSubmitting}>
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
            <option value="L">Litre (L)</option>
            <option value="mL">Millilitre (mL)</option>
            <option value="pcs">Piece (pcs)</option>
            <option value="dozen">Dozen</option>
            <option value="pack">Pack</option>
          </select>
        </div>
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">Product Description</label>
        <textarea className="min-h-32 w-full resize-y rounded-input border border-border p-3" placeholder="Describe your product, its freshness, quality, origin, and how it is grown or produced." maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required disabled={isSubmitting} />
        <div className="text-xs text-gray-500 mt-1">{(form.description || "").length}/1000</div>
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">Product Images</label>
        <div className="rounded-lg border border-dashed border-border bg-[#FAFBFA] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {allDisplayImages.length === 0 && <p className="text-xs text-gray-400">No images yet. Upload up to {MAX_IMAGES} images.</p>}
            {allDisplayImages.map((img, idx) => {
              const isExisting = img.source === "existing";
              const isRemoved = img.isRemoved || (isExisting && isExistingRemoved(img.url));
              if (isRemoved) return null;
              const key = isExisting ? `existing-${idx}` : `new-${idx}`;
              return (
                <div key={key} className="relative group">
                  <ImageWithFallback src={getImageUrl(img.url)} alt={form.name} className="h-20 w-20 rounded-md object-cover border border-gray-200" />
                  <button type="button" onClick={isExisting ? () => toggleExistingRemove(img.url) : () => removeNewFile(idx)} className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white h-5 w-5 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove image">×</button>
                </div>
              );
            })}
          </div>
          <label className="mb-1 block text-sm font-medium">Add more images</label>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={!canAddMore || isSubmitting} />
          {!canAddMore && <p className="mt-1 text-xs text-gray-500">Maximum {MAX_IMAGES} images per product reached.</p>}
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          <p className="mt-1 text-xs text-gray-500">Up to {MAX_IMAGES} images. JPG, JPEG, PNG, WEBP (max 5 MB each). First image is the cover.</p>
        </div>
      </div>
      <div className="flex justify-end md:col-span-2">
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || totalImageCount === 0}>
          {isSubmitting ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </form>
  );
}
export function StatusUpdateMenu({ status, onChange }) {
  const opts = ["Pending", "Processing", "Shipped", "Delivered"];
  return <select value={status} onChange={(e) => onChange(e.target.value)} className="h-8 border border-border rounded-btn px-2 text-sm">{opts.map((o) => <option key={o}>{o}</option>)}</select>;
}
