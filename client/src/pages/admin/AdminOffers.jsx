import React, { useEffect, useMemo, useState } from "react";
import {
  BadgePercent, Check, ChevronLeft, ChevronRight, Clock3, Eye, Plus, Search, ShieldCheck, X,
} from "lucide-react";
import toast from "react-hot-toast";
import adminOffersApi from "../../api/adminOffersApi.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import Modal from "../../components/common/Modal.jsx";
import OfferCountdown from "../../components/offers/OfferCountdown.jsx";
import { getImageUrl } from "../../utils/imageUrl.js";

const PAGE_SIZE = 10;
const INITIAL_FILTERS = { farmerId: "", productId: "", type: "", status: "", search: "" };
const OFFER_TYPES = ["Seasonal Offer", "Farmer Special", "Limited-Time Deal", "Bundle Offer"];
const DISCOUNT_TYPES = ["Percentage", "Fixed Amount"];
const OFFER_STATUSES = ["Pending", "Active", "Rejected", "Expired", "Inactive", "Scheduled"];
const EMPTY_DRAFT = {
  title: "", description: "", type: OFFER_TYPES[0], farmer: "", product: "",
  discountType: "Percentage", discountValue: "", startDate: "", endDate: "", startTime: "", endTime: "",
  minimumQuantity: "1", minimumAmount: "0", maximumDiscount: "", bundleConditions: "",
};
const actionSuccessMessages = {
  approve: "Offer approved.",
  reject: "Offer rejected.",
  deactivate: "Offer deactivated.",
};

const statusStyles = {
  Active: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Rejected: "bg-red-50 text-red-700",
  Expired: "bg-gray-100 text-gray-600",
  Inactive: "bg-slate-100 text-slate-600",
  Scheduled: "bg-blue-50 text-blue-700",
};

function formatCurrency(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN");
}

function formDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function offerDiscount(offer) {
  const discount = offer.discountType === "Percentage"
    ? `${offer.discountValue}%`
    : formatCurrency(offer.discountValue);
  return offer.discountAmount == null
    ? discount
    : `${discount} (${formatCurrency(offer.discountAmount)} / ${offer.product?.unit || "unit"})`;
}

function normalizeOfferStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "";
}

function inputClass(hasError = false) {
  return `mt-1 h-9 w-full rounded-md border bg-white px-2.5 text-xs text-[#263B34] outline-none focus:border-[#14905B] ${hasError ? "border-red-400" : "border-[#DDE6E2]"}`;
}

function OfferStatus({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[status] || statusStyles.Inactive}`}>
      {status || "Inactive"}
    </span>
  );
}

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [retry, setRetry] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [savingId, setSavingId] = useState("");

  const [formFarmers, setFormFarmers] = useState([]);
  const [formProducts, setFormProducts] = useState([]);
  const [formDialog, setFormDialog] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    let active = true;
    setOptionsLoading(true);
    setOptionsError("");
    adminOffersApi.options()
      .then(({ data }) => {
        if (!active) return;
        setFarmers(Array.isArray(data?.farmers) ? data.farmers : []);
        setProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch((requestError) => {
        if (active) setOptionsError(requestError?.message || "Couldn't load farmer and product filters.");
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    let active = true;
    adminOffersApi.farmers()
      .then(({ data }) => {
        if (!active) return;
        setFormFarmers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setFormFarmers([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = { page, limit: PAGE_SIZE };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    setLoading(true);
    setError("");
    adminOffersApi.list(params)
      .then(({ data }) => {
        if (!active) return;
        setOffers(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total) || 0);
        setPages(Math.max(1, Number(data?.pages) || 1));
      })
      .catch((requestError) => {
        if (active) {
          setOffers([]);
          setError(requestError?.message || "Couldn't load offers.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filters, page, refresh, retry]);

  const loadFormProducts = async (farmerId) => {
    if (!farmerId) {
      setFormProducts([]);
      setProductsLoading(false);
      return;
    }
    setProductsLoading(true);
    setProductsError("");
    adminOffersApi.eligibleProducts(farmerId)
      .then(({ data }) => {
        if (!farmerId || farmerId !== draft.farmer) return;
        setFormProducts(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (farmerId === draft.farmer) {
          setFormProducts([]);
          setProductsError(requestError?.message || "Couldn't load products.");
        }
      })
      .finally(() => {
        if (farmerId === draft.farmer) setProductsLoading(false);
      });
  };

  useEffect(() => {
    loadFormProducts(draft.farmer);
  }, [draft.farmer]);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters({ ...INITIAL_FILTERS });
    setFilters({ ...INITIAL_FILTERS });
    setPage(1);
  };

  const openDetails = async (offer) => {
    setDialog(null);
    setFormDialog(null);
    setSelectedOffer(offer);
    setDetailLoading(true);
    try {
      const { data } = await adminOffersApi.get(offer._id);
      setSelectedOffer(data);
    } catch (requestError) {
      setError(requestError?.message || "Couldn't load offer details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setDialog(null);
    setSelectedOffer(null);
    setDraft({ ...EMPTY_DRAFT, farmer: formFarmers[0] ? String(formFarmers[0]._id) : "", product: "" });
    setFormErrors({});
    setFormDialog({ mode: "create" });
  };

  const openEdit = (offer) => {
    setDialog(null);
    setSelectedOffer(null);
    setDraft({
      title: offer.title || "",
      description: offer.description || "",
      type: offer.type || OFFER_TYPES[0],
      farmer: offer.farmer?._id || offer.farmer || "",
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
    setFormDialog({ mode: "edit", offer });
  };

  const selectedProduct = useMemo(
    () => formProducts.find((product) => String(product._id) === String(draft.product)),
    [formProducts, draft.product]
  );

  const validate = () => {
    const errors = {};
    if (!draft.title.trim()) errors.title = "Enter an offer title.";
    if (!draft.description.trim()) errors.description = "Enter a description.";
    if (!draft.farmer) errors.farmer = "Select a registered farmer.";
    if (!draft.product) errors.product = "Select one of the farmer's available products.";
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
    setError("");
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        type: draft.type,
        farmer: draft.farmer,
        product: draft.product,
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue),
        startDate: draft.startDate,
        endDate: draft.endDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
        minimumQuantity: Number(draft.minimumQuantity),
        minimumAmount: Number(draft.minimumAmount),
        maximumDiscount: draft.maximumDiscount === "" ? null : Number(draft.maximumDiscount),
        bundleConditions: draft.bundleConditions.trim(),
      };
      if (formDialog.mode === "edit") await adminOffersApi.update(formDialog.offer._id, payload);
      else await adminOffersApi.create(payload);
      toast.success(formDialog.mode === "edit" ? "Offer updated and approved." : "Offer created and approved.");
      setFormDialog(null);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(requestError?.message || "Couldn't save this offer.");
      toast.error(requestError?.message || "Couldn't save this offer.");
    } finally {
      setSaving(false);
    }
  };

  const submitAction = async (event) => {
    event.preventDefault();
    const { action, offer } = dialog;
    const reason = rejectionReason.trim();
    if (action === "reject" && !reason) {
      setError("Enter a reason before rejecting this offer.");
      return;
    }
    setSavingId(offer._id);
    setError("");
    try {
      if (action === "approve") await adminOffersApi.approve(offer._id);
      if (action === "reject") await adminOffersApi.reject(offer._id, reason);
      if (action === "deactivate") await adminOffersApi.deactivate(offer._id);
      toast.success(actionSuccessMessages[action]);
      setDialog(null);
      setRejectionReason("");
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(requestError?.message || `Couldn't ${action} this offer.`);
    } finally {
      setSavingId("");
    }
  };

  const retryLoad = () => setRetry((value) => value + 1);

  if (error && !offers.length && !loading) {
    return <ErrorState message={error} onRetry={retryLoad} />;
  }

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">Offers Management</h1>
          <p className="mt-1 text-xs text-gray-500">Review, approve and manage all offers.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white hover:bg-[#066B42] focus:outline-none focus:ring-2 focus:ring-[#07814E]/30">
          <Plus size={14} /> Create Offer
        </button>
      </header>

      {(error || optionsError) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{error || optionsError}</span>
          <button type="button" onClick={retryLoad} className="font-semibold underline">Retry</button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
          <label>
            <span className="sr-only">Filter by farmer</span>
            <select
              aria-label="Filter by farmer"
              value={draftFilters.farmerId}
              onChange={(event) => setDraftFilters((current) => ({ ...current, farmerId: event.target.value }))}
              disabled={optionsLoading}
              className="h-9 min-w-[135px] rounded-lg border border-gray-200 bg-white px-3 text-xs disabled:bg-gray-50"
            >
              <option value="">All Farmers</option>
              {farmers.map((farmer) => <option key={farmer._id} value={farmer._id}>{farmer.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by product</span>
            <select
              aria-label="Filter by product"
              value={draftFilters.productId}
              onChange={(event) => setDraftFilters((current) => ({ ...current, productId: event.target.value }))}
              disabled={optionsLoading}
              className="h-9 min-w-[135px] rounded-lg border border-gray-200 bg-white px-3 text-xs disabled:bg-gray-50"
            >
              <option value="">All Products</option>
              {products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by offer type</span>
            <select
              aria-label="Filter by offer type"
              value={draftFilters.type}
              onChange={(event) => setDraftFilters((current) => ({ ...current, type: event.target.value }))}
              className="h-9 min-w-[135px] rounded-lg border border-gray-200 bg-white px-3 text-xs"
            >
              <option value="">All Types</option>
              {OFFER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              aria-label="Filter by status"
              value={draftFilters.status}
              onChange={(event) => {
                const status = event.target.value;
                setDraftFilters((current) => ({ ...current, status }));
                setFilters((current) => ({ ...current, status }));
                setPage(1);
              }}
              className="h-9 min-w-[125px] rounded-lg border border-gray-200 bg-white px-3 text-xs"
            >
              <option value="">All Status</option>
              {OFFER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="relative min-w-[180px] flex-1">
            <span className="sr-only">Search offers</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="Search offers"
              value={draftFilters.search}
              onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search offer, product, or farmer"
              className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs outline-none focus:border-emerald-600"
            />
          </label>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#08764B] px-4 text-xs font-semibold text-white hover:bg-[#065F3C]">
            <Search aria-hidden="true" className="h-3.5 w-3.5" /> Search
          </button>
          <button type="button" onClick={clearFilters} className="h-9 rounded-lg px-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800">
            Clear Filters
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3">Offer</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Farmer</th>
                <th className="px-3 py-3">Original Price</th>
                <th className="px-3 py-3">Discount</th>
                <th className="px-3 py-3">Final Price</th>
                <th className="px-3 py-3">Validity</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="9" className="p-10 text-center text-gray-500">Loading offers...</td></tr>
              ) : offers.map((offer) => {
                const status = normalizeOfferStatus(offer.effectiveStatus) || "Unknown";
                const approvalStatus = normalizeOfferStatus(offer.approvalStatus ?? offer.status);
                const needsReview = approvalStatus === "Pending";
                const canDeactivate = approvalStatus === "Active"
                  && (status === "Active" || status === "Scheduled");
                return (
                  <tr key={offer._id} className="align-middle hover:bg-gray-50/60">
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-[175px] items-center gap-2.5">
                        <ImageWithFallback
                          src={getImageUrl(offer.product?.images?.[0])}
                          alt={offer.product?.name ? `${offer.product.name} product` : ""}
                          className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 object-cover"
                        />
                        <span className="font-semibold text-gray-800">{offer.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{offer.product?.name || "Product unavailable"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{offer.farmer?.name || "Farmer unavailable"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">{formatCurrency(offer.originalPrice)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{offerDiscount(offer)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-800">{formatCurrency(offer.offerPrice)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[10px] text-gray-600">
                      {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
                      {offer.startAt && offer.effectiveStatus === "Upcoming" && <OfferCountdown key={offer._id} startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} className="mt-1" />}
                      {offer.endAt && offer.effectiveStatus === "Active" && <OfferCountdown key={offer._id} startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} className="mt-1" />}
                    </td>
                    <td className="px-3 py-2.5"><OfferStatus status={status} /></td>
                    <td className="min-w-[255px] whitespace-nowrap px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {needsReview && (
                          <>
                            <button
                              type="button"
                              disabled={savingId === offer._id}
                              onClick={() => { setError(""); setDialog({ action: "approve", offer }); }}
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check aria-hidden="true" className="h-3 w-3" /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={savingId === offer._id}
                              onClick={() => { setError(""); setRejectionReason(""); setDialog({ action: "reject", offer }); }}
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <X aria-hidden="true" className="h-3 w-3" /> Reject
                            </button>
                          </>
                        )}
                        {canDeactivate && (
                          <button
                            type="button"
                            disabled={savingId === offer._id}
                            onClick={() => { setError(""); setDialog({ action: "deactivate", offer }); }}
                            className="h-7 rounded-md border border-amber-200 px-2 text-[10px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(offer)}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 px-2 text-[10px] font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <BadgePercent aria-hidden="true" className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDetails(offer)}
                          aria-label={`View ${offer.title}`}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 px-2 text-[10px] font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Eye aria-hidden="true" className="h-3 w-3" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !offers.length && (
                <tr><td colSpan="9" className="p-10 text-center text-sm text-gray-500">No offers match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2.5 text-[10px] text-gray-500">
          <span>Showing {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} of {total} offers</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded p-1.5 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Page {page} of {pages}</span>
            <button type="button" aria-label="Next page" disabled={page >= pages || loading} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded p-1.5 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>

      <Modal open={Boolean(selectedOffer)} onClose={() => setSelectedOffer(null)} title="Offer Details">
        {selectedOffer && (
          <div className="space-y-4 text-sm">
            {detailLoading ? <p className="py-5 text-center text-xs text-gray-500">Loading offer details...</p> : (
              <>
                <div className="flex items-center gap-3">
                  <ImageWithFallback src={getImageUrl(selectedOffer.product?.images?.[0])} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedOffer.title}</h4>
                    <p className="mt-1 text-xs text-gray-500">{selectedOffer.type} · {selectedOffer.product?.name || "Product unavailable"}</p>
                  </div>
                </div>
                <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{selectedOffer.description || "No description provided."}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <Detail label="Farmer" value={selectedOffer.farmer?.name} />
                  <Detail label="Farmer email" value={selectedOffer.farmer?.email} />
                  <Detail label="Original price" value={formatCurrency(selectedOffer.originalPrice)} />
                  <Detail label="Discount" value={offerDiscount(selectedOffer)} />
                  <Detail label="Final price / unit" value={formatCurrency(selectedOffer.offerPrice)} />
                  <Detail label="Minimum quantity" value={selectedOffer.minimumQuantity} />
                  <Detail label="Minimum order amount" value={formatCurrency(selectedOffer.minimumAmount)} />
                  <Detail label="Maximum discount" value={selectedOffer.maximumDiscount == null ? "No limit" : formatCurrency(selectedOffer.maximumDiscount)} />
                  <Detail label="Start date" value={formatDate(selectedOffer.startDate)} />
                  <Detail label="End date" value={formatDate(selectedOffer.endDate)} />
                  <Detail label="Status" value={selectedOffer.effectiveStatus || selectedOffer.status} />
                  <Detail label="Created" value={formatDate(selectedOffer.createdAt)} />
                </dl>
                {selectedOffer.type === "Bundle Offer" && <Detail label="Bundle conditions" value={selectedOffer.bundleConditions} />}
                {selectedOffer.rejectionReason && <Detail label="Rejection reason" value={selectedOffer.rejectionReason} />}
                <button
                  type="button"
                  onClick={() => openEdit(selectedOffer)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 text-[10px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <BadgePercent aria-hidden="true" className="h-3 w-3" /> Edit Offer
                </button>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(dialog)}
        onClose={() => { if (!savingId) setDialog(null); }}
        title={dialog?.action === "approve" ? "Approve Offer" : dialog?.action === "reject" ? "Reject Offer" : "Deactivate Offer"}
      >
        {dialog && (
          <form onSubmit={submitAction} className="space-y-4">
            <div className="text-xs leading-relaxed text-gray-600">
              {dialog.action === "approve" && (
                <div>
                  Approve <strong>{dialog.offer.title}</strong>? Review the offer details below. The server will re-check farmer, product, stock, dates and discount eligibility.
                </div>
              )}
              {dialog.action === "reject" && <>Reject <strong>{dialog.offer.title}</strong>? The reason will be saved and sent to the farmer.</>}
              {dialog.action === "deactivate" && <>Deactivate <strong>{dialog.offer.title}</strong>? It will no longer be available to customers, and the farmer will be notified.</>}
            </div>
            {dialog.action === "approve" && (
              <dl className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                <Detail label="Product" value={dialog.offer.product?.name} />
                <Detail label="Farmer" value={dialog.offer.farmer?.name} />
                <Detail label="Discount" value={offerDiscount(dialog.offer)} />
                <Detail label="Validity" value={`${formatDate(dialog.offer.startDate)} – ${formatDate(dialog.offer.endDate)}`} />
              </dl>
            )}
            {dialog.action === "reject" && (
              <label className="block text-xs font-medium text-gray-700">
                Rejection reason
                <textarea
                  aria-label="Rejection reason"
                  required
                  maxLength={500}
                  rows={4}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-emerald-600"
                />
              </label>
            )}
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={Boolean(savingId)} onClick={() => setDialog(null)} className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={Boolean(savingId) || (dialog.action === "reject" && !rejectionReason.trim())} className="h-9 rounded-lg bg-[#08764B] px-4 text-xs font-semibold text-white disabled:opacity-50">
                {savingId ? "Saving..." : dialog.action === "approve" ? "Confirm Approval" : dialog.action === "reject" ? "Confirm Rejection" : "Confirm Deactivation"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(formDialog)}
        onClose={() => !saving && setFormDialog(null)}
        title={formDialog ? (formDialog.mode === "edit" ? "Edit Offer" : "Create Offer") : null}
      >
        {formDialog && (
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
              <label className="text-[11px] font-medium text-[#52645D]">Farmer
                <select
                  aria-label="Offer farmer"
                  value={draft.farmer}
                  onChange={(event) => setDraft((current) => ({ ...current, farmer: event.target.value, product: "" }))}
                  disabled={formFarmers.length === 0}
                  className={inputClass(Boolean(formErrors.farmer))}
                >
                  <option value="">Select farmer</option>
                  {formFarmers.map((farmer) => <option key={farmer._id} value={String(farmer._id)}>{farmer.name}</option>)}
                </select>
                {formErrors.farmer && <span className="mt-1 block text-[10px] text-red-600">{formErrors.farmer}</span>}
              </label>
              <label className="text-[11px] font-medium text-[#52645D]">Product
                <select
                  aria-label="Offer product"
                  value={draft.product}
                  disabled={productsLoading || !draft.farmer || formProducts.length === 0}
                  onChange={(event) => setDraft((current) => ({ ...current, product: event.target.value }))}
                  className={inputClass(Boolean(formErrors.product))}
                >
                  <option value="">
                    {!draft.farmer ? "Select a farmer first"
                      : productsLoading ? "Loading eligible products…"
                        : productsError ? "Products could not be loaded"
                          : formProducts.length ? "Select product" : "No eligible products available"}
                  </option>
                  {formProducts.map((product) => (
                    <option key={product._id} value={String(product._id)}>
                      {product.name} · {formatCurrency(product.price)} · {product.stock} in stock
                    </option>
                  ))}
                </select>
                {formErrors.product && <span className="mt-1 block text-[10px] text-red-600">{formErrors.product}</span>}
                {productsError && (
                  <span role="alert" className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] text-red-600">
                    {productsError}
                    <button type="button" onClick={() => loadFormProducts(draft.farmer)} className="font-semibold underline">Retry</button>
                  </span>
                )}
                {!productsLoading && !productsError && formProducts.length === 0 && draft.farmer && (
                  <span role="status" className="mt-1 block text-[10px] text-[#71817D]">This farmer has no eligible products available.</span>
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
                  onClick={() => setDraft((current) => ({ ...current, product: "" }))}
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
            <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-800">Admin-created and admin-edited offers are approved directly after backend validation and do not require a separate approval step.</p>
            <div className="flex justify-end gap-2 border-t border-[#EDF1F0] pt-3">
              <button type="button" onClick={() => setFormDialog(null)} disabled={saving} className="h-8 rounded-md border border-[#DDE6E2] px-3 text-xs text-[#52645D]">Cancel</button>
              <button type="submit" disabled={saving || productsLoading || !draft.farmer || formProducts.length === 0} className="h-8 rounded-md bg-[#07814E] px-3 text-xs font-semibold text-white disabled:opacity-60">
                {saving ? "Saving…" : formDialog.mode === "edit" ? "Save & Approve" : "Create & Approve"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-medium text-gray-700">{value || "—"}</dd>
    </div>
  );
}
