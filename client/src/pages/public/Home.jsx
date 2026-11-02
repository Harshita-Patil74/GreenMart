import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Users, Truck, Recycle, ArrowRight } from "lucide-react";
import productApi from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { listDemoProducts, unwrapList } from "../../data/demoCatalog.js";
import { formatCurrency, formatDate } from "../../pages/farmer/farmerUtils.js";
import getImageUrl from "../../utils/imageUrl.js";

const HERO =
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=80";

function HomeOfferCard({ offer }) {
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

  const shopNow = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/product/${productId}`);
  };

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[#E5EBE5] bg-white p-1.5 shadow-[0_1px_5px_rgba(27,52,36,0.07)] transition hover:shadow-[0_7px_18px_rgba(27,52,36,0.12)]">
      <div className="relative h-[120px] overflow-hidden rounded-[9px] bg-[#F0F3EF] sm:h-[112px] lg:h-[116px]">
        <ImageWithFallback
          src={getImageUrl(product.images?.[0])}
          alt={product.name || "Fresh product"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#16803C] px-2 py-1 text-[9px] font-bold text-white shadow-sm">
          {discountLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-1 pt-1.5">
        <Link to={`/product/${productId}`} className="line-clamp-1 text-[12px] font-bold leading-4 text-[#202D24] hover:text-[#16803C] sm:text-[13px]" title={product.name}>
          {product.name || "Product"}
        </Link>
        <p className="mt-0.5 truncate text-[9px] leading-3 text-[#7B877D] sm:text-[10px]">{offer.title}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-bold leading-4 text-[#16803C] sm:text-sm">{formatCurrency(price)}</span>
          <span className="text-[9px] text-[#939B94] line-through">{formatCurrency(originalPrice)}</span>
          <span className="rounded-full bg-[#E6F7E9] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#13803D] sm:text-[9px]">{discountLabel}</span>
        </div>
        <p className="mt-0.5 text-[8px] text-[#879187]">per {product.unit || "unit"}{minimumQuantity > 1 ? ` · min ${minimumQuantity}` : ""}</p>
        {minimumAmount > 0 && (
          <p className="mt-1 truncate text-[8px] font-medium text-[#738078]">Cart minimum {formatCurrency(minimumAmount)}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-[#EEF1ED] pt-1.5 text-[8px] text-[#67756A] sm:text-[9px]">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
            {formatDate(offer.startDate)} – {formatDate(offer.endDate, { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <span className={disabled ? "font-semibold text-red-600" : "whitespace-nowrap"}>{disabled ? "Out of Stock" : `In Stock: ${stock}`}</span>
        </div>

        <div className="mt-auto grid grid-cols-[1fr_auto] gap-1.5 pt-2">
          <Link
            to={`/product/${productId}`}
            onClick={shopNow}
            disabled={disabled}
            className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md bg-[#16803C] px-2 text-[10px] font-semibold text-white transition hover:bg-[#116B32] disabled:cursor-not-allowed disabled:bg-[#C9D1CA] disabled:text-[#68736A] sm:text-[11px]"
          >
            <span className="truncate">{disabled ? "Out of Stock" : "Shop Now"}</span>
          </Link>
          <Link
            to={`/product/${productId}`}
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

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(listDemoProducts({ limit: 4 }));
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState("");

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
    <div className="bg-page-bg pb-16">
      <div className="gm-container pt-5">
        <div className="relative h-[340px] sm:h-[380px] rounded-[16px] overflow-hidden">
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
      </div>

      <div className="bg-white mt-0">
        <div className="gm-container py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#E8F5EC] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[13px] font-medium text-[#1F2937] leading-snug">{f.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gm-container pt-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-[20px] font-semibold text-[#1F2937]">Special Offers &amp; Discounts</h2>
          <Link to="/customer/offers" className="text-[13px] font-medium text-primary hover:underline">
            View All Offers →
          </Link>
        </div>

        {offersError && (
          <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 mb-5">
            {offersError}
          </p>
        )}

        {offersLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[240px] animate-pulse rounded-xl border border-[#E7EEEC] bg-white" />
            ))}
          </div>
        ) : eligibleOffers.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {eligibleOffers.map((offer) => (
              <HomeOfferCard key={offer._id} offer={offer} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-10 text-sm">
            No active offers available right now. Check back soon!
          </p>
        )}
      </div>

      <div className="gm-container pt-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-[20px] font-semibold text-[#1F2937]">Featured Products</h2>
          <Link to="/shop" className="text-[13px] font-medium text-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p._id || p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
