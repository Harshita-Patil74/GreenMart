import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import newsletterApi from "../../api/newsletterApi";
import BackButton from "../../components/common/BackButton.jsx";
import { formatDate } from "../../pages/farmer/farmerUtils.js";

export default function MyNewsletters({ role = "customer" } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const fetchNewsletters = role === "farmer" ? newsletterApi.farmerNewsletters : newsletterApi.customerNewsletters;
  const markRead = role === "farmer" ? newsletterApi.markFarmerNewsletterRead : newsletterApi.markNewsletterRead;

  const TYPES = [
    { value: "all", label: "All Types" },
    { value: "offers", label: "Offers & Discounts" },
    { value: "new-products", label: "New Products" },
    { value: "fresh-harvest", label: "Fresh Harvest" },
    { value: "farmer-spotlight", label: "Farmer Spotlight" },
    { value: "announcements", label: "Announcements" },
    { value: "custom", label: "Custom Newsletter" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchNewsletters({
        page,
        limit: 10,
        search: debouncedSearch,
        type: typeFilter,
        read: readFilter,
      })
      .then(({ data }) => {
        if (!active) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total || 0);
        setPages(data?.pages || 1);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError?.message || "Couldn't load newsletters.");
        setItems([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, debouncedSearch, typeFilter, readFilter, fetchNewsletters]);

  const handleRead = async (id) => {
    try {
      await markRead(id);
      setItems((prev) => prev.map((item) =>
        item._id === id ? { ...item, isRead: true } : item
      ));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  return (
    <div className="space-y-4 pb-12 mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <BackButton fallback={`/${role}/dashboard`} />
      <motion.header
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-heading font-bold text-gray-900">My Newsletters</h1>
          <p className="mt-1 text-xs text-gray-500">Previously received newsletters from GreenMart.</p>
        </div>
        <input
          type="search"
          aria-label="Search by campaign title"
          placeholder="Search by campaign title"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setDebouncedSearch(search.trim());
              setPage(1);
            }
          }}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs focus:border-primary focus:outline-none sm:w-64"
        />
      </motion.header>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <motion.nav
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap gap-1.5 overflow-x-auto rounded-xl border border-gray-100 bg-white p-2 scrollbar-hide mb-3"
      >
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setTypeFilter(t.value); setPage(1); }}
            className={`shrink-0 h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition ${
              typeFilter === t.value
                ? "border-[#087449] bg-[#087449] text-white"
                : "border-transparent text-[#475852] hover:border-[#D9E7DE] hover:bg-[#F6FAF8]"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">Read:</span>
          <button
            type="button"
            onClick={() => { setReadFilter("all"); setPage(1); }}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${readFilter === "all" ? "border-[#087449] bg-[#087449] text-white" : "border-transparent text-[#475852]"}`}>
            All
          </button>
          <button
            type="button"
            onClick={() => { setReadFilter("unread"); setPage(1); }}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${readFilter === "unread" ? "border-[#087449] bg-[#087449] text-white" : "border-transparent text-[#475852]"}`}>
            Unread
          </button>
          <button
            type="button"
            onClick={() => { setReadFilter("read"); setPage(1); }}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${readFilter === "read" ? "border-[#087449] bg-[#087449] text-white" : "border-transparent text-[#475852]"}`}>
            Read
          </button>
        </div>
      </motion.nav>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-xs text-[#68756B]" role="status">
          Loading newsletters...
        </div>
      ) : items.length === 0 ? (
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-gray-100 bg-white p-12 text-center"
        >
          <span className="mx-auto h-10 w-10 text-gray-300">📭</span>
          <h2 className="mt-3 text-sm font-semibold text-gray-900">
            {debouncedSearch || typeFilter !== "all" || readFilter !== "all" ? "No newsletters match your search and filters" : "No newsletters yet"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {debouncedSearch || typeFilter !== "all" || readFilter !== "all"
              ? "Try a different title or adjust the selected filters."
              : "When a new campaign is processed, it will appear here."}
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((item) => (
                <motion.div
                  key={item._id}
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                  className={`min-h-[340px] rounded-xl border p-4 shadow-sm flex flex-col ${item.isRead ? "bg-white border-gray-100" : "bg-[#F6FAF8] border-[#D9E7DE]"}`}
                >
                  {(item.bannerImage || item.bannerImageUrl) && (
                    <img
                      src={item.bannerImage || item.bannerImageUrl}
                      alt=""
                      className="mb-3 h-36 w-full rounded-lg object-cover border border-[#E2E6DF]"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider" style={{ color: item.campaignType === "offers" ? "#16803C" : "#6B7280", backgroundColor: item.campaignType === "offers" ? "#EAF2E7" : "#F3F4F6" }}>
                        {item.campaignType}
                      </span>
                      {!item.isRead && <span className="h-2 w-2 rounded-full bg-[#0A9A60]" aria-label="Unread" />}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 leading-snug">{item.campaignName || item.subject}</h3>
                    <p className="mt-1 text-[11px] text-gray-600 line-clamp-2">{item.heading || item.subject}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span>{item.createdAt ? formatDate(item.createdAt, { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                      <span className={`text-[9px] font-semibold ${item.isRead ? "text-gray-400" : "text-[#087449]"}`}>
                        {item.isRead ? "Read" : "Unread"}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/${role}/newsletters/${item.campaignId}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-semibold text-primary hover:bg-gray-50"
                  >
                    View
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            className="mt-3 flex items-center justify-between text-xs"
          >
            <span>Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border px-2 py-1 text-[10px] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="rounded border px-2 py-1 text-[10px] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
