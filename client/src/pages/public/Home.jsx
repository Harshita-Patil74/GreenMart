import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Users, Truck, Recycle, ArrowRight, BadgePercent } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import productApi from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { unwrapList } from "../../data/demoCatalog.js";
import OfferCountdown from "../../components/offers/OfferCountdown.jsx";
import { formatCurrency, formatDate } from "../../pages/farmer/farmerUtils.js";
import getImageUrl from "../../utils/imageUrl.js";
import ContinuousMarquee from "../../components/common/ContinuousMarquee.jsx";
import { cardItemVariants, cardHover, imageHover, badgeHover } from "../../components/common/motionVariants.jsx";
import { slideUpVariants, staggerContainer, staggerItem, sectionReveal } from "../../animations/variants.js";
import categoryApi from "../../api/categoryApi";
import CategoryCarousel from "../../components/common/CategoryCarousel.jsx";
import { useSelector } from "react-redux";
import newsletterApi from "../../api/newsletterApi";

const HERO = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=80";

// Deduplicate items by stable _id, preserving first occurrence order
function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = item._id || item.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// Minimum unique items required for infinite triple-copy carousel.
// Below this threshold, duplicates would be visible immediately on wide screens.
const MIN_ITEMS_FOR_INFINITE = 5;

function HomeOfferCard({ offer, serverTime }) {
  const navigate = useNavigate();
  const product = offer.product || {};
  const farmerName = offer.farmer?.name || product.farmer?.name || "GreenMart Farmer";
  const unit = product.unit || "unit";
  const productId = product._id || product.id;
  const isExclusive = Boolean(offer.audience?.includes("premium"));
  const isExclusiveTeaser = Boolean(offer.premiumExclusiveTeaser);
  const upcoming = offer.effectiveStatus === "Scheduled";
  const hasPremiumExtra = Number(offer.premiumDiscountAmount) > 0;
  const isPremiumEligible = Boolean(offer.isPremiumEligible);
  const savingLabel = offer.discountType === "Percentage"
    ? `${offer.discountPercent}% OFF`
    : `Save ${formatCurrency(offer.discountAmount)}`;
  const regularSavingLabel = hasPremiumExtra
    ? offer.discountType === "Percentage"
      ? `Regular ${offer.discountPercent}% OFF`
      : `Regular save ${formatCurrency(offer.discountAmount)}`
    : savingLabel;
  const exclusiveSavingLabel = Number(offer.originalPrice) > 0 && Number(offer.offerPrice) < Number(offer.originalPrice)
    ? `${offer.discountPercent}% OFF`
    : `Save ${formatCurrency(offer.discountAmount ?? 0)}`;
  const teaserOfferLabel = offer.regularDiscountType === "Percentage"
    ? `Offer discount: ${offer.regularDiscountPercent}%`
    : `Offer discount: ${formatCurrency(offer.regularDiscountAmount)} off`;
  const requiredQuantity = Math.max(1, Number(offer.minimumQuantity) || 1);
  const reducedMotion = useReducedMotion();
  const animate = reducedMotion ? false : "visible";

  // Determine applicable price: Premium subscribers see premium price, others see public/original price
  const applicablePrice = isPremiumEligible && Number(offer.premiumOfferPrice) > 0
    ? Number(offer.premiumOfferPrice)
    : Number(offer.publicOfferPrice || offer.offerPrice || offer.originalPrice);
  const isLocked = isExclusive && !isPremiumEligible;
  const showPremiumLock = isExclusive && !isPremiumEligible && Number(offer.originalPrice) > 0;

  return (
    <motion.div
      initial="hidden"
      animate={animate}
      variants={cardItemVariants}
      whileHover={reducedMotion ? undefined : cardHover.hover}
      whileTap={reducedMotion ? undefined : cardHover.tap}
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border p-2.5 min-h-[300px] ${isExclusive ? "border-[#E4E9E3] bg-[#F7FAF7]" : "border-[#E5EBE5] bg-white"}`}
    >
      <motion.div
        initial="hidden"
        animate={animate}
        variants={cardItemVariants}
        whileHover={reducedMotion ? undefined : imageHover.hover}
        className="relative h-20 overflow-hidden rounded-[8px] bg-[#F0F3EF] mb-2"
      >
        <ImageWithFallback
          src={getImageUrl(product.images?.[0])}
          alt={product.name || "Offer product"}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-1 right-1 top-1 z-10 flex flex-col items-start gap-1">
          <motion.span
            whileHover={reducedMotion ? undefined : badgeHover.hover}
            whileTap={reducedMotion ? undefined : badgeHover.tap}
            className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-[#16803C] px-2 py-0.5 text-[9px] font-semibold leading-3 text-white"
          >
            <BadgePercent aria-hidden="true" className="h-2.5 w-2.5 shrink-0" /> {offer.type}
          </motion.span>
          {isExclusive && (
            <span className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-[#245C3A] px-2 py-0.5 text-[9px] font-semibold leading-3 text-white">
              Premium Exclusive
            </span>
          )}
          {upcoming && (
            <span className="rounded-full bg-[#C2410C] px-2 py-0.5 text-[9px] font-semibold text-white">
              Coming Soon
            </span>
          )}
        </div>
        {!upcoming && !isExclusive && (
          <span className="absolute right-1 top-1 rounded-full bg-[#16803C] px-2 py-0.5 text-[9px] font-semibold text-white">
            Active
          </span>
        )}
      </motion.div>
      <Link to={`/product/${productId}`} className="line-clamp-1 text-xs font-semibold text-[#22352B] hover:text-[#16803C] mb-1">
        {product.name}
      </Link>
      <p className="mt-0 truncate text-[9px] text-[#7A877F] mb-1.5">{offer.title}</p>
      <p className="mt-0 truncate text-[9px] text-[#7A877F] mb-1.5">{farmerName}</p>
      <div className="flex flex-wrap items-baseline gap-x-1.5 mb-1.5">
        {showPremiumLock ? (
          <>
            <span className="text-[9px] text-gray-400 line-through">{formatCurrency(offer.originalPrice)} / {unit}</span>
            <span className="rounded-full bg-[#7C3AED] px-1.5 py-0.5 text-[7px] font-bold leading-none text-white">Premium Exclusive</span>
            <span className="text-[9px] text-[#7C3AED] font-semibold">Locked</span>
          </>
        ) : isExclusiveTeaser ? (
          <>
            <span className="text-xs font-bold text-[#0F6A3A]">{formatCurrency(product.price ?? offer.originalPrice)} / {unit}</span>
            <span className="rounded-full bg-[#14532D] px-1.5 py-0.5 text-[7px] font-bold leading-none text-white">Premium members only</span>
            <p className="w-full text-[9px] leading-3 text-[#52645D]">
              {teaserOfferLabel}
              {Number(offer.premiumDiscountAmount) > 0 && ` · Premium extra: ${formatCurrency(offer.premiumDiscountAmount)} / ${unit}`}
            </p>
          </>
        ) : isExclusive && offer.publicPrice != null && offer.exclusivePrice != null && offer.publicPrice > offer.exclusivePrice ? (
          <>
            <span className="text-[9px] text-gray-400 line-through">{formatCurrency(offer.originalPrice)} / {unit}</span>
            <span className="text-xs font-bold text-[#0F6A3A]">{formatCurrency(applicablePrice)} / {unit}</span>
            <span className="rounded-full bg-[#14532D] px-1.5 py-0.5 text-[7px] font-bold leading-none text-white">Premium price</span>
            <span className="rounded-full bg-[#14532D] px-1.5 py-0.5 text-[7px] font-bold leading-none text-white">{exclusiveSavingLabel}</span>
          </>
        ) : (
          <>
            <span className="text-xs font-bold text-[#0F6A3A]">{formatCurrency(applicablePrice)}</span>
            <span className="text-[9px] text-gray-400 line-through">{formatCurrency(offer.originalPrice)} / {unit}</span>
            <span className="rounded-full bg-[#E6F7E9] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#13803D]">{regularSavingLabel}</span>
          </>
        )}
      </div>
      {isExclusive && !isExclusiveTeaser && offer.publicDiscountAmount != null && offer.exclusiveDiscountAmount != null && (
        <p className="mb-1.5 text-[9px] leading-3 text-[#52645D]">
          Offer discount: {offer.publicDiscountPercent}% off ({formatCurrency(offer.publicDiscountAmount)}) · Regular price: {formatCurrency(offer.publicPrice)} / {unit} · Premium extra: {formatCurrency(offer.exclusiveDiscountAmount)} / {unit}
        </p>
      )}
      {showPremiumLock && (
        <p className="mb-1.5 break-words text-[9px] leading-3 text-[#7C3AED]">
          Premium Exclusive offer · Subscribe to GreenMart Premium to unlock this price.
        </p>
      )}
      {!isExclusive && !isExclusiveTeaser && Number(offer.premiumDiscountAmount) > 0 && (
        <p className="mb-1.5 break-words text-[9px] leading-3 text-[#52645D]">
          Premium members save extra: {formatCurrency(offer.premiumDiscountAmount)} / {unit}
        </p>
      )}
      {!isExclusiveTeaser && (requiredQuantity > 1 || Number(offer.minimumAmount) > 0) && (
        <p className="mt-0 text-[9px] leading-3 text-[#71817D] mb-1.5">
          {requiredQuantity > 1 ? `At ${requiredQuantity}+ ${unit}` : "Minimum purchase"}
          {Number(offer.minimumAmount) > 0 ? ` · ₹${Number(offer.minimumAmount).toFixed(2)} minimum cart subtotal` : ""}
        </p>
      )}
      <OfferCountdown
        startAt={offer.startAt || offer.startDate}
        endAt={offer.endAt || offer.endDate}
        status={offer.effectiveStatus || (upcoming ? "Upcoming" : "Active")}
        serverTime={serverTime}
      />
      <Link to={`/product/${productId}`} className="inline-flex h-7 items-center justify-center rounded-md border border-[#DDE8DF] text-[10px] font-semibold text-[#176B3B] w-full mt-auto">
        View Product
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState("");
  const [serverTime, setServerTime] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    let active = true;
    setProductsLoading(true);
    setProductsError(null);

    const fetchAllProducts = async () => {
      let page = 1;
      const limit = 20;
      let allItems = [];
      let totalPages = Infinity;

      try {
        while (page <= totalPages) {
          const response = await productApi.storefront({ page, limit });
          const items = unwrapList(response.data, []);
          allItems = allItems.concat(items);
          totalPages = response.data?.pages || 1;
          page++;
        }
      } catch (err) {
        if (active) {
          setProductsError(err?.message || "Products couldn't be loaded.");
          setProducts([]);
          setProductsLoading(false);
        }
        return;
      }

      if (active) {
        setProducts(dedupeById(allItems));
        setProductsLoading(false);
      }
    };

    fetchAllProducts();
    return () => { active = false; };
  }, []);

  const loadSubscription = async () => {
    if (!user?.role === "customer") return;
    setSubscriptionLoading(true);
    try {
      const { data } = await newsletterApi.subscriptionMe();
      setSubscription(data);
    } catch (e) {
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "customer") loadSubscription();
  }, [user]);

  const offersActiveRef = useRef(true);

  const fetchOffers = () => {
    offersActiveRef.current = true;
    setOffersLoading(true);
    setOffersError("");
    productApi.storefrontOffers()
      .then(({ data }) => {
        if (!offersActiveRef.current) return;
        setOffers(dedupeById(Array.isArray(data?.items) ? data.items : []));
      })
      .catch((requestError) => {
        if (offersActiveRef.current) {
          setOffers([]);
          setOffersError(requestError?.message || "Offers couldn't be loaded right now.");
        }
      })
      .finally(() => {
        if (offersActiveRef.current) setOffersLoading(false);
      });
  };

  useEffect(() => {
    offersActiveRef.current = true;
    fetchOffers();
    productApi.serverTime()
      .then(({ data }) => {
        if (offersActiveRef.current) setServerTime(data.serverTime);
      })
      .catch(() => { /* server time is optional */ });
    return () => { offersActiveRef.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    setCategoriesError(null);
    categoryApi.list()
      .then(({ data }) => {
        if (active) {
          const catList = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
          setCategories(catList.filter((c) => c.isActive !== false));
        }
      })
      .catch((requestError) => {
        if (active) {
          setCategoriesError(requestError?.message || "Categories couldn't be loaded.");
          setCategories([]);
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, []);

  const uniqueOffers = dedupeById(offers);
  const eligibleOffers = uniqueOffers.filter((offer) =>
    offer.effectiveStatus === "Active" || offer.effectiveStatus === "Scheduled"
  );
  const offersInfinite = eligibleOffers.length >= MIN_ITEMS_FOR_INFINITE;

  const uniqueProducts = dedupeById(products);
  const productsInfinite = uniqueProducts.length >= MIN_ITEMS_FOR_INFINITE;

  const features = [
    { title: "100% Organic Products", icon: Leaf },
    { title: "Direct from Farmers", icon: Users },
    { title: "Track Your Orders", icon: Truck },
    { title: "Eco-Friendly Packaging", icon: Recycle },
  ];

  return (
    <div className="bg-[#FAF8F1] pb-16 min-h-screen">
      <div className="gm-container pt-5">
        <motion.div
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
          className="relative h-[340px] sm:h-[380px] rounded-[16px] overflow-hidden mb-6"
        >
          <img src={HERO} alt="Fresh Organic" className="absolute inset-0 w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,.65), rgba(0,0,0,.35) 55%, transparent)" }}
          />
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-[460px] pl-8 sm:pl-12 pr-6">
              <h1 className="font-heading text-[36px] sm:text-[44px] leading-[1.15] font-bold text-white">
                Direct from Farmers.
              </h1>
              <p className="mt-3 text-[14px] text-white/90 max-w-[380px]">
                Support local farmers, choose healthy food, and make a sustainable tomorrow.
              </p>
              <div className="mt-7 flex gap-3">
                <button onClick={() => navigate("/shop")} className="gm-btn">
                  Shop Now
                </button>
                <button
                  onClick={() => navigate("/about")}
                  className="gm-btn-outline text-white border-white hover:bg-white hover:text-[#245C3A]"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="bg-white mb-6 rounded-[16px] border border-[#E2E6DF] shadow-sm p-6 sm:p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} variants={staggerItem} initial="hidden" animate="visible" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[#EAF2E7] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#245C3A]" />
                  </div>
                  <span className="text-[12px] sm:text-[13px] font-medium text-[#26352B] leading-snug">{f.title}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-[#26352B]">Shop by Category</h2>
          </div>
          {categoriesLoading ? (
            <div className="flex gap-4 sm:gap-5 md:gap-6 px-3 sm:px-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="min-w-[120px] sm:min-w-[135px] md:min-w-[150px] flex flex-col items-center gap-2 p-3 rounded-[12px] border border-[#EFEFEC] bg-white animate-pulse" />
              ))}
            </div>
          ) : categories.length ? (
            <CategoryCarousel categories={categories} />
          ) : (
            <p className="text-[12px] text-[#68756B] text-center py-4">No categories available.</p>
          )}
        </motion.div>

        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-[#26352B]">Special Offers &amp; Discounts</h2>
            <Link to="/customer/offers" className="text-[12px] font-medium text-[#245C3A] hover:underline">
              View All Offers <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>

          {offersError && (
            <div role="alert" className="rounded-lg border border-[#FBEDE5] bg-[#FBEDE5] px-3 py-2 text-xs text-[#C2410C] mb-4 flex items-center gap-2">
              {offersError}
              <button
                type="button"
                onClick={fetchOffers}
                className="ml-2 text-[10px] font-semibold underline decoration-[#245C3A] text-[#245C3A] hover:text-[#1E4A30]"
              >
                Retry
              </button>
            </div>
          )}

          {offersLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[220px] animate-pulse rounded-[10px] border border-[#EFEFEC] bg-white" />
              ))}
            </div>
          ) : eligibleOffers.length ? (
            <ContinuousMarquee speed={50} gap={20} itemWidth={260} minItemWidth={170} infinite={offersInfinite}>
              {eligibleOffers.map((offer) => (
                <HomeOfferCard key={offer._id} offer={offer} serverTime={serverTime} />
              ))}
            </ContinuousMarquee>
          ) : (
            <EmptyState text="No active offers available right now. Check back soon!" />
          )}
        </motion.div>

        <motion.div
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-[#26352B]">Featured Products</h2>
            <Link to="/shop" className="text-[12px] font-medium text-[#245C3A] hover:underline">
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[260px] animate-pulse rounded-[10px] border border-[#EFEFEC] bg-white" />
              ))}
            </div>
          ) : productsError ? (
            <p role="alert" className="rounded-lg border border-[#FBEDE5] bg-[#FBEDE5] px-3 py-2 text-xs text-[#C2410C] mb-4">
              {productsError}
            </p>
          ) : uniqueProducts.length ? (
            <ContinuousMarquee speed={40} gap={20} itemWidth={220} minItemWidth={160} infinite={productsInfinite}>
              {uniqueProducts.map((p) => (
                <ProductCard key={p._id || p.id} product={p} />
              ))}
            </ContinuousMarquee>
          ) : (
            <EmptyState text="No featured products available right now. Check back soon!" />
          )}
        </motion.div>

        <section
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          className="bg-[#245C3A] rounded-[16px] overflow-hidden"
        >
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h2 className="text-[16px] sm:text-[18px] font-bold text-white">Fresh from Our Farms</h2>
              <p className="mt-2 text-[#EAF2E7]/90 text-sm">Discover seasonal produce grown with care by local farmers.</p>
              <Link to="/shop" className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-semibold text-[#245C3A] hover:bg-[#EAF2E7]">
                Shop Produce <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="border-l border-[#477A4E]/40 pl-6 sm:pl-8 pt-6 sm:pt-0">
              {subscriptionLoading ? (
                <p className="text-xs text-[#EAF2E7]/80 mb-3">Loading...</p>
              ) : user?.role === "customer" && subscription?.subscribed ? (
                <>
                  <p className="text-xs font-semibold text-[#EAF2E7] mb-1">You're a GreenMart Premium Member!</p>
                  <p className="text-xs text-[#EAF2E7]/90">Your premium subscription is active.</p>
                  <Link to="/customer/dashboard" className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-semibold text-[#245C3A] hover:bg-[#EAF2E7]">
                    Manage Subscription <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              ) : user?.role === "customer" && subscription?.status === "expired" ? (
                <>
                  <p className="text-xs font-semibold text-[#EAF2E7] mb-1">Your premium membership has expired.</p>
                  <p className="text-xs text-[#EAF2E7]/90">Renew to regain exclusive subscriber benefits.</p>
                  <Link to="/customer/subscription-checkout" className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-semibold text-[#245C3A] hover:bg-[#EAF2E7]">
                    Renew Subscription <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              ) : user?.role === "customer" ? (
                <>
                  <p className="text-xs font-semibold text-[#EAF2E7] mb-1">Join GreenMart Premium</p>
                  <p className="text-xs text-[#EAF2E7]/90">Get exclusive benefits for ₹199/month.</p>
                  <Link to="/customer/subscription-checkout" className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-semibold text-[#245C3A] hover:bg-[#EAF2E7]">
                    Subscribe Now <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-[#EAF2E7] mb-1">Discover GreenMart Premium</p>
                  <p className="text-xs text-[#EAF2E7]/90">Subscribe for ₹199/month to unlock exclusive subscriber benefits.</p>
                  <Link to="/login" className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-semibold text-[#245C3A] hover:bg-[#EAF2E7]">
                    Login to Subscribe <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import { EmptyState } from "../../components/common/Skeleton.jsx";
