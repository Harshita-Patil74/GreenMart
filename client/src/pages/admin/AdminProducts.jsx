import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import { Plus, RotateCcw } from "lucide-react";
import productApi from "../../api/productApi";
import categoryApi from "../../api/categoryApi";
import farmerApi from "../../api/farmerApi";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";
import BackButton from "../../components/common/BackButton.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import ProductManagementSection from "../../components/admin/ProductManagementSection.jsx";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";
import Modal from "../../components/common/Modal.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import toast from "react-hot-toast";
import { showDeleteConfirm, showSuccess, showError } from "../../utils/alertUtils";

  const PAGE_SIZE = 10;
const EMPTY_DRAFT = { name: "", category: "", price: "", stock: "", lowStockThreshold: "5", unit: "kg", description: "", farmer: "" };
const MAX_IMAGES = 6;

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [existingImages, setExistingImages] = useState([]);
  const [existingToRemove, setExistingToRemove] = useState(new Set());
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const requestIdRef = useRef(0);
  const load = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true); setError(null);
    try {
      const { data } = await productApi.list({ search, category, status: status === "Active" ? "Active" : status === "Inactive" ? "Inactive" : undefined, page, limit: pageSize, showDeleted: showDeleted ? "true" : undefined });
      if (requestId !== requestIdRef.current) return;
      setProducts(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(requestError?.message || "Couldn't load products.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };
  useEffect(() => {
    load();
      farmerApi.list({ limit: 100 }).then(({ data }) => setFarmers(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []))).catch((requestError) => setError(requestError?.message || "Couldn't load farmer options."));
  }, [search, category, status, page, pageSize, showDeleted]);

  const totalImageCount = () => existingImages.filter((_, i) => !existingToRemove.has(existingImages[i])).length + imageFiles.length;

  const openDialog = (product = null) => {
    setEditingProduct(product);
    setDraft(product ? {
      name: product.name || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
      unit: product.unit || "kg",
      description: product.description || "",
      farmer: "",
    } : { ...EMPTY_DRAFT });
    setExistingImages(product && Array.isArray(product.images) ? product.images.filter(Boolean) : []);
    setExistingToRemove(new Set());
    setImageFiles([]);
    setPreviewUrls({});
    setDialogOpen(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const invalid = files.find((f) => !validTypes.includes(f.type));
    if (invalid) { toast.error("Only JPEG, PNG, and WebP images are supported."); e.target.value = ""; return; }
    const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) { toast.error("Each image must be 5 MB or smaller."); e.target.value = ""; return; }
    if (totalImageCount() + files.length > MAX_IMAGES) { toast.error(`Maximum ${MAX_IMAGES} images per product.`); e.target.value = ""; return; }
    const newPreviews = {};
    files.forEach((f) => { newPreviews[f.name + f.size] = URL.createObjectURL(f); });
    setPreviewUrls((prev) => ({ ...prev, ...newPreviews }));
    setImageFiles((current) => [...current, ...files]);
    e.target.value = "";
  };

  const removeNewFile = (index) => {
    const file = imageFiles[index];
    if (file) URL.revokeObjectURL(previewUrls[file.name + file.size] || "");
    setImageFiles((current) => current.filter((_, i) => i !== index));
    setPreviewUrls((prev) => { const next = { ...prev }; delete next[file.name + file.size]; return next; });
  };

  const toggleExistingRemove = (url) => {
    setExistingToRemove((prev) => { const next = new Set(prev); if (next.has(url)) next.delete(url); else next.add(url); return next; });
  };

  const allDisplayImages = [
    ...existingImages.filter((_, i) => !existingToRemove.has(existingImages[i])).map((url) => ({ url, source: "existing" })),
    ...imageFiles.map((file) => ({ url: previewUrls[file.name + file.size] || URL.createObjectURL(file), source: "new", file })),
  ];

  const saveProduct = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => {
      if (key !== "farmer" || !editingProduct) formData.append(key, value);
    });
    if (editingProduct) {
      if (draft.farmer) formData.set("farmer", draft.farmer);
      if (existingToRemove.size > 0) formData.append("removeImages", JSON.stringify([...existingToRemove]));
    }
    imageFiles.forEach((file) => formData.append("images", file));
    setSavingForm(true);
    setError(null);
    try {
      const { data: savedProduct } = editingProduct
        ? await productApi.update(editingProduct._id, formData)
        : await productApi.create(formData);
      await load();
      setDialogOpen(false);
      showSuccess(
        editingProduct ? "Product updated" : "Product added",
        editingProduct
          ? `${draft.name} has been saved.`
          : `${draft.name} has been saved.${savedProduct?._id ? ` Product ID: ${savedProduct._id}` : ""}`,
      );
    } catch (requestError) {
      showError("Save failed", requestError?.message || "Couldn't save the product.");
    } finally {
      setSavingForm(false);
    }
  };

  useEffect(() => {
    categoryApi.list()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        setCategories(list.map((c) => c.name).filter(Boolean).sort());
      })
      .catch(() => setCategories([]));
  }, []);

  const toggleStatus = async (product) => {
    const nextStatus = product.status === "Inactive" ? "Active" : "Inactive";
    setSavingId(product._id);
    try {
      const { data } = await productApi.update(product._id, { status: nextStatus });
      setProducts((current) => current.map((item) => item._id === product._id ? { ...item, ...data, farmer: item.farmer } : item));
    } catch (requestError) { setError(requestError?.message || "Couldn't update product status."); }
    finally { setSavingId(""); }
  };
  const remove = async (product) => {
    const confirmed = await showDeleteConfirm(product.name);
    if (!confirmed.isConfirmed) return;
    setSavingId(product._id);
    try { await productApi.remove(product._id); setProducts((current) => current.filter((item) => item._id !== product._id)); showSuccess("Deleted", `${product.name} has been removed.`); }
    catch (requestError) { showError("Delete failed", requestError?.message || "Couldn't remove the product."); }
    finally { setSavingId(""); }
  };

  const restoreProduct = async (product) => {
    setSavingId(product._id);
    try {
      await productApi.restore(product._id);
      setProducts((current) => current.map((item) => item._id === product._id ? { ...item, isDeleted: false } : item));
      showSuccess("Restored", `${product.name} has been restored.`);
    } catch (requestError) { showError("Restore failed", requestError?.message || "Couldn't restore this product."); }
    finally { setSavingId(""); }
  };

  const restoreAllProducts = async () => {
    if (!window.confirm("Restore all deleted products? This cannot be undone.")) return;
    const deletedIds = products.filter(p => p.isDeleted).map(p => p._id);
    deletedIds.forEach(id => setSavingId(id));
    try {
      const { data } = await productApi.restoreAll();
      setProducts((current) => current.map((item) => ({ ...item, isDeleted: false })));
      showSuccess("Restored", data.message || "All deleted products restored.");
      await load();
    } catch (requestError) { showError("Restore failed", requestError?.message || "Couldn't restore all products."); }
    finally { setSavingId(""); }
  };

  if (error && !products.length) return <ErrorState message={error} onRetry={load} />;
  return <div className="space-y-4 pb-10">
    <BackButton fallback="/admin/dashboard" />
    <motion.header
      variants={sectionReveal}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap items-end justify-between gap-3"
    ><div><h1 className="text-xl font-heading font-bold text-gray-900">Products Management</h1><p className="mt-1 text-xs text-gray-500">Review and manage products across the platform.</p></div><button onClick={() => openDialog()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Add Product</button></motion.header>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error} <button onClick={load} className="underline">Retry</button></p>}
    <motion.section
      variants={sectionReveal}
      initial="hidden"
      animate="visible"
      className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search products by name, ID, category, or description" ariaLabel="Search products" />
        <select aria-label="Filter by category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs"><option value="">All Categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs"><option value="">All Status</option><option>Active</option><option>Inactive</option></select>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} className="rounded border-gray-200 text-primary focus:ring-primary" />
            <span className="text-xs text-gray-600">Show deleted products</span>
          </label>
          {showDeleted && products.some((p) => p.isDeleted) && (
            <button type="button" onClick={restoreAllProducts} disabled={Boolean(savingId)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs text-primary hover:bg-gray-50 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> Restore All</button>
          )}
      </div>
      <div className="overflow-x-auto">
          <ProductManagementSection
            products={products}
            onEdit={openDialog}
            onDelete={remove}
            onRestore={restoreProduct}
            isLoading={savingForm}
          />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-[10px] text-gray-500"><Pagination page={page} pageSize={pageSize} totalRecords={total} onChange={(nextPage, nextSize) => { setPage(nextPage); if (nextSize) setPageSize(nextSize); }} /></div>
    </motion.section>
    <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingProduct ? "Edit Product" : "Add Product"}>
      <form onSubmit={saveProduct} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {editingProduct && <div className="sm:col-span-2">
            <p className="text-xs text-gray-600">Product ID (read-only)</p>
            <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <ProductIdentifier productId={editingProduct._id} />
            </div>
          </div>}
          <label className="text-xs text-gray-600">Product name<input required value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Category<input required list="admin-product-categories" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/><datalist id="admin-product-categories">{categories.map(item => <option key={item} value={item} />)}</datalist></label>
          <label className="text-xs text-gray-600">Price<input required min="0" step="0.01" type="number" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Unit<input required value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Stock<input required min="0" type="number" value={draft.stock} onChange={e => setDraft(d => ({ ...d, stock: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Minimum stock<input required min="0" type="number" value={draft.lowStockThreshold} onChange={e => setDraft(d => ({ ...d, lowStockThreshold: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          {!editingProduct && <label className="text-xs text-gray-600 sm:col-span-2">Farmer<select required value={draft.farmer} onChange={e => setDraft(d => ({ ...d, farmer: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border bg-white px-3 text-xs"><option value="">Select farmer</option>{farmers.map(f => <option key={f.user?._id || f.user} value={f.user?._id || f.user}>{f.user?.name || f.farmName} · {f.farmName}</option>)}</select></label>}
          <label className="text-xs text-gray-600 sm:col-span-2">Description<textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} rows="3" className="mt-1 w-full rounded-lg border p-2 text-xs"/></label>
          <label className="text-xs text-gray-600 sm:col-span-2">Product images</label>
          <div className="flex flex-wrap gap-2 mb-2 sm:col-span-2">
            {allDisplayImages.length === 0 && <p className="text-xs text-gray-400">No images yet. Upload up to {MAX_IMAGES} images.</p>}
            {allDisplayImages.map((img, idx) => {
              const isExisting = img.source === "existing";
              const isRemoved = isExisting && existingToRemove.has(img.url);
              if (isRemoved) return null;
              return (
                <div key={isExisting ? `existing-${idx}` : `new-${idx}`} className="relative group">
                  <ImageWithFallback src={getImageUrl(img.url)} alt={draft.name} className="h-20 w-20 rounded-md object-cover border border-gray-200" />
                  <button type="button" onClick={isExisting ? () => toggleExistingRemove(img.url) : () => removeNewFile(idx)} className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white h-5 w-5 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove image">×</button>
                </div>
              );
            })}
          </div>
          <label className="text-xs text-gray-600 sm:col-span-2">Add more images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileChange} className="mt-1 block w-full text-xs" disabled={totalImageCount() >= MAX_IMAGES || savingForm}/></label>
          {!editingProduct && totalImageCount() === 0 && <p className="text-xs text-red-600 mt-1 sm:col-span-2">At least one image is required for new products.</p>}
          {totalImageCount() >= MAX_IMAGES && <p className="text-xs text-gray-500 mt-1 sm:col-span-2">Maximum {MAX_IMAGES} images per product reached.</p>}
          <p className="text-xs text-gray-500 mt-1 sm:col-span-2">Up to {MAX_IMAGES} images. JPG, JPEG, PNG, WEBP (max 5 MB each). First image is the cover.</p>
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setDialogOpen(false)} className="h-9 rounded-lg border px-4 text-xs">Cancel</button><button disabled={savingForm || (!editingProduct && !farmers.length)} className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-white disabled:opacity-50">{savingForm ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}</button></div>
      </form>
    </Modal>
  </div>;
}