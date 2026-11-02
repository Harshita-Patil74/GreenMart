import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent, CheckCircle2, Clock3, Eye, MoreHorizontal, Plus, Search,
  ShoppingBag, Tag, X,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../../components/common/Modal.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import farmerOffersApi from "../../api/farmerOffersApi.js";
import OfferCountdown from "../../components/offers/OfferCountdown.jsx";
import { formatCurrency, formatDate } from "./farmerUtils.js";
import getImageUrl from "../../utils/imageUrl.js";

const PAGE_SIZE = 8;
const OFFER_TYPES = ["Seasonal Offer", "Farmer Special", "Limited-Time Deal", "Bundle Offer"];
const DISCOUNT_TYPES = ["Percentage", "Fixed Amount"];
const EMPTY_DRAFT = {
  title: "", description: "", type: OFFER_TYPES[0], product: "", discountType: "Percentage",
  discountValue: "", startDate: "", endDate: "", startTime: "", endTime: "",
  minimumQuantity: "1", minimumAmount: "0", maximumDiscount: "", bundleConditions: "",
};

function statusStyle(status) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
    Rejected: "bg-red-50 text-red-700",
    Expired: "bg-slate-100 text-slate-600",
    Inactive: "bg-gray-100 text-gray-600",
    Scheduled: "bg-blue-50 text-blue-700",
  };
  return styles[status] || styles.Inactive;
}

function inputClass(hasError = false) {
  return `mt-1 h-9 w-full rounded-md border bg-white px-2.5 text-xs text-[#263B34] outline-none focus:border-[#14905B] ${hasError ? "border-red-400" : "border-[#DDE6E2]"}`;
}

function formDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function FarmerOffers() {
  const [offers, setOffers] = useState([]);
  const [stats, setStats] = useState({ totalOffers: 0, activeOffers: 0, pendingApproval: 0, totalSales: 0, salesTrackingAvailable: true });
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [actionsFor, setActionsFor] = useState("");
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const productSelectRef = useRef(null);

  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const { data } = await farmerOffersApi.eligibleProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setProducts([]);
      setProductsError(requestError?.message || "Couldn't load eligible products.");
    } finally {
      setProductsLoading(false);
    }
  };

  const loadOffers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await farmerOffersApi.list({
        page, limit: PAGE_SIZE, search: search.trim(), type: typeFilter, status: statusFilter,
      });
      setOffers(Array.isArray(data?.items) ? data.items : []);
      setPages(Math.max(1, Number(data?.pages) || 1));
      setStats(data?.stats || stats);
    } catch (requestError) {
      setError(requestError?.message || "Couldn't load your offers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(loadOffers, 200);
    return () => window.clearTimeout(timer);
  }, [page, search, typeFilter, statusFilter]);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product._id) === String(draft.product)),
    [products, draft.product]
  );

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT, product: products[0]?._id || "" });
    setFormErrors({});
    setDialog({ mode: "form" });
  };

  const openEdit = (offer) => {
    setEditing(offer);
    setDraft({
      title: offer.title || "",
      description: offer.description || "",
      type: offer.type || OFFER_TYPES[0],
      product: offer.product?._id || offer.product || "",
      discountType: offer.discountType || "Percentage",
      discountValue: String(offer.discountValue ?? ""),
      startDate: formDate(offer.startDate),
      endDate: formDate(offer.endDate),
      startTime: offer.startAt ? new Date(offer.startAt).toISOString().slice(11, 16) : "",
      endTime: offer.endAt ? new Date(offer.endAt).toISOString().slice(11, 16) : "",
      minimumQuantity: String(offer.minimumQuantity ?? 1),
      minimumAmount: String(offer.minimumAmount ?? 0),
      maximumDiscount: offer.maximumDiscount == null ? "" : String(offer.maximumDiscount),
      bundleConditions: offer.bundleConditions || "",
    });
    setFormErrors({});
    setDialog({ mode: "form" });
    setActionsFor("");
  };

  const validate = () => {
    const errors = {};
    if (!draft.title.trim()) errors.title = "Enter an offer title.";
    if (!draft.description.trim()) errors.description = "Enter a description.";
    if (!draft.product) errors.product = "Select one of your available products.";
    const value = Number(draft.discountValue);
    if (!Number.isFinite(value) || value <= 0) errors.discountValue = "Enter a discount greater than zero.";
    if (draft.discountType === "Percentage" && value > 100) errors.discountValue = "Percentage cannot exceed 100.";
    if (draft.discountType === "Fixed Amount" && selectedProduct && value >= Number(selectedProduct.price)) errors.discountValue = "Discount must be lower than the product price.";
    if (!draft.startDate || !draft.endDate || new Date(draft.endDate) <= new Date(draft.startDate)) errors.endDate = "End date must be after start date.";
    if (!draft.startTime || !draft.endTime) errors.startTime = "Start time and end time are required.";
    else if (new Date(`${draft.startDate}T${draft.startTime}`) >= new Date(`${draft.endDate}T${draft.endTime}`)) errors.endTime = "End datetime must be after start datetime.";
    const quantity = Number(draft.minimumQuantity);
    if (!Number.isInteger(quantity) || quantity < 1 || (selectedProduct && quantity > Number(selectedProduct.stock))) errors.minimumQuantity = "Enter a valid quantity within available stock.";
    if (draft.type === "Bundle Offer" && quantity < 2) errors.minimumQuantity = "A bundle must require at least two units.";
    if (!Number.isFinite(Number(draft.minimumAmount)) || Number(draft.minimumAmount) < 0) errors.minimumAmount = "Minimum amount cannot be negative.";
    if (draft.maximumDiscount !== "" && (!Number.isFinite(Number(draft.maximumDiscount)) || Number(draft.maximumDiscount) < 0)) errors.maximumDiscount = "Maximum discount cannot be negative.";
    if (draft.type === "Bundle Offer" && !draft.bundleConditions.trim()) errors.bundleConditions = "Describe the selected-product quantity condition.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveOffer = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...draft,
        discountValue: Number(draft.discountValue),
        minimumQuantity: Number(draft.minimumQuantity),
        minimumAmount: Number(draft.minimumAmount),
        maximumDiscount: draft.maximumDiscount === "" ? null : Number(draft.maximumDiscount),
        startTime: draft.startTime,
        endTime: draft.endTime,
      };
      if (editing) await farmerOffersApi.update(editing._id, payload);
      else await farmerOffersApi.create(payload);
      setDialog(null);
      toast.success(editing ? "Offer submitted for approval." : "Offer submitted for approval.");
      await loadOffers();
    } catch (requestError) {
      setError(requestError?.message || "Couldn't save this offer.");
      toast.error(requestError?.message || "Couldn't save this offer.");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (offer) => {
    setActionsFor("");
    if (!window.confirm(`Deactivate "${offer.title}"? It will no longer be applied to new orders.`)) return;
    try {
      await farmerOffersApi.deactivate(offer._id);
      toast.success("Offer deactivated.");
      await loadOffers();
    } catch (requestError) {
      toast.error(requestError?.message || "Couldn't deactivate this offer.");
    }
  };

  const statCards = [
    { label: "Total Offers", value: stats.totalOffers, icon: Tag, color: "bg-emerald-50 text-emerald-700" },
    { label: "Active Offers", value: stats.activeOffers, icon: CheckCircle2, color: "bg-green-50 text-green-700" },
    { label: "Pending Approval", value: stats.pendingApproval, icon: Clock3, color: "bg-amber-50 text-amber-700" },
    { label: "Total Sales", value: stats.salesTrackingAvailable ? formatCurrency(stats.totalSales) : "N/A", icon: ShoppingBag, color: "bg-teal-50 text-teal-700" },
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-xs text-[#20312E]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">My Offers</h1>
          <p className="mt-1 text-xs text-[#71817D]">Manage your offers and track performance.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white hover:bg-[#066B42] focus:outline-none focus:ring-2 focus:ring-[#07814E]/30">
          <Plus size={14} /> Create Offer
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="flex min-h-[88px] items-center gap-3 rounded-xl border border-[#E7EEEC] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${color}`}><Icon size={20} /></span>
            <div className="min-w-0"><p className="text-[10px] text-[#71817D]">{label}</p><p className="mt-1 truncate text-base font-bold leading-5 text-[#233B33]">{value}</p></div>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#EDF1F0] p-4">
          <label className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#91A09B]" />
            <input aria-label="Search offers" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search offer or product" className="h-9 w-full rounded-md border border-[#DDE6E2] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#179361]" />
          </label>
          <select aria-label="Filter by offer type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} className="h-9 min-w-[150px] rounded-md border border-[#DDE6E2] bg-white px-3 text-xs text-[#41514D]">
            <option value="">All Types</option>{OFFER_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select aria-label="Filter by offer status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-9 min-w-[140px] rounded-md border border-[#DDE6E2] bg-white px-3 text-xs text-[#41514D]">
            <option value="">All Status</option>{["Pending", "Active", "Rejected", "Expired", "Inactive", "Scheduled"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        {error && <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">{error} <button type="button" onClick={loadOffers} className="font-semibold underline">Try again</button></div>}

        {loading ? <div className="p-12 text-center text-xs text-[#778681]">Loading your offers…</div> : offers.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="mx-auto h-9 w-9 text-[#9BAAA4]" />
            <p className="mt-3 text-xs font-semibold text-[#40544D]">{search || typeFilter || statusFilter ? "No offers match these filters." : "You haven't created any offers yet."}</p>
            {!search && !typeFilter && !statusFilter && <button type="button" onClick={openCreate} className="mt-3 text-xs font-semibold text-[#07814E] hover:underline">Create your first offer</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-[#E9EFED] bg-[#F7F9F8] text-[10px] font-semibold uppercase tracking-wide text-[#71817D]">
                <tr><th className="px-4 py-3">Offer</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Validity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Performance</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F0]">
                {offers.map((offer) => {
                  const product = offer.product && typeof offer.product === "object" ? offer.product : {};
                  const status = offer.effectiveStatus || offer.status;
                  return (
                    <tr key={offer._id} className="h-[68px] hover:bg-[#FBFCFC]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ImageWithFallback src={getImageUrl(product.images?.[0])} alt="" className="h-11 w-11 shrink-0 rounded-md border border-[#E9EFEC] object-cover" />
                          <div className="min-w-0"><p className="max-w-[240px] truncate text-xs font-semibold text-[#293D36]" title={offer.title}>{offer.title}</p><p className="max-w-[240px] truncate text-[10px] text-[#81908A]">{product.name || "Product unavailable"}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-full bg-[#EDF6F1] px-2.5 py-1.5 text-[10px] font-medium text-[#297453]">{offer.type}</span></td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#32473F]">{offer.discountType === "Percentage" ? `${offer.discountValue}% OFF` : `${formatCurrency(offer.discountValue)} OFF`}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[10px] text-[#687972]">
                        {formatDate(offer.startDate, { day: "numeric", month: "short" })} – {formatDate(offer.endDate, { day: "numeric", month: "short" })}
                        {offer.startAt && offer.effectiveStatus === "Upcoming" && <OfferCountdown key={offer._id} startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} className="mt-1" />}
                        {offer.endAt && offer.effectiveStatus === "Active" && <OfferCountdown key={offer._id} startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} className="mt-1" />}
                      </td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${statusStyle(status)}`}>{status}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap text-[10px] text-[#65756F]">{offer.unitsSold || 0} units</td>
                      <td className="relative px-4 py-3 text-right">
                        <button type="button" aria-label={`Actions for ${offer.title}`} aria-expanded={actionsFor === offer._id} onClick={() => setActionsFor((current) => current === offer._id ? "" : offer._id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#DDE6E2] text-[#54665F] hover:bg-[#F4F8F5]"><MoreHorizontal size={18} /></button>
                        {actionsFor === offer._id && <div className="absolute right-4 top-12 z-20 min-w-36 rounded-md border border-[#E1E9E5] bg-white p-1 text-left shadow-lg">
                          <button type="button" onClick={() => { setDialog({ mode: "view", offer }); setActionsFor(""); }} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs hover:bg-[#F4F8F5]"><Eye size={14} /> View details</button>
                          {status !== "Inactive" && <button type="button" onClick={() => openEdit(offer)} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs hover:bg-[#F4F8F5]"><BadgePercent size={14} /> Edit</button>}
                          {offer.isActive && status !== "Rejected" && <button type="button" onClick={() => deactivate(offer)} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-red-700 hover:bg-red-50"><X size={14} /> Deactivate</button>}
                        </div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pages > 1 && <div className="border-t border-[#EDF1F0] p-3"><Pagination page={page} pages={pages} onChange={setPage} /></div>}
      </section>

      <Modal open={dialog?.mode === "form"} onClose={() => !saving && setDialog(null)} title={editing ? "Edit Offer" : "Create Offer"}>
        <form onSubmit={saveOffer} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-[#52645D] sm:col-span-2">Offer Title
              <input aria-label="Offer title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={inputClass(Boolean(formErrors.title))} maxLength={100} />
              {formErrors.title && <span className="mt-1 block text-[10px] text-red-600">{formErrors.title}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D] sm:col-span-2">Description
              <textarea aria-label="Offer description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1 min-h-16 w-full rounded-md border border-[#DDE6E2] p-2 text-xs outline-none focus:border-[#14905B]" maxLength={1000} />
              {formErrors.description && <span className="mt-1 block text-[10px] text-red-600">{formErrors.description}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">Offer Type
              <select aria-label="Offer type" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} className={inputClass()}>{OFFER_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">Product
              <select
                ref={productSelectRef}
                aria-label="Offer product"
                value={draft.product}
                disabled={productsLoading || Boolean(productsError) || products.length === 0}
                onChange={(event) => setDraft((current) => ({ ...current, product: event.target.value }))}
                className={inputClass(Boolean(formErrors.product))}
              >
                <option value="">
                  {productsLoading ? "Loading eligible products…" : productsError ? "Products could not be loaded" : products.length ? "Select product" : "No eligible products available"}
                </option>
                {products.map((product) => (
                  <option key={product._id} value={String(product._id)}>
                    {product.name} · {formatCurrency(product.price)} · {product.stock} in stock
                  </option>
                ))}
              </select>
              {formErrors.product && <span className="mt-1 block text-[10px] text-red-600">{formErrors.product}</span>}
              {productsError && (
                <span role="alert" className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] text-red-600">
                  {productsError}
                  <button type="button" onClick={loadProducts} className="font-semibold underline">Retry</button>
                </span>
              )}
              {!productsLoading && !productsError && products.length === 0 && (
                <span role="status" className="mt-1 block text-[10px] text-[#71817D]">Add an approved product with a valid price and available stock before creating an offer.</span>
              )}
            </label>
            {selectedProduct && <div aria-label="Selected product preview" className="flex min-w-0 items-center gap-3 rounded-lg border border-[#DDEBE1] bg-[#F5F9F6] p-3 sm:col-span-2">
              <ImageWithFallback
                src={getImageUrl(selectedProduct.images?.[0])}
                alt={selectedProduct.name}
                className="h-14 w-14 shrink-0 rounded-md border border-[#E1EAE4] bg-white object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#344A41]">{selectedProduct.name}</p>
                <p className="mt-1 text-[10px] text-[#71817D]">
                  {formatCurrency(selectedProduct.price)} / {selectedProduct.unit || "unit"} · {selectedProduct.stock} in stock
                </p>
              </div>
              <button
                type="button"
                onClick={() => productSelectRef.current?.focus()}
                className="shrink-0 rounded-md border border-[#CFE0D4] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#176B3B] hover:bg-[#EAF6ED]"
              >
                Change Product
              </button>
            </div>}
            <label className="text-[11px] font-medium text-[#52645D]">Discount Type
              <select aria-label="Discount type" value={draft.discountType} onChange={(event) => setDraft({ ...draft, discountType: event.target.value })} className={inputClass()}>{DISCOUNT_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">Discount Value
              <input aria-label="Discount value" type="number" min="0.01" step="0.01" value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: event.target.value })} className={inputClass(Boolean(formErrors.discountValue))} />
              {formErrors.discountValue && <span className="mt-1 block text-[10px] text-red-600">{formErrors.discountValue}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">Start Date
              <input aria-label="Offer start date" type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className={inputClass()} />
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">End Date
              <input aria-label="Offer end date" type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className={inputClass(Boolean(formErrors.endDate))} />
              {formErrors.endDate && <span className="mt-1 block text-[10px] text-red-600">{formErrors.endDate}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">Start Time
              <input aria-label="Offer start time" type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} className={inputClass(Boolean(formErrors.startTime))} />
              {formErrors.startTime && <span className="mt-1 block text-[10px] text-red-600">{formErrors.startTime}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">End Time
              <input aria-label="Offer end time" type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} className={inputClass(Boolean(formErrors.endTime))} />
              {formErrors.endTime && <span className="mt-1 block text-[10px] text-red-600">{formErrors.endTime}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">Minimum Quantity
              <input aria-label="Minimum quantity" type="number" min="1" step="1" value={draft.minimumQuantity} onChange={(event) => setDraft({ ...draft, minimumQuantity: event.target.value })} className={inputClass(Boolean(formErrors.minimumQuantity))} />
              {formErrors.minimumQuantity && <span className="mt-1 block text-[10px] text-red-600">{formErrors.minimumQuantity}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D]">Minimum Order Amount
              <input aria-label="Minimum order amount" type="number" min="0" step="0.01" value={draft.minimumAmount} onChange={(event) => setDraft({ ...draft, minimumAmount: event.target.value })} className={inputClass(Boolean(formErrors.minimumAmount))} />
              <span className="mt-1 block text-[9px] font-normal text-[#82908B]">Based on the original cart subtotal before offer discounts.</span>
              {formErrors.minimumAmount && <span className="mt-1 block text-[10px] text-red-600">{formErrors.minimumAmount}</span>}
            </label>
            <label className="text-[11px] font-medium text-[#52645D] sm:col-span-2">Maximum Discount (optional)
              <input aria-label="Maximum discount" type="number" min="0" step="0.01" value={draft.maximumDiscount} onChange={(event) => setDraft({ ...draft, maximumDiscount: event.target.value })} className={inputClass(Boolean(formErrors.maximumDiscount))} />
              {formErrors.maximumDiscount && <span className="mt-1 block text-[10px] text-red-600">{formErrors.maximumDiscount}</span>}
            </label>
            {draft.type === "Bundle Offer" && <label className="text-[11px] font-medium text-[#52645D] sm:col-span-2">Bundle Conditions
              <textarea aria-label="Bundle conditions" value={draft.bundleConditions} onChange={(event) => setDraft({ ...draft, bundleConditions: event.target.value })} placeholder="Example: Buy at least 2 units of this product to receive the discount." className="mt-1 min-h-14 w-full rounded-md border border-[#DDE6E2] p-2 text-xs outline-none focus:border-[#14905B]" maxLength={500} />
              {formErrors.bundleConditions && <span className="mt-1 block text-[10px] text-red-600">{formErrors.bundleConditions}</span>}
            </label>}
          </div>
          <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-800">New and edited offers require admin approval before they can be used at checkout.</p>
          <div className="flex justify-end gap-2 border-t border-[#EDF1F0] pt-3">
            <button type="button" onClick={() => setDialog(null)} disabled={saving} className="h-8 rounded-md border border-[#DDE6E2] px-3 text-xs text-[#52645D]">Cancel</button>
            <button type="submit" disabled={saving || productsLoading || Boolean(productsError) || products.length === 0} className="h-8 rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Submitting…" : editing ? "Save & Resubmit" : "Submit for Approval"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog?.mode === "view"} onClose={() => setDialog(null)} title="Offer Details">
        {dialog?.offer && (() => {
          const offer = dialog.offer;
          const product = offer.product && typeof offer.product === "object" ? offer.product : {};
          const eligibleQuantity = Number(offer.minimumEligibleQuantity || offer.minimumQuantity || 1);
          const effectivePrice = offer.minimumEligiblePrice ?? Number(product.price || 0);
          return <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 rounded-lg bg-[#F4F8F5] p-3">
              <ImageWithFallback src={getImageUrl(product.images?.[0])} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div><p className="font-semibold text-[#263B34]">{offer.title}</p><p className="mt-1 text-[10px] text-[#71817D]">{product.name}</p><p className="mt-1 font-semibold text-[#07814E]">{formatCurrency(effectivePrice)} <span className="font-normal text-[#75847E]">per unit at minimum quantity {eligibleQuantity} · base {formatCurrency(product.price)}</span></p>{Number(offer.minimumAmount) > 0 && <p className="text-[10px] text-[#71817D]">Also requires cart subtotal of {formatCurrency(offer.minimumAmount)}.</p>}</div>
            </div>
            <p className="leading-5 text-[#52645D]">{offer.description}</p>
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Type" value={offer.type} /><Detail label="Discount" value={offer.discountType === "Percentage" ? `${offer.discountValue}%` : formatCurrency(offer.discountValue)} />
              <Detail label="Valid from" value={formatDate(offer.startDate)} /><Detail label="Valid until" value={formatDate(offer.endDate)} />
              <Detail label="Minimum quantity" value={offer.minimumQuantity} /><Detail label="Minimum cart subtotal" value={formatCurrency(offer.minimumAmount)} />
              <Detail label="Maximum discount" value={offer.maximumDiscount == null ? "No cap" : formatCurrency(offer.maximumDiscount)} /><Detail label="Units sold" value={offer.unitsSold ?? "N/A"} />
            </div>
            {offer.bundleConditions && <Detail label="Bundle conditions" value={offer.bundleConditions} />}
            {offer.rejectionReason && <p className="rounded-md bg-red-50 p-2 text-red-700"><b>Rejection reason:</b> {offer.rejectionReason}</p>}
            <Detail label="Status" value={offer.effectiveStatus || offer.status} />
          </div>;
        })()}
      </Modal>
    </section>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-md border border-[#E8EEEB] px-2.5 py-2"><p className="text-[9px] uppercase tracking-wide text-[#82908B]">{label}</p><p className="mt-0.5 break-words text-[11px] font-medium text-[#394E46]">{value ?? "—"}</p></div>;
}
