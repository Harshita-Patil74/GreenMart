import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import BackButton from "../../components/common/BackButton.jsx";
import toast from "react-hot-toast";
import productApi from "../../api/productApi";
import getImageUrl from "../../utils/imageUrl";
import { formatCurrency, getStatusClasses, unwrapList } from "./farmerUtils";

const PAGE_SIZE = 6;

function availability(product) {
  if (Number(product.stock) <= 0) return "Out of stock";
  return product.status || "Active";
}

export default function MyProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Status");
  const [page, setPage] = useState(1);
  const [openActions, setOpenActions] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState({});

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await productApi.mine();
      setProducts(unwrapList(response.data));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't load your products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    [products]
  );
  const filteredProducts = useMemo(() => products.filter((product) => {
    const searchable = `${product.name || ""} ${product.category || ""}`.toLowerCase();
    const productStatus = availability(product);
    return (!search || searchable.includes(search.toLowerCase()))
      && (category === "All Categories" || product.category === category)
      && (status === "All Status"
        || (status === "Active" && productStatus.toLowerCase() === "active")
        || (status === "Inactive" && productStatus.toLowerCase() === "inactive")
        || (status === "Out of stock" && productStatus === "Out of stock")
        || (status === "Low stock" && Number(product.stock) > 0 && Number(product.stock) <= Number(product.lowStockThreshold ?? 5)));
  }), [products, search, category, status]);
  const pages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const visibleProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const removeProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await productApi.remove(product._id);
      setProducts((current) => current.filter((item) => item._id !== product._id));
      setOpenActions("");
      toast.success("Product deleted.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't delete this product.");
    }
  };

  const toggleAvailability = async (product) => {
    const nextStatus = product.status === "Inactive" ? "Active" : "Inactive";
    setUpdatingStatus((current) => ({ ...current, [product._id]: true }));
    try {
      const form = new FormData();
      form.append("status", nextStatus);
      const response = await productApi.update(product._id, form);
      setProducts((current) => current.map((item) => item._id === product._id ? { ...item, ...response.data } : item));
      setOpenActions("");
      toast.success(nextStatus === "Active" ? "Product is available again." : "Product listing deactivated.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't update product availability.");
    } finally {
      setUpdatingStatus((current) => ({ ...current, [product._id]: false }));
    }
  };

  return (
    <section className="space-y-4 pb-5 text-[13px] text-[#20312E]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">My Products</h1>
          <p className="mt-1 text-xs text-[#71817D]">Manage your products and keep your listings up to date.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/farmer/products/new")}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white hover:bg-[#066B42]"
        >
          <Plus size={14} /> Add Product
        </button>
      </header>

      <div className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EDF1F0] p-3">
          <label className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#91A09B]" />
            <input
              aria-label="Search products"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search products"
              className="h-8 w-full rounded-md border border-[#DDE6E2] bg-white pl-8 pr-2 text-xs outline-none focus:border-[#179361]"
            />
          </label>
          <select aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-8 rounded-md border border-[#DDE6E2] bg-white px-2 text-xs text-[#41514D]">
            <option>All Categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-8 rounded-md border border-[#DDE6E2] bg-white px-2 text-xs text-[#41514D]">
            {["All Status", "Active", "Inactive", "Low stock", "Out of stock"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        {error ? (
          <div role="alert" className="p-8 text-center text-sm text-[#6A7773]">
            <p>{error}</p>
            <button type="button" onClick={loadProducts} className="mt-3 font-semibold text-[#07814E]">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-xs text-[#778681]">Loading products…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-[#E9EFED] bg-[#F7F9F8] text-[10px] font-semibold uppercase tracking-wide text-[#71817D]">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Image</th>
                    <th className="px-3 py-2.5 font-semibold">Product Name</th>
                    <th className="px-3 py-2.5 font-semibold">Category</th>
                    <th className="px-3 py-2.5 font-semibold">Price</th>
                    <th className="px-3 py-2.5 font-semibold">Stock</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F0]">
                  {visibleProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-[#FBFCFC]">
                      <td className="px-3 py-2">
                        <img src={getImageUrl(product.images?.[0])} alt={product.name} className="h-8 w-8 rounded-md border border-[#E9EFEC] object-cover" />
                      </td>
                      <td className="px-3 py-2 font-medium text-[#263834]">{product.name}</td>
                      <td className="px-3 py-2 text-[#74827E]">{product.category || "—"}</td>
                      <td className="px-3 py-2 font-medium text-[#32443F]">{formatCurrency(product.price)} <span className="text-[10px] font-normal text-[#899691]">/ {product.unit || "unit"}</span></td>
                      <td className="px-3 py-2 text-[#52615D]">{product.stock ?? 0} {product.unit || ""}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(availability(product))}`}>{availability(product)}</span>
                      </td>
                      <td className="relative px-3 py-2 text-right">
                        <button type="button" aria-label={`Actions for ${product.name}`} onClick={() => setOpenActions(openActions === product._id ? "" : product._id)} className="rounded p-1 text-[#61716C] hover:bg-[#F0F5F2]">
                          <MoreVertical size={16} />
                        </button>
                        {openActions === product._id && (
                          <div className="absolute right-4 top-9 z-10 w-28 rounded-md border border-[#E3EBE7] bg-white p-1 text-left shadow-lg">
                            <button type="button" onClick={() => navigate(`/farmer/products/${product._id}/edit`)} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#F4F8F6]">Edit product</button>
                            <button type="button" disabled={updatingStatus[product._id]} onClick={() => toggleAvailability(product)} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#F4F8F6] disabled:opacity-50">
                              {updatingStatus[product._id] ? "Saving…" : product.status === "Inactive" ? "Activate listing" : "Deactivate"}
                            </button>
                            <button type="button" onClick={() => removeProduct(product)} className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-red-700 hover:bg-red-50"><Trash2 size={12} /> Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!visibleProducts.length && <tr><td colSpan="7" className="px-3 py-10 text-center text-xs text-[#82908B]">No products match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF1F0] px-3 py-2 text-[10px] text-[#788782]">
              <span>Showing {filteredProducts.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length} products</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-[#DFE8E4] p-1 disabled:opacity-40"><ChevronLeft size={13} /></button>
                <span className="px-2">{page} / {pages}</span>
                <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="rounded border border-[#DFE8E4] p-1 disabled:opacity-40"><ChevronRight size={13} /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
