import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import productApi from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard.jsx";
import FilterPanel from "../../components/product/FilterPanel.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import useDebounce from "../../hooks/useDebounce.js";

const PAGE_SIZE = 12;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const requestedSort = params.get("sort");
  const sort = ["price_asc", "price_desc", "rating"].includes(requestedSort) ? requestedSort : "newest";
  const search = params.get("search") || "";
  const page = Math.max(1, Number(params.get("page") || 1));
  const [maxPrice, setMaxPrice] = useState(Number(params.get("maxPrice") || 1000));
  const [inStock, setInStock] = useState(true);
  const [outOfStock, setOutOfStock] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setMaxPrice(Number(params.get("maxPrice") || 1000));
  }, [params]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const availability = inStock && !outOfStock ? "true" : !inStock && outOfStock ? "false" : undefined;
    productApi.storefront({
      category: category || undefined,
      sort: ["price_asc", "price_desc", "rating"].includes(sort) ? sort : undefined,
      search: debouncedSearch.trim() || undefined,
      maxPrice: maxPrice < 1000 ? maxPrice : undefined,
      inStock: availability,
      page,
      limit: PAGE_SIZE,
    }).then(({ data }) => {
      if (!active) return;
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
      setPages(Number(data?.pages) || 0);
    }).catch((requestError) => {
      if (active) {
        setError(requestError?.message || "Couldn't load products.");
        setItems([]);
        setTotal(0);
        setPages(0);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [category, sort, debouncedSearch, maxPrice, inStock, outOfStock, page, retryCount]);

  const setParam = (key, value, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage && key !== "page") next.delete("page");
    setParams(next);
  };

  const setPrice = (value) => {
    setMaxPrice(value);
    setParam("maxPrice", value < 1000 ? String(value) : "");
  };

  const filters = {
    category,
    setCategory: (value) => setParam("category", value),
    inStock,
    setInStock,
    outOfStock,
    setOutOfStock,
    maxPrice,
    setMaxPrice: setPrice,
  };

  return (
    <div className="gm-container py-5 pb-16">
      <BackButton fallback="/" />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-heading font-bold text-gray-900">{category || "Shop Organic Products"}</h1>
          <p className="mt-1 text-xs text-gray-500">Fresh produce from GreenMart farmers.</p>
        </div>
        <button onClick={() => setMobileFilterOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 md:hidden"><SlidersHorizontal className="h-4 w-4 text-primary" />Filters</button>
      </div>

      <div className="flex items-start gap-4">
        <aside className="hidden w-[220px] shrink-0 md:block"><FilterPanel {...filters} /></aside>

        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex justify-start bg-black/40 md:hidden" onClick={() => setMobileFilterOpen(false)}>
            <div className="h-full w-80 max-w-[88vw] overflow-y-auto bg-[#F7FAF8] p-4" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Filters</h2><button onClick={() => setMobileFilterOpen(false)} aria-label="Close filters"><X className="h-4 w-4" /></button></div>
              <FilterPanel {...filters} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <label className="relative min-w-[180px] flex-1">
              <span className="sr-only">Search products</span>
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setParam("search", event.target.value)} placeholder="Search products..." className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs focus:border-primary focus:outline-none" />
            </label>
            <label className="sr-only" htmlFor="product-sort">Sort products</label>
            <select id="product-sort" value={sort} onChange={(event) => setParam("sort", event.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <div className="mb-3 text-[11px] text-gray-500">{loading ? "Loading products..." : `Showing ${total ? (page - 1) * PAGE_SIZE + 1 : 0}–${Math.min(page * PAGE_SIZE, total)} of ${total} products`}</div>
          {error ? <ErrorState message={error} onRetry={() => setRetryCount((count) => count + 1)} /> : loading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="h-64 animate-pulse rounded-xl bg-white" />)}</div>
          ) : items.length ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{items.map((product) => <ProductCard key={product._id} product={product} />)}</div>
              {pages > 1 && <div className="mt-5 flex items-center justify-center gap-2">
                <button disabled={page <= 1} onClick={() => setParam("page", String(page - 1), false)} className="h-8 rounded-lg border border-gray-200 px-3 text-xs disabled:opacity-40">Previous</button>
                {Array.from({ length: Math.min(5, pages) }, (_, index) => Math.min(Math.max(1, page - 2), Math.max(1, pages - 4)) + index).map((number) => <button key={number} onClick={() => setParam("page", String(number), false)} className={`h-8 min-w-8 rounded-lg px-2 text-xs ${page === number ? "bg-primary text-white" : "border border-gray-200 bg-white text-gray-700"}`}>{number}</button>)}
                <button disabled={page >= pages} onClick={() => setParam("page", String(page + 1), false)} className="h-8 rounded-lg border border-gray-200 px-3 text-xs disabled:opacity-40">Next</button>
              </div>}
            </>
          ) : <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">No products match these filters.</div>}
        </main>
      </div>
    </div>
  );
}
