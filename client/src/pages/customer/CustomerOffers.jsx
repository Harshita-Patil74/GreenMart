import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight, CalendarDays, ChevronDown, Heart, Leaf, Search, ShoppingCart,
} from "lucide-react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import offerApi from "../../api/offerApi.js";
import categoryApi from "../../api/categoryApi.js";
import { addItem } from "../../features/cart/cartSlice.js";
import { fetchWishlist, toggleWishlist } from "../../features/wishlist/wishlistSlice.js";
import OfferCountdown from "../../components/offers/OfferCountdown.jsx";
import { formatCurrency, formatDate } from "../farmer/farmerUtils.js";
import getImageUrl from "../../utils/imageUrl.js";
import Pagination from "../../components/common/Pagination.jsx";

const HERO_IMAGE = "/images/banners/hero-basket.jpg";
const OFFER_TYPES = [
  { value: "", label: "All Offers" },
  { value: "Seasonal Offer", label: "Seasonal Produce" },
  { value: "Farmer Special", label: "Farmer Special" },
  { value: "Limited-Time Deal", label: "Limited-Time Deal" },
  { value: "Bundle Offer", label: "Bundle Offer" },
];

const offerBadgeClasses = {
  "Seasonal Offer": "bg-[#16803C] text-white",
  "Farmer Special": "bg-[#16803C] text-white",
  "Limited-Time Deal": "bg-[#16803C] text-white",
  "Bundle Offer": "bg-[#16803C] text-white",
};

function getId(value) {
  if (!value) return "";
  return String(typeof value === "object" ? value._id || value.id || "" : value);
}

function isWished(wishlist, productId) {
  return wishlist.items.some((item) => getId(item) === productId || getId(item.product) === productId);
}

export default function CustomerOffers() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const wishlist = useSelector((state) => state.wishlist);
  const [activeOffers, setActiveOffers] = useState([]);
  const [upcomingOffers, setUpcomingOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [tab, setTab] = useState("active");
  const [onlyActive, setOnlyActive] = useState(false);
  const [addingId, setAddingId] = useState("");
  const [serverTime, setServerTime] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalActive, setTotalActive] = useState(0);
  const [totalUpcoming, setTotalUpcoming] = useState(0);
  const offersRef = useRef(null);

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    setCategoriesError("");
    categoryApi.list()
      .then(({ data }) => {
        if (!active) return;
        const names = Array.isArray(data)
          ? data.map((item) => typeof item === "string" ? item : item?.name)
          : [];
        setCategories([...new Set(names.filter((name) => typeof name === "string" && name.trim()))]
          .sort((left, right) => left.localeCompare(right)));
      })
      .catch(() => {
        if (active) {
          setCategories([]);
          setCategoriesError("Categories couldn't be loaded. Showing categories from available offers.");
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    offerApi.list({ page, limit: pageSize })
      .then(({ data }) => {
        if (!active) return;
        const serverTime = data.serverTime;
        const activeList = Array.isArray(data?.active) ? data.active : [];
        const upcomingList = Array.isArray(data?.upcoming) ? data.upcoming : [];
        setActiveOffers(activeList);
        setUpcomingOffers(upcomingList);
        setTotalActive(Number(data?.pagination?.activeTotal) || activeList.length);
        setTotalUpcoming(Number(data?.pagination?.upcomingTotal) || upcomingList.length);
        setServerTime(serverTime);
      })
      .catch((requestError) => {
        if (active) {
          setActiveOffers([]);
          setUpcomingOffers([]);
          setError(requestError?.message || "Couldn't load offers.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, pageSize, retry]);

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token" && !wishlist.loaded && !wishlist.loading) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, token, user?.role, wishlist.loaded, wishlist.loading]);

  const currentOffers = tab === "active" ? activeOffers : upcomingOffers;
  const currentTotal = tab === "active" ? totalActive : totalUpcoming;

  const availableCategories = useMemo(
    () => categories.length
      ? categories
      : [...new Set(currentOffers.map((offer) => offer.product?.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [categories, currentOffers]
  );

  const visibleOffers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = currentOffers.filter((offer) => {
      const product = offer.product || {};
      const farmerName = offer.farmer?.name || product.farmer?.name || "";
      const searchable = `${offer.title || ""} ${offer.description || ""} ${product.name || ""} ${farmerName}`.toLocaleLowerCase();
      return (!type || offer.type === type)
        && (!category || product.category === category)
        && (!query || searchable.includes(query))
        && (!onlyActive || offer.effectiveStatus === "Active")
        && offer.effectiveStatus !== "Pending"
        && offer.effectiveStatus !== "Rejected";
    });

    return filtered.sort((left, right) => {
      if (sort === "price_asc") return Number(left.offerPrice) - Number(right.offerPrice);
      if (sort === "price_desc") return Number(right.offerPrice) - Number(left.offerPrice);
      if (sort === "discount_desc") return Number(right.discountPercent) - Number(left.discountPercent);
      return new Date(right.createdAt || right.startDate) - new Date(left.createdAt || left.startDate);
    });
  }, [currentOffers, type, category, search, sort, tab, onlyActive]);

  const shopDeals = () => {
    offersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    offersRef.current?.focus({ preventScroll: true });
  };

  const addOfferToCart = async (offer) => {
    const product = offer.product;
    if (!product || Number(product.stock) < 1 || offer.effectiveStatus !== "Active" || addingId) return;
    setAddingId(String(offer._id));
    try {
      await dispatch(addItem(product)).unwrap();
      toast.success(`Added ${product.name} to your cart.`);
    } catch (requestError) {
      toast.error(requestError?.message || "Couldn't add this product to your cart.");
    } finally {
      setAddingId("");
    }
  };

  const toggleProductWishlist = async (offer) => {
    const product = offer.product;
    if (!user || user.role !== "customer") {
      toast.error("Sign in with a customer account to use your wishlist.");
      return;
    }
    if (!token || token === "demo-token") {
      toast.error("Sign in to save products to your wishlist.");
      return;
    }
    try {
      await dispatch(toggleWishlist(product)).unwrap();
    } catch (requestError) {
      toast.error(requestError?.message || "Couldn't update your wishlist.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-3 pb-10">
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="relative isolate min-h-[178px] overflow-hidden rounded-xl bg-[#EAF5D5] sm:min-h-[198px] lg:min-h-[210px]"
      >
        <ImageWithFallback
          src={HERO_IMAGE}
          alt="Fresh produce at a farmers market"
          className="absolute inset-y-0 right-0 h-full w-[62%] object-cover object-[58%_center] sm:w-[58%] lg:w-[56%]"
        />
        <div className="absolute inset-0 -z-0 bg-gradient-to-r from-[#EAF5D5] via-[#EAF5D5]/95 via-40% to-transparent" />
        <div className="absolute -left-3 top-2 -z-0 rotate-[-28deg] text-[#A7C75D]/50">
          <Leaf aria-hidden="true" className="h-10 w-10" />
        </div>
        <div className="absolute left-8 top-6 -z-0 rotate-[28deg] text-[#A7C75D]/35">
          <Leaf aria-hidden="true" className="h-6 w-6" />
        </div>
        <div className="relative z-10 flex min-h-[178px] items-center px-5 py-5 sm:min-h-[198px] sm:px-7 lg:min-h-[210px] lg:px-8">
          <div className="max-w-[52%] sm:max-w-[48%]">
            <h1 className="font-heading text-xl font-bold leading-tight text-[#14552F] sm:text-2xl lg:text-[27px]">
              Fresh Deals from Our Farmers
            </h1>
            <p className="mt-1 text-xs font-medium text-[#315D3E] sm:text-sm">Organic. Fresh. Affordable.</p>
            <button
              type="button"
              onClick={shopDeals}
              className="mt-3 inline-flex h-8 items-center gap-2 rounded-full bg-[#16803C] px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#116B32] focus:outline-none focus:ring-2 focus:ring-[#16803C]/40"
            >
              Shop Deals <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.section>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex gap-2 border-b border-[#E6ECE4] pb-2 mb-3"
      >
          <button
            type="button"
            onClick={() => { setTab("active"); setPage(1); }}
            className={`px-4 py-2 rounded-md text-[11px] font-semibold transition ${tab === "active" ? "bg-[#16803C] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            Active Offers ({totalActive})
          </button>
          <button
            type="button"
            onClick={() => { setTab("upcoming"); setPage(1); }}
            className={`px-4 py-2 rounded-md text-[11px] font-semibold transition ${tab === "upcoming" ? "bg-[#C2410C] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            Coming Soon ({totalUpcoming})
          </button>
      </motion.div>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        aria-label="Offer filters"
        className="flex flex-wrap gap-2.5 rounded-xl border border-[#E6ECE4] bg-white/80 p-2.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5">
          {OFFER_TYPES.map((offerType) => (
            <button
              key={offerType.value || "all"}
              type="button"
              aria-pressed={type === offerType.value}
              onClick={() => { setType(offerType.value); setPage(1); }}
              className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[10px] font-semibold transition sm:text-[11px] ${
                type === offerType.value
                  ? "border-[#CBE8D2] bg-[#E6F5E9] text-[#146B37]"
                  : "border-[#E2E8E2] bg-white text-[#526258] hover:border-[#B9D9C1]"
              }`}
            >
              {offerType.label}
              {offerType.value === type && <ChevronDown aria-hidden="true" className="h-3 w-3" />}
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
          <label className="relative min-w-[145px] flex-1 sm:w-[185px] sm:flex-none">
            <span className="sr-only">Search offers</span>
            <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#91A09B]" />
            <input
              type="search"
              aria-label="Search offers"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search farmer or product"
              className="h-8 w-full rounded-full border border-[#E0E7E1] bg-white pl-8 pr-2.5 text-[10px] outline-none focus:border-[#16803C] sm:text-[11px]"
            />
          </label>
          <label className="relative min-w-[140px] flex-1 sm:w-[165px] sm:flex-none">
            <span className="sr-only">Filter product category</span>
            <select
              aria-label="Filter product category"
              value={category}
              onChange={(event) => { setCategory(event.target.value); setPage(1); }}
              disabled={categoriesLoading}
              className="h-10 w-full appearance-none rounded-full border border-[#E0E7E1] bg-white px-3 pr-7 text-[11px] text-[#526258] outline-none focus:border-[#16803C] disabled:cursor-wait disabled:bg-gray-50 sm:h-8 sm:text-[11px]"
            >
              <option value="">All Categories</option>
              {categoriesLoading && <option value="" disabled>Loading categories…</option>}
              {availableCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#738078]" />
          </label>
          <label className="relative min-w-[120px] flex-1 sm:w-[150px] sm:flex-none">
            <span className="sr-only">Sort offers</span>
            <select
              aria-label="Sort offers"
              value={sort}
              onChange={(event) => { setSort(event.target.value); setPage(1); }}
              className="h-8 w-full appearance-none rounded-full border border-[#E0E7E1] bg-white px-3 pr-7 text-[10px] text-[#526258] outline-none focus:border-[#16803C] sm:text-[11px]"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount_desc">Highest Discount</option>
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#738078]" />
          </label>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        id="offers-section"
        ref={offersRef}
        tabIndex={-1}
        aria-label="Available farmer offers"
        className="scroll-mt-20 outline-none"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#1E3326] sm:text-base">{tab === "active" ? "Active Offers from Local Farmers" : "Upcoming Offers from Local Farmers"}</h2>
            <p className="mt-0.5 text-[10px] text-[#718078] sm:text-[11px]">
              {loading ? "Finding fresh deals…" : `${visibleOffers.length} ${visibleOffers.length === 1 ? "offer" : "offers"} available`}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
            {tab === "active" && (
              <button
                type="button"
                onClick={() => setOnlyActive((prev) => !prev)}
                role="switch"
                aria-checked={onlyActive}
                className={`inline-flex h-10 shrink-0 items-center justify-between gap-2 rounded-full transition ${onlyActive ? "bg-[#16803C] px-3 text-[11px] font-semibold text-white" : "bg-[#EAF6ED] px-3 text-[11px] font-semibold text-[#355840]"} sm:h-8`}
              >
                Only Active
                <span className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${onlyActive ? "bg-[#16803C]" : "bg-[#AAB6AD]"}`}>
                  <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform ${onlyActive ? "translate-x-[2px]" : ""}`} />
                </span>
              </button>
            )}
          </div>
        </div>
        {categoriesError && (
          <p role="status" className="mb-2 text-[10px] text-amber-700">{categoriesError}</p>
        )}

        {error ? (
          <div className="rounded-xl border border-[#E7EEEC] bg-white">
            <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} />
          </div>
        ) : loading ? (
          <div aria-label="Loading offers" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[245px] animate-pulse rounded-xl border border-[#E7EEEC] bg-white" />)}
          </div>
        ) : visibleOffers.length ? (
          <>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {visibleOffers.map((offer) => (
                <motion.div key={offer._id} variants={staggerItem} initial="hidden" animate="visible">
                  <OfferCard
                    key={offer._id}
                    offer={offer}
                    wished={isWished(wishlist, getId(offer.product))}
                    adding={addingId === String(offer._id)}
                    onAdd={() => addOfferToCart(offer)}
                    onWishlist={() => toggleProductWishlist(offer)}
                    serverTime={serverTime}
                  />
                </motion.div>
              ))}
            </motion.div>
            <Pagination page={page} pageSize={pageSize} totalRecords={currentTotal} onChange={(nextPage, nextSize) => { setPage(nextPage); if (nextSize) setPageSize(nextSize); }} />
          </>
        ) : (
          <div className="rounded-xl border border-[#E6ECE4] bg-white px-5 py-10 text-center">
            <Leaf aria-hidden="true" className="mx-auto h-8 w-8 text-[#8BAF83]" />
            <p className="mt-2 text-sm font-semibold text-[#40544D]">
              {tab === "active" ? "No active offers available right now." : "No upcoming offers at the moment."}
            </p>
            <p className="mt-1 text-xs text-[#778681]">{tab === "active" ? "Check back soon for fresh deals from local farmers." : "Check back later for new upcoming offers."}</p>
          </div>
        )}
      </motion.section>
    </main>
  );
}

function OfferCard({ offer, wished, adding, onAdd, onWishlist, serverTime }) {
  const product = offer.product || {};
  const farmerName = offer.farmer?.name || product.farmer?.name || "Local Farmer";
  const offerType = offer.type || "Farmer Offer";
  const active = offer.effectiveStatus === "Active";
  const minimumQuantity = Math.max(1, Number(offer.minimumQuantity) || 1);
  const stock = Number(product.stock) || 0;
  const outOfStock = stock < minimumQuantity;
  const isPremiumTeaser = Boolean(offer.premiumExclusiveTeaser);
  const originalPrice = Number(offer.originalPrice ?? product.price);
  const price = Number(isPremiumTeaser ? originalPrice : offer.offerPrice);
  const hasPremiumExtra = Number(offer.premiumDiscountAmount) > 0;
  const discountLabel = isPremiumTeaser
    ? "Premium Exclusive"
    : offer.discountType === "Percentage"
    ? `${hasPremiumExtra ? "Regular " : ""}${offer.discountPercent}% OFF`
    : `${hasPremiumExtra ? "Regular " : ""}${formatCurrency(offer.discountAmount)} OFF`;
  const cartDisabled = outOfStock || !active || adding;

  return (
    <article className="group flex min-w-0 min-h-full flex-col overflow-hidden rounded-[12px] border border-[#E5EBE5] bg-white p-1.5 shadow-[0_1px_5px_rgba(27,52,36,0.07)] transition hover:shadow-[0_7px_18px_rgba(27,52,36,0.12)]">
      <div className="relative h-[120px] overflow-hidden rounded-[9px] bg-[#F0F3EF] sm:h-[112px] lg:h-[116px]">
        <ImageWithFallback
          src={getImageUrl(product.images?.[0])}
          alt={product.name || "Fresh product"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-1 text-[9px] font-bold leading-none shadow-sm ${offerBadgeClasses[offerType] || "bg-[#16803C] text-white"}`}>
          {offerType}
        </span>
        <button
          type="button"
          onClick={onWishlist}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#647168] shadow-sm transition hover:text-[#D83B55]"
        >
          <Heart aria-hidden="true" className={`h-3.5 w-3.5 ${wished ? "fill-[#E4475F] text-[#E4475F]" : ""}`} />
        </button>
        {!active && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#C2410C]/90 px-2 py-1 text-[9px] font-semibold text-white">Coming Soon</span>}
      </div>

      <div className="flex flex-1 flex-col px-1 pt-1.5">
        <Link to={`/product/${getId(product)}`} className="line-clamp-1 text-[12px] font-bold leading-4 text-[#202D24] hover:text-[#16803C] sm:text-[13px]" title={product.name}>
          {product.name || "Product"}
        </Link>
        <p className="mt-0.5 truncate text-[9px] leading-3 text-[#7B877D] sm:text-[10px]">{farmerName}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-bold leading-4 text-[#16803C] sm:text-sm">{formatCurrency(price)}</span>
          {!isPremiumTeaser && <span className="text-[9px] text-[#939B94] line-through">{formatCurrency(originalPrice)} / {product.unit || "unit"}</span>}
          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-none ${isPremiumTeaser ? "bg-[#14532D] text-white" : "bg-[#E6F7E9] text-[#13803D]"}`}>{discountLabel}</span>
          {isPremiumTeaser && <p className="mt-1 text-[8px] leading-3 text-[#52645D]">
            {offer.regularDiscountType === "Percentage"
              ? `Offer discount: ${offer.regularDiscountPercent}%`
              : `Offer discount: ${formatCurrency(offer.regularDiscountAmount)} off`}
            {Number(offer.premiumDiscountAmount) > 0 && ` · Premium extra: ${formatCurrency(offer.premiumDiscountAmount)} / ${product.unit || "unit"}`}
          </p>}
        {!isPremiumTeaser && Number(offer.premiumDiscountAmount) > 0 && <p className="mt-1 break-words text-[8px] leading-3 text-[#52645D]">
            Premium members save extra: {formatCurrency(offer.premiumDiscountAmount)} / {product.unit || "unit"}
          </p>}
        <p className="mt-0.5 text-[8px] text-[#879187]">per {product.unit || "unit"}{minimumQuantity > 1 ? ` · min ${minimumQuantity}` : ""}</p>

        {Number(offer.minimumAmount) > 0 && <p className="mt-1 truncate text-[8px] font-medium text-[#738078]">Cart minimum {formatCurrency(offer.minimumAmount)}</p>}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-[#EEF1ED] pt-1.5 text-[8px] text-[#67756A] sm:text-[9px]">
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><CalendarDays aria-hidden="true" className="h-3 w-3" />Till {formatDate(offer.endDate, { day: "2-digit", month: "short", year: "numeric" })}</span>
          {offer.startAt && offer.effectiveStatus === "Upcoming" && <OfferCountdown startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} serverTime={serverTime} />}
          {offer.endAt && offer.effectiveStatus === "Active" && <OfferCountdown startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} serverTime={serverTime} />}
          <span className={outOfStock ? "font-semibold text-red-600" : "whitespace-nowrap"}>{outOfStock ? "Out of Stock" : `In Stock: ${stock}`}</span>
        </div>

        <div className="mt-auto grid grid-cols-[1fr_auto] gap-1.5 pt-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={cartDisabled}
            className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md bg-[#16803C] px-2 text-[10px] font-semibold text-white transition hover:bg-[#116B32] disabled:cursor-not-allowed disabled:bg-[#C9D1CA] disabled:text-[#68736A] sm:text-[11px]"
          >
            <ShoppingCart aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{outOfStock ? "Out of Stock" : adding ? "Adding…" : active ? "Add to Cart" : "Coming Soon"}</span>
          </button>
          <Link
            to={`/product/${getId(product)}`}
            aria-label={`View ${product.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE6De] text-[#55705B] hover:bg-[#F3F8F3]"
          >
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
