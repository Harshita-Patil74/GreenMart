import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, MoreVertical, Plus, Trash2, RotateCcw } from "lucide-react";
import BackButton from "../../components/common/BackButton.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";
import toast from "react-hot-toast";
import productApi from "../../api/productApi";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { getImageUrl } from "../../utils/imageUrl";
import { formatCurrency } from "./farmerUtils";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import Pagination from "../../components/common/Pagination.jsx";

const PAGE_SIZE = 10;

function availability(product) {
  if (Number(product.stock) <= 0) return "Out of stock";
  return product.status || "Active";
}

export default function MyProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routedSearch = searchParams.get("search") || "";
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(routedSearch);
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Status");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [showDeleted, setShowDeleted] = useState(false);
  const [serverPages, setServerPages] = useState(1);
  const [openActions, setOpenActions] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState({});
  const productsRequest = useRef(0);

  useEffect(() => {
    setSearch(routedSearch);
    setPage(1);
  }, [routedSearch]);

  const loadProducts = async () => {
    const requestId = ++productsRequest.current;
    setLoading(true);
    setError("");
    try {
      const response = await productApi.mine({ search, category, status, page, limit: pageSize, showDeleted: showDeleted ? "true" : undefined });
      const data = response.data;
      if (requestId !== productsRequest.current) return;
      const results = Array.isArray(data?.items) ? data.items : [];
      const normalizedResults = showDeleted
        ? results.filter((product) => product && product.isDeleted === true)
        : results.filter((product) => !(product && product.isDeleted === true));
      setProducts(normalizedResults);
      setTotal(Number(data?.total) || normalizedResults.length);
      setServerPages(Number(data?.pages) || 1);
      if (page > Number(data?.pages || 1)) setPage(Number(data?.pages || 1));
    } catch (requestError) {
      if (requestId !== productsRequest.current) return;
      setError(requestError?.response?.data?.message || "We couldn't load your products.");
    } finally {
      if (requestId === productsRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search, category, status, page, pageSize, showDeleted]);

  useEffect(() => () => { productsRequest.current += 1; }, []);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    [products]
  );
  const visibleProducts = products;
  const pages = serverPages;

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

  const restoreProduct = async (product) => {
    setUpdatingStatus((current) => ({ ...current, [product._id]: true }));
    try {
      await productApi.restore(product._id);
      if (showDeleted) {
        setProducts((current) => current.filter((item) => item._id !== product._id));
        setTotal((current) => Math.max(0, current - 1));
        setServerPages((current) => Math.max(1, Math.ceil(Math.max(0, total - 1) / pageSize)));
        if (page > 1 && products.length === 1) setPage((current) => current - 1);
      } else {
        setProducts((current) => current.map((item) => item._id === product._id ? { ...item, isDeleted: false } : item));
      }
      setOpenActions("");
      toast.success("Product restored successfully.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't restore this product.");
    } finally {
      setUpdatingStatus((current) => ({ ...current, [product._id]: false }));
    }
  };

  const restoreAllProducts = async () => {
    if (!window.confirm("Restore all deleted products? This cannot be undone.")) return;
    setUpdatingStatus((current) => ({ ...Object.fromEntries(products.filter(p => p.isDeleted).map(p => [p._id, true])) }));
    try {
      const { data } = await productApi.restoreAll();
      if (showDeleted) {
        setProducts([]);
        setTotal(0);
        setServerPages(1);
        setPage(1);
      } else {
        setProducts((current) => current.map((item) => ({ ...item, isDeleted: false })));
      }
      setOpenActions("");
      toast.success(data.message || "All deleted products restored.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't restore all products.");
    } finally {
      setUpdatingStatus({});
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-sm text-[#20312E]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">My Products</h1>
          <p className="mt-1 text-xs text-[#71817D]">Manage your products and keep your listings up to date.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/farmer/products/new")}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white hover:bg-[#066B42]"
        >
          <Plus size={14} /> Add Product
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#EDF1F0] p-4">
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search products by name, ID, category, or description" ariaLabel="Search products" />
          <select aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-9 min-w-[150px] rounded-md border border-[#DDE6E2] bg-white px-3 text-xs text-[#41514D]">
            <option>All Categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 min-w-[140px] rounded-md border border-[#DDE6E2] bg-white px-3 text-xs text-[#41514D]">
            {["All Status", "Active", "Inactive", "Low stock", "Out of stock"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} className="rounded border-[#DDE6E2] text-[#07814E] focus:ring-[#07814E]" />
            <span className="text-xs text-[#41514D]">Show deleted products</span>
          </label>
          {showDeleted && products.some((p) => p.isDeleted) && (
            <button type="button" onClick={restoreAllProducts} disabled={Object.values(updatingStatus).some(Boolean)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#DDE6E2] bg-white px-3 text-xs text-[#07814E] hover:bg-[#F0F5F2] disabled:opacity-50"><RotateCcw size={14} /> Restore All</button>
          )}
        </div>

        {error ? (
          <div role="alert" className="p-10 text-center text-xs text-[#6A7773]">
            <p>{error}</p>
            <button type="button" onClick={loadProducts} className="mt-3 text-xs font-semibold text-[#07814E]">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-xs text-[#778681]">Loading products…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left text-xs">
                <thead className="border-b border-[#E9EFED] bg-[#F7F9F8] text-[10px] font-semibold uppercase tracking-wide text-[#71817D]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Image</th>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">Product ID</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F0]">
                  {visibleProducts.map((product) => (
                    <tr key={product._id} className="h-[68px] hover:bg-[#FBFCFC]">
                      <td className="px-4 py-3">
                        <ImageWithFallback src={getImageUrl(product.images?.[0])} alt={product.name} className="h-11 w-11 rounded-md border border-[#E9EFEC] object-cover" />
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#263834]">
                        {product.name}
                      </td>
                      <td className="px-4 py-3"><ProductIdentifier productId={product._id} compact /></td>
                      <td className="px-4 py-3 text-xs text-[#74827E]">{product.category || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-[#32443F]">{formatCurrency(product.price)} <span className="text-[10px] font-normal text-[#899691]">/ {product.unit || "unit"}</span></td>
                      <td className="px-4 py-3 text-xs text-[#52615D]">{product.stock ?? 0} {product.unit || ""}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={availability(product)} />
                      </td>
                      <td className="relative px-4 py-3 text-right">
                        <button type="button" aria-label={`Actions for ${product.name}`} onClick={() => setOpenActions(openActions === product._id ? "" : product._id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#DDE6E2] text-[#61716C] hover:bg-[#F0F5F2]">
                          <MoreVertical size={18} />
                        </button>
                        {openActions === product._id && (
                          <div className="absolute right-4 top-12 z-10 min-w-36 rounded-md border border-[#E3EBE7] bg-white p-1 text-left shadow-lg">
                            <button type="button" onClick={() => navigate(`/farmer/products/${product._id}/edit`)} className="block w-full rounded px-2.5 py-2 text-left text-xs hover:bg-[#F4F8F6]">Edit product</button>
                            <button type="button" disabled={updatingStatus[product._id]} onClick={() => toggleAvailability(product)} className="block w-full rounded px-2.5 py-2 text-left text-xs hover:bg-[#F4F8F6] disabled:opacity-50">
                              {updatingStatus[product._id] ? "Saving…" : product.status === "Inactive" ? "Activate listing" : "Deactivate"}
                            </button>
                            {product.isDeleted && (
                              <button type="button" onClick={() => restoreProduct(product)} className="block w-full rounded px-2.5 py-2 text-left text-xs hover:bg-[#F4F8F6]"><RotateCcw size={14} /> Restore product</button>
                            )}
                            <button type="button" onClick={() => removeProduct(product)} className="flex w-full items-center gap-1.5 rounded px-2.5 py-2 text-left text-xs text-red-700 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!visibleProducts.length && <tr><td colSpan="8" className="px-4 py-12 text-center text-xs text-[#82908B]">{showDeleted ? "No deleted products found." : "No products match these filters."}</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} totalRecords={total} onChange={(nextPage, nextSize) => { setPage(nextPage); if (nextSize) setPageSize(nextSize); }} />
          </>
        )}
      </div>
    </section>
  );
}
