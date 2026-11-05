import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Users, Truck, Recycle, ArrowRight, Mail, Pin } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import productApi from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { listDemoProducts, unwrapList } from "../../data/demoCatalog.js";
import OfferCountdown from "../../components/offers/OfferCountdown.jsx";
import { formatCurrency, formatDate } from "../../pages/farmer/farmerUtils.js";
import getImageUrl from "../../utils/imageUrl.js";
import ContinuousMarquee from "../../components/common/ContinuousMarquee.jsx";
import { cardItemVariants, cardHover, imageHover, badgeHover } from "../../components/common/motionVariants.jsx";

const HERO = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=80";

const CATEGORIES = [
  { name: "Vegetables", icon: Pin, color: "bg-emerald-50 text-emerald-800 border-emerald-100" },
  { name: "Fruits", icon: Mail, color: "bg-orange-50 text-orange-800 border-orange-100" },
  { name: "Grains & Pulses", icon: Leaf, color: "bg-amber-50 text-amber-800 border-amber-100" },
  { name: "Dairy & Eggs", icon: Truck, color: "bg-blue-50 text-blue-800 border-blue-100" },
  { name: "Spices & Herbs", icon: Users, color: "bg-rose-50 text-rose-800 border-rose-100" },
  { name: "Eco Friendly", icon: Recycle, color: "bg-green-50 text-green-800 border-green-100" },
];

function HomeOfferCard({ offer, serverTime }) {
  const navigate = useNavigate();
  const product = offer.product || {};
  const productId = product._id || product.id;
  const originalPrice = Number((offer.originalPrice ?? product.price) || 0);
  const price = Number(offer.offerPrice ?? 0);
  const discountLabel = offer.discountType === "Percentage"
    ? `${offer.discountPercent}% OFF`
    : `${formatCurrency(offer.discountAmount)} OFF`;
  const minimumQuantity = Math.max(1, Number(offer.minimumQuantity || 1));
  const minimumAmount = Number(offer.minimumAmount || 0);
  const stock = Number(product.stock || 0);
  const outOfStock = stock < minimumQuantity;
  const active = offer.effectiveStatus === "Active";
  const disabled = outOfStock || !active;
  const reducedMotion = useReducedMotion();
  const animate = reducedMotion ? false : "visible";

  const shopNow = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/product/${productId}`);
  };

  return (
    <motion.div
      animate={animate}
      variants={cardItemVariants}
      whileHover={reducedMotion ? undefined : cardHover.hover}
      whileTap={reducedMotion ? undefined : cardHover.tap}
      className="flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[#E2E6DF] bg-white p-1.5 shadow-[0_1px_5px_rgba(38,53,43,0.06)]"
    >
      <motion.div
        animate={animate}
        variants={cardItemVariants}
        whileHover={reducedMotion ? undefined : imageHover.hover}
        className="relative h-[120px] overflow-hidden rounded-[9px] bg-[#F5F3EE] sm:h-[112px] lg:h-[116px]"
      >
        <ImageWithFallback
          src={getImageUrl(product.images?.[0])}
          alt={product.name || "Fresh product"}
          className="h-full w-full object-cover"
        />
        <motion.span
          whileHover={reducedMotion ? undefined : badgeHover.hover}
          whileTap={reducedMotion ? undefined : badgeHover.tap}
          className="absolute left-1.5 top-1.5 rounded-full bg-[#245C3A] px-2 py-1 text-[9px] font-bold text-white shadow-sm"
        >
          {discountLabel}
        </motion.span>
      </motion.div>

      <div className="flex flex-1 flex-col px-1 pt-1.5">
        <Link to={`/product/${productId}`} className="line-clamp-1 text-[12px] font-bold leading-4 text-[#26352B] hover:text-[#245C3A] sm:text-[13px]" title={product.name}>
          {product.name || "Product"}
        </Link>
        <p className="mt-0.5 truncate text-[9px] leading-3 text-[#68756B] sm:text-[10px]">{offer.title}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-bold leading-4 text-[#245C3A] sm:text-sm">{formatCurrency(price)}</span>
          <span className="text-[9px] text-[#9AA498] line-through">{formatCurrency(originalPrice)}</span>
          <span className="rounded-full bg-[#EAF2E7] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#14532D] sm:text-[9px]">{discountLabel}</span>
        </div>
        <p className="mt-0.5 text-[8px] text-[#8B9A8E]">per {product.unit || "unit"}{minimumQuantity > 1 ? ` · min ${minimumQuantity}` : ""}</p>
        {minimumAmount > 0 && (
          <p className="mt-1 truncate text-[8px] font-medium text-[#8B9A8E]">Cart minimum {formatCurrency(minimumAmount)}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-[#EFEFEC] pt-1.5 text-[8px] text-[#68756B] sm:text-[9px]">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
            {formatDate(offer.startDate)} – {formatDate(offer.endDate, { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          {offer.startAt && offer.effectiveStatus === "Upcoming" && (
            <OfferCountdown startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} serverTime={serverTime} />
          )}
          {offer.endAt && offer.effectiveStatus === "Active" && (
            <OfferCountdown startAt={offer.startAt} endAt={offer.endAt} status={offer.effectiveStatus} serverTime={serverTime} />
          )}
          <span className={disabled ? "font-semibold text-[#C2410C]" : "whitespace-nowrap"}>{disabled ? "Out of Stock" : `In Stock: ${stock}`}</span>
        </div>

        <div className="mt-auto grid grid-cols-[1fr_auto] gap-1.5 pt-2">
          <Link
            to={`/product/${productId}`}
            onClick={shopNow}
            disabled={disabled}
            className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md bg-[#245C3A] px-2 text-[10px] font-semibold text-white transition hover:bg-[#1E4A30] disabled:cursor-not-allowed disabled:bg-[#D9E0D4] disabled:text-[#8B9A8E] sm:text-[11px]"
          >
            <span className="truncate">{disabled ? "Out of Stock" : "Shop Now"}</span>
          </Link>
          <Link
            to={`/product/${productId}`}
            aria-label={`View ${product.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E6DF] text-[#68756B] hover:bg-[#F0F5EE]"
          >
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(listDemoProducts({ limit: 4 }));
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState("");
  const [serverTime, setServerTime] = useState(null);

  useEffect(() => {
    productApi
      .storefront({ limit: 4 })
      .then((r) => setProducts(unwrapList(r.data, listDemoProducts({ limit: 4 })).slice(0, 4)))
      .catch(() => setProducts(listDemoProducts({ limit: 4 })));
  }, []);

  useEffect(() => {
    let active = true;
    setOffersLoading(true);
    setOffersError("");
    productApi.storefrontOffers()
      .then(({ data }) => {
        if (!active) return;
        setOffers(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((requestError) => {
        if (active) {
          setOffers([]);
          setOffersError(requestError?.message || "Offers couldn't be loaded right now.");
        }
      })
      .finally(() => {
        if (active) setOffersLoading(false);
      });
    productApi.serverTime()
      .then(({ data }) => {
        if (active) setServerTime(data.serverTime);
      })
      .catch(() => { /* server time is optional */ });
    return () => { active = false; };
  }, []);

  const eligibleOffers = offers.filter((offer) => offer.effectiveStatus === "Active");

  const features = [
    { title: "100% Organic Products", icon: Leaf },
    { title: "Direct from Farmers", icon: Users },
    { title: "Track Your Orders", icon: Truck },
    { title: "Eco-Friendly Packaging", icon: Recycle },
  ];

  return (
    <div className="bg-[#FAF8F1] pb-16 min-h-screen">
      <div className="gm-container pt-5">
        <div className="relative h-[340px] sm:h-[380px] rounded-[16px] overflow-hidden mb-6">
          <img src={HERO} alt="Fresh Organic" className="absolute inset-0 w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,.65), rgba(0,0,0,.35) 55%, transparent)" }}
          />
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-[460px] pl-8 sm:pl-12 pr-6">
              <h1 className="font-heading text-[36px] sm:text-[44px] leading-[1.15] font-bold text-white">
                Fresh. Organic.
                <br />
                Direct from Farmers.
              </h1>
              <p className="mt-3 text-[14px] text-white/90 max-w-[380px]">
                Support local farmers, choose healthy food, and make a sustainable tomorrow.
              </p>
              <div className="mt-7 flex gap-3">
                <button onClick={() => navigate("/shop")} className="gm-btn">
                  Shop Now
                </button>
                <button onClick={() => navigate("/about")} className="gm-btn-outline">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white mb-6 rounded-[16px] border border-[#E2E6DF] shadow-sm p-6 sm:p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-[10px] bg-[#EAF2E7] flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                    <Icon className="w-5 h-5 text-[#245C3A]" />
                  </div>
                  <span className="text-[12px] sm:text-[13px] font-medium text-[#26352B] leading-snug">{f.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-[#26352B]">Shop by Category</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat, i) => (
              <Link key={i} to={`/shop?category=${encodeURIComponent(cat.name)}`} className="group flex flex-col items-center gap-2 p-3 rounded-[10px] border border-[#E2E6DF] bg-white hover:border-[#245C3A]/40 hover:bg-[#F0F5EE] transition">
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 {...cat.color}">
                  <cat.icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#26352B] group-hover:text-[#245C3A]">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-[#26352B]">Special Offers &amp; Discounts</h2>
            <Link to="/customer/offers" className="text-[12px] font-medium text-[#245C3A] hover:underline">
              View All Offers <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>

          {offersError && (
            <p role="alert" className="rounded-lg border border-[#FBEDE5] bg-[#FBEDE5] px-3 py-2 text-xs text-[#C2410C] mb-4">
              {offersError}
            </p>
          )}

          {offersLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[220px] animate-pulse rounded-[10px] border border-[#EFEFEC] bg-white" />
              ))}
            </div>
          ) : eligibleOffers.length ? (
            <ContinuousMarquee speed={50} gap={20} itemWidth={260} minItemWidth={170}>
              {eligibleOffers.map((offer) => (
                <HomeOfferCard key={offer._id} offer={offer} serverTime={serverTime} />
              ))}
            </ContinuousMarquee>
          ) : (
            <EmptyState text="No active offers available right now. Check back soon!" />
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-[#26352B]">Featured Products</h2>
            <Link to="/shop" className="text-[12px] font-medium text-[#245C3A] hover:underline">
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <ContinuousMarquee speed={40} gap={20} itemWidth={220} minItemWidth={160}>
            {products.map((p) => (
              <ProductCard key={p._id || p.id} product={p} />
            ))}
          </ContinuousMarquee>
        </div>

        <section className="bg-[#245C3A] rounded-[16px] overflow-hidden">
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h2 className="text-[16px] sm:text-[18px] font-bold text-white">Fresh from Our Farms</h2>
              <p className="mt-2 text-[#EAF2E7]/90 text-sm">Discover seasonal produce grown with care by local farmers.</p>
              <Link to="/shop" className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-semibold text-[#245C3A] hover:bg-[#EAF2E7]">
                Shop Produce <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="border-l border-[#477A4E]/40 pl-6 sm:pl-8 pt-6 sm:pt-0">
              <p className="text-xs text-[#EAF2E7]/80 mb-3">Stay in touch</p>
              <form className="flex gap-2">
                <input type="email" placeholder="Your email" className="flex-1 h-9 rounded-[6px] bg-white/10 border border-white/20 text-white placeholder-[#EAF2E7]/50 focus:outline-none focus:ring-2 focus:ring-white" />
                <button className="h-9 px-4 rounded-[6px] bg-white text-[#245C3A] text-xs font-semibold hover:bg-[#F0F5EE]">Join</button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import { EmptyState } from "../../components/common/Skeleton.jsx";
