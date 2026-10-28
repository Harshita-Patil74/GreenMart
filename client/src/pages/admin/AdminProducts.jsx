import React, { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Search, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import productApi from "../../api/productApi";
import farmerApi from "../../api/farmerApi";
import BackButton from "../../components/common/BackButton.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";
import Modal from "../../components/common/Modal.jsx";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;
const EMPTY_DRAFT = { name: "", category: "", price: "", stock: "", lowStockThreshold: "5", unit: "kg", description: "", farmer: "" };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [imageFiles, setImageFiles] = useState([]);
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await productApi.list({ limit: 500 });
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch (requestError) { setError(requestError?.message || "Couldn't load products."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    farmerApi.list().then(({ data }) => setFarmers(Array.isArray(data) ? data : [])).catch((requestError) => setError(requestError?.message || "Couldn't load farmer options."));
  }, []);

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
    setImageFiles([]);
    setDialogOpen(true);
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => {
      if (key !== "farmer" || !editingProduct) formData.append(key, value);
    });
    if (editingProduct) {
      if (draft.farmer) formData.set("farmer", draft.farmer);
    }
    imageFiles.forEach((file) => formData.append("images", file));
    setSavingForm(true);
    setError(null);
    try {
      if (editingProduct) await productApi.update(editingProduct._id, formData);
      else await productApi.create(formData);
      await load();
      setDialogOpen(false);
      toast.success(editingProduct ? "Product updated." : "Product added.");
    } catch (requestError) {
      setError(requestError?.message || "Couldn't save the product.");
    } finally {
      setSavingForm(false);
    }
  };

  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);
  const filtered = useMemo(() => products.filter((product) =>
    (!search || `${product.name} ${product.category} ${product.farmer?.name || ""}`.toLowerCase().includes(search.toLowerCase()))
    && (!category || product.category === category)
    && (!status || (product.status || "Active") === status)), [products, search, category, status]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

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
    if (!window.confirm(`Remove ${product.name}? This cannot be undone.`)) return;
    setSavingId(product._id);
    try { await productApi.remove(product._id); setProducts((current) => current.filter((item) => item._id !== product._id)); }
    catch (requestError) { setError(requestError?.message || "Couldn't remove the product."); }
    finally { setSavingId(""); }
  };

  if (error && !products.length) return <ErrorState message={error} onRetry={load} />;
  return <div className="space-y-4 pb-10">
    <BackButton fallback="/admin/dashboard" />
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-heading font-bold text-gray-900">Products Management</h1><p className="mt-1 text-xs text-gray-500">Review and manage products across the platform.</p></div><button onClick={()=>openDialog()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Add Product</button></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error} <button onClick={load} className="underline">Retry</button></p>}
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
        <label className="relative min-w-48 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input aria-label="Search products" value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1);}} placeholder="Search products..." className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs"/></label>
        <select aria-label="Filter by category" value={category} onChange={(e)=>{setCategory(e.target.value);setPage(1);}} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs"><option value="">All Categories</option>{categories.map((item)=><option key={item}>{item}</option>)}</select>
        <select aria-label="Filter by status" value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1);}} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs"><option value="">All Status</option><option>Active</option><option>Inactive</option></select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs">
        <thead><tr className="bg-gray-50 text-[10px] uppercase text-gray-500"><th className="px-3 py-3">Image</th><th className="px-3 py-3">Product Name</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading products...</td></tr> : visible.map((product)=><tr key={product._id}>
          <td className="px-3 py-2"><ImageWithFallback src={getImageUrl(product.images?.[0])} alt="" className="h-9 w-9 rounded-lg object-cover"/></td>
          <td className="px-3 py-2 font-medium text-gray-800">{product.name}<div className="text-[10px] text-gray-400">{product.farmer?.name || "Farmer"}</div></td>
          <td className="px-3 py-2 text-gray-600">{product.category}</td><td className="px-3 py-2">₹{product.price} / {product.unit}</td><td className="px-3 py-2">{product.stock} {product.unit}</td>
          <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] ${product.status === "Inactive" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>{product.status || "Active"}</span></td>
          <td className="px-3 py-2"><div className="flex items-center gap-1"><button onClick={()=>openDialog(product)} aria-label={`Edit ${product.name}`} className="rounded p-1 text-gray-600"><Edit2 className="h-4 w-4"/></button><button disabled={savingId===product._id} onClick={()=>toggleStatus(product)} aria-label={`${product.status === "Inactive" ? "Activate" : "Deactivate"} ${product.name}`} className="rounded p-1 text-primary disabled:opacity-50">{product.status === "Inactive" ? <ToggleLeft className="h-4 w-4"/> : <ToggleRight className="h-4 w-4"/>}</button><button disabled={savingId===product._id} onClick={()=>remove(product)} aria-label={`Remove ${product.name}`} className="rounded p-1 text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4"/></button></div></td>
        </tr>)}
        {!loading && !visible.length && <tr><td colSpan="7" className="p-8 text-center text-gray-500">No products match these filters.</td></tr>}</tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-[10px] text-gray-500"><span>Showing {filtered.length ? (page-1)*PAGE_SIZE+1 : 0}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length} products</span><div className="flex gap-1"><button disabled={page<=1} onClick={()=>setPage(page-1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><span className="px-2 py-1">{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(page+1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div>
    </section>
    <Modal open={dialogOpen} onClose={()=>setDialogOpen(false)} title={editingProduct?"Edit Product":"Add Product"}>
      <form onSubmit={saveProduct} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-gray-600">Product name<input required value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Category<input required list="admin-product-categories" value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/><datalist id="admin-product-categories">{categories.map(item=><option key={item} value={item}/>)}</datalist></label>
          <label className="text-xs text-gray-600">Price<input required min="0" step="0.01" type="number" value={draft.price} onChange={e=>setDraft(d=>({...d,price:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Unit<input required value={draft.unit} onChange={e=>setDraft(d=>({...d,unit:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Stock<input required min="0" type="number" value={draft.stock} onChange={e=>setDraft(d=>({...d,stock:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          <label className="text-xs text-gray-600">Minimum stock<input required min="0" type="number" value={draft.lowStockThreshold} onChange={e=>setDraft(d=>({...d,lowStockThreshold:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs"/></label>
          {!editingProduct&&<label className="text-xs text-gray-600 sm:col-span-2">Farmer<select required value={draft.farmer} onChange={e=>setDraft(d=>({...d,farmer:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border bg-white px-3 text-xs"><option value="">Select farmer</option>{farmers.map(f=><option key={f.user?._id||f.user} value={f.user?._id||f.user}>{f.user?.name||f.farmName} · {f.farmName}</option>)}</select></label>}
          <label className="text-xs text-gray-600 sm:col-span-2">Description<textarea value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} rows="3" className="mt-1 w-full rounded-lg border p-2 text-xs"/></label>
          <label className="text-xs text-gray-600 sm:col-span-2">Product images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>setImageFiles(Array.from(e.target.files||[]).slice(0,5))} className="mt-1 block w-full text-xs"/></label>
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setDialogOpen(false)} className="h-9 rounded-lg border px-4 text-xs">Cancel</button><button disabled={savingForm||(!editingProduct&&!farmers.length)} className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-white disabled:opacity-50">{savingForm?"Saving...":editingProduct?"Save Changes":"Add Product"}</button></div>
      </form>
    </Modal>
  </div>;
}
