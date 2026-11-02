import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight, CalendarDays, ChevronDown, Heart, Leaf, Search, ShoppingCart,
} from "lucide-react";
import ErrorState from "../../components/common/ErrorState.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import productApi from "../../api/productApi.js";
import categoryApi from "../../api/categoryApi.js";
import { addItem } from "../../features/cart/cartSlice.js";
import { fetchWishlist, toggleWishlist } from "../../features/wishlist/wishlistSlice.js";
import { formatCurrency, formatDate } from "../farmer/farmerUtils.js";
import getImageUrl from "../../utils/imageUrl.js";

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
  "Limited-Time Deal": "bg-[#F08A18] text-white",
  "Bundle Offer": "bg-[#6754CF] text-white",
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
  const [offers, setOffers] = useState([]);
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
  const [onlyActive, setOnlyActive] = useState(true);
  const [addingId, setAddingId] = useState("");
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
    productApi.storefrontOffers()
      .then(({ data }) => {
        if (active) setOffers(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((requestError) => {
        if (active) {
          setOffers([]);
          setError(requestError?.message || "Couldn't load current farmer offers.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (user?.role === "customer" && token && token !== "demo-token" && !wishlist.loaded && !wishlist.loading) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, token, user?.role, wishlist.loaded, wishlist.loading]);

  const eligibleOffers = useMemo(
    () => offers.filter((offer) => ["Active", "Scheduled"].includes(offer.effectiveStatus)),
    [offers]
  );

  const availableCategories = useMemo(
    () => categories.length
      ? categories
      : [...new Set(eligibleOffers.map((offer) => offer.product?.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [categories, eligibleOffers]
  );

  const visibleOffers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = eligibleOffers.filter((offer) => {
      const product = offer.product || {};
      const farmerName = offer.farmer?.name || product.farmer?.name || "";
      const searchable = `${offer.title || ""} ${offer.description || ""} ${product.name || ""} ${farmerName}`.toLocaleLowerCase();
      return (!type || offer.type === type)
        && (!category || product.category === category)
        && (!query || searchable.includes(query))
        && (!onlyActive || offer.effectiveStatus === "Active");
    });

    return filtered.sort((left, right) => {
      if (sort === "price_asc") return Number(left.offerPrice) - Number(right.offerPrice);
      if (sort === "price_desc") return Number(right.offerPrice) - Number(left.offerPrice);
      if (sort === "discount_desc") return Number(right.discountPercent) - Number(left.discountPercent);
      return new Date(right.createdAt || right.startDate) - new Date(left.createdAt || left.startDate);
    });
  }, [eligibleOffers, type, category, search, onlyActive, sort]);

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
      <section className="relative isolate min-h-[178px] overflow-hidden rounded-xl bg-[#EAF5D5] sm:min-h-[198px] lg:min-h-[210px]">
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
      </section>

      <section aria-label="Offer filters" className="flex flex-col gap-2.5 rounded-xl border border-[#E6ECE4] bg-white/80 p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5">
          {OFFER_TYPES.map((offerType) => (
            <button
              key={offerType.value || "all"}
              type="button"
              aria-pressed={type === offerType.value}
              onClick={() => setType(offerType.value)}
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
      </section>

      <section
        id="offers-section"
        ref={offersRef}
        tabIndex={-1}
        aria-label="Available farmer offers"
        className="scroll-mt-20 outline-none"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#1E3326] sm:text-base">Offers from Local Farmers</h2>
            <p className="mt-0.5 text-[10px] text-[#718078] sm:text-[11px]">
              {loading ? "Finding fresh deals…" : `${visibleOffers.length} ${visibleOffers.length === 1 ? "offer" : "offers"} available`}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
            <label className="relative min-w-[145px] flex-1 sm:w-[185px] sm:flex-none">
              <span className="sr-only">Search offers</span>
              <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#91A09B]" />
              <input
                type="search"
                aria-label="Search offers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search farmer or product"
                className="h-8 w-full rounded-full border border-[#E0E7E1] bg-white pl-8 pr-2.5 text-[10px] outline-none focus:border-[#16803C] sm:text-[11px]"
              />
            </label>
            <label className="relative min-w-[140px] flex-1 sm:w-[165px] sm:flex-none">
              <span className="sr-only">Filter product category</span>
              <select
                aria-label="Filter product category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
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
                onChange={(event) => setSort(event.target.value)}
                className="h-8 w-full appearance-none rounded-full border border-[#E0E7E1] bg-white px-3 pr-7 text-[10px] text-[#526258] outline-none focus:border-[#16803C] sm:text-[11px]"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="discount_desc">Highest Discount</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#738078]" />
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={onlyActive}
              onClick={() => setOnlyActive((value) => !value)}
              className="inline-flex h-10 shrink-0 items-center justify-between gap-2 rounded-full bg-[#EAF6ED] px-3 text-[11px] font-semibold text-[#355840] sm:h-8"
            >
              Only Active
              <span className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${onlyActive ? "bg-[#16803C]" : "bg-[#AAB6AD]"}`}>
                <span className={`absolute left-0 top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform ${onlyActive ? "translate-x-[16px]" : "translate-x-[2px]"}`} />
              </span>
            </button>
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
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleOffers.map((offer) => (
              <OfferCard
                key={offer._id}
                offer={offer}
                wished={isWished(wishlist, getId(offer.product))}
                adding={addingId === String(offer._id)}
                onAdd={() => addOfferToCart(offer)}
                onWishlist={() => toggleProductWishlist(offer)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#E6ECE4] bg-white px-5 py-10 text-center">
            <Leaf aria-hidden="true" className="mx-auto h-8 w-8 text-[#8BAF83]" />
            <p className="mt-2 text-sm font-semibold text-[#40544D]">{offers.length ? "No offers match your filters." : "No farmer offers are available right now."}</p>
            <p className="mt-1 text-xs text-[#778681]">{eligibleOffers.length ? "Try another search or offer type." : "Check back soon for fresh deals from local farmers."}</p>
          </div>
        )}
      </section>
    </main>
  );
}

function OfferCard({ offer, wished, adding, onAdd, onWishlist }) {
  const product = offer.product || {};
  const farmerName = offer.farmer?.name || product.farmer?.name || "Local Farmer";
  const offerType = offer.type || "Farmer Offer";
  const active = offer.effectiveStatus === "Active";
  const minimumQuantity = Math.max(1, Number(offer.minimumQuantity) || 1);
  const stock = Number(product.stock) || 0;
  const outOfStock = stock < minimumQuantity;
  const price = Number(offer.offerPrice);
  const originalPrice = Number(offer.originalPrice ?? product.price);
  const discountLabel = offer.discountType === "Percentage"
    ? `${offer.discountPercent}% OFF`
    : `${formatCurrency(offer.discountAmount)} OFF`;
  const cartDisabled = outOfStock || !active || adding;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[#E5EBE5] bg-white p-1.5 shadow-[0_1px_5px_rgba(27,52,36,0.07)] transition hover:shadow-[0_7px_18px_rgba(27,52,36,0.12)]">
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
        {!active && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#34483A]/90 px-2 py-1 text-[9px] font-semibold text-white">Coming Soon</span>}
      </div>

      <div className="flex flex-1 flex-col px-1 pt-1.5">
        <Link to={`/product/${getId(product)}`} className="line-clamp-1 text-[12px] font-bold leading-4 text-[#202D24] hover:text-[#16803C] sm:text-[13px]" title={product.name}>
          {product.name || "Product"}
        </Link>
        <p className="mt-0.5 truncate text-[9px] leading-3 text-[#7B877D] sm:text-[10px]">{farmerName}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-bold leading-4 text-[#16803C] sm:text-sm">{formatCurrency(price)}</span>
          <span className="text-[9px] text-[#939B94] line-through">{formatCurrency(originalPrice)}</span>
          <span className="rounded-full bg-[#E6F7E9] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#13803D] sm:text-[9px]">{discountLabel}</span>
        </div>
        <p className="mt-0.5 text-[8px] text-[#879187]">per {product.unit || "unit"}{minimumQuantity > 1 ? ` · min ${minimumQuantity}` : ""}</p>

        {Number(offer.minimumAmount) > 0 && (
          <p className="mt-1 truncate text-[8px] font-medium text-[#738078]">Cart minimum {formatCurrency(offer.minimumAmount)}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-[#EEF1ED] pt-1.5 text-[8px] text-[#67756A] sm:text-[9px]">
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><CalendarDays aria-hidden="true" className="h-3 w-3" />Till {formatDate(offer.endDate, { day: "2-digit", month: "short", year: "numeric" })}</span>
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE6DE] text-[#55705B] hover:bg-[#F3F8F3]"
          >
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
