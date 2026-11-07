import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import newsletterApi from "../../api/newsletterApi";
import BackButton from "../../components/common/BackButton.jsx";
import { formatDate } from "../../pages/farmer/farmerUtils.js";

export default function NewsletterDetail({ role = "customer" } = {}) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [newsletter, setNewsletter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchDetail = role === "farmer" ? newsletterApi.farmerNewsletter : newsletterApi.customerNewsletter;
      const { data } = await fetchDetail(campaignId);
      setNewsletter(data);
    } catch (e) {
      setError(e?.message || "Couldn't load newsletter.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [campaignId]);

  if (loading) return <div className="p-6 text-xs text-[#68756B]">Loading newsletter...</div>;
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-xs text-red-700">{error}</p>
      <Link to={`/${role}/newsletters`} className="mt-2 inline-block text-primary text-xs underline">Back to My Newsletters</Link>
    </div>
  );

  const buildFeatured = () => {
    const prodItems = (newsletter.selectedProducts || []).map((item) => {
      const s = item.snapshot || {};
      const productId = s.productId || item.productId || s._id || item._id;
      const price = Number(s.price ?? s.originalPrice ?? 0);
      return {
        kind: "product",
        id: productId,
        productId,
        name: s.name || "Product",
        image: s.image || (Array.isArray(s.images) && s.images[0]) || "/images/placeholder.svg",
        farmerName: s.farmerName || (s.farmer && s.farmer.name) || "GreenMart Farmer",
        unit: s.unit || "unit",
        price,
        originalPrice: Number(s.originalPrice ?? s.price ?? 0),
        discountedPrice: s.discountedPrice !== undefined ? Number(s.discountedPrice) : null,
        minimumQuantity: s.minimumQuantity || 1,
        category: s.category,
      };
    });

    const offerItems = (newsletter.selectedOffers || []).map((item) => {
      const s = item.snapshot || {};
      const prod = s.product || {};
      const productId = prod.productId || prod._id;
      const originalPrice = Number(s.originalPrice ?? prod.price ?? 0);
      const discountValue = Number(s.discountValue ?? 0);
      const discountedPrice = s.discountedPrice !== undefined ? Number(s.discountedPrice)
        : s.discountType === "Percentage"
          ? Math.max(0, originalPrice - (originalPrice * discountValue) / 100)
          : Math.max(0, originalPrice - discountValue);
      const discountPercent = originalPrice > 0 ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0;
      return {
        kind: "offer",
        id: s.offerId || item.offerId || s._id || item._id,
        offerId: s.offerId || item.offerId,
        title: s.title || "Offer",
        productId,
        productName: prod.name || "Product",
        productImage: prod.image || (Array.isArray(prod.images) && prod.images[0]) || "/images/placeholder.svg",
        productFarmer: prod.farmerName || (prod.farmer && prod.farmer.name) || "GreenMart Farmer",
        productUnit: prod.unit || "unit",
        discountType: s.discountType || "Percentage",
        discountValue,
        originalPrice,
        discountedPrice,
        discountPercent,
        minimumQuantity: s.minimumQuantity || 1,
      };
    });

    return [...prodItems, ...offerItems];
  };

  const featured = buildFeatured();

  return (
    <div className="space-y-4 pb-12 mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
      <BackButton fallback={`/${role}/newsletters`} />
      <motion.header
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-heading font-bold text-gray-900">{newsletter.campaignName || newsletter.subject}</h1>
          <p className="mt-1 text-xs text-gray-500">{newsletter.campaignType}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${newsletter.isRead ? "bg-gray-100 text-gray-600" : "bg-[#EAF2E7] text-[#14532D]"}`}>
            {newsletter.isRead ? "Read" : "New"}
          </span>
          <span className="text-gray-500">{newsletter.createdAt ? formatDate(newsletter.createdAt, { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
        </div>
      </motion.header>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E2E6DF] bg-white p-6 shadow-sm"
      >
        <div className="relative">
          {(newsletter.bannerImage || newsletter.bannerImageUrl) ? (
            <img src={newsletter.bannerImage || newsletter.bannerImageUrl} alt="" className="w-full h-48 object-cover rounded-lg border border-[#E2E6DF]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="w-full h-48 rounded-lg border border-[#E2E6DF] bg-[#FAF8F1] flex items-center justify-center">
              <span className="text-gray-400 text-xs">No banner image</span>
            </div>
          )}
        </div>
        <h2 className="mt-4 text-lg font-heading font-bold text-[#245C3A]">{newsletter.heading || newsletter.subject}</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{newsletter.content}</div>

        {featured.length && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Featured</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featured.map((f) => {
                if (f.kind === "product") {
                  const imageUrl = f.image || "/images/placeholder.svg";
                  const discountPct = f.originalPrice && f.discountedPrice !== null && f.originalPrice > 0
                    ? Math.round(((f.originalPrice - f.discountedPrice) / f.originalPrice) * 100)
                    : 0;
                  return (
                    <div key={f.id || f.productId} className="flex gap-3 items-start rounded-lg border border-gray-100 bg-[#FAF8F1] p-3">
                      <div className="shrink-0 relative h-14 w-14 rounded-[8px] overflow-hidden border border-[#E2E6DF] bg-white">
                        <img src={imageUrl} alt={f.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate leading-none">{f.name}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500 leading-none">
                          {f.farmerName ? `by ${f.farmerName}` : "Farmer"} · {f.unit || "unit"}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-400 line-through">₹{f.originalPrice}</span>
                          <span className="text-xs font-bold text-[#16803C]">₹{f.discountedPrice !== null ? f.discountedPrice : "—"}</span>
                          {discountPct > 0 && <span className="text-[9px] font-bold text-[#13803D]">-{discountPct}%</span>}
                        </div>
                        <p className="mt-1 text-[10px] text-gray-600">{f.minimumQuantity ? `Min ${f.minimumQuantity}${f.unit || ""}` : ""}</p>
                        {f.productId ? (
                          <Link to={`/product/${f.productId}`} className="inline-flex h-7 items-center gap-1 rounded bg-[#245C3A] px-2 text-[9px] font-semibold text-white hover:bg-[#1E4A30]">
                            View Product
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                const imageUrl = f.productImage || "/images/placeholder.svg";
                return (
                  <div key={f.id || f.offerId} className="flex gap-3 items-start rounded-lg border border-gray-100 bg-[#FAF8F1] p-3">
                    <div className="shrink-0 relative h-14 w-14 rounded-[8px] overflow-hidden border border-[#E2E6DF] bg-white">
                      <img src={imageUrl} alt={f.productName} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate leading-none">{f.title}</p>
                      <p className="mt-0.5 text-[10px] text-gray-500 leading-none">{f.discountType === "Percentage" ? f.discountValue + "% off" : "₹" + f.discountValue + " off"}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[9px] text-gray-400 line-through">₹{f.originalPrice}</span>
                        <span className="text-xs font-bold text-[#16803C]">Now ₹{f.discountedPrice}</span>
                        {f.discountPercent > 0 && <span className="text-[9px] font-bold text-[#13803D]">-{f.discountPercent}%</span>}
                      </div>
                      <p className="mt-1 text-[10px] text-gray-600">{f.minimumQuantity ? `Min ${f.minimumQuantity}${f.productUnit || ""}` : ""}</p>
                      {f.productId ? (
                        <Link to={`/product/${f.productId}`} className="inline-flex h-7 items-center gap-1 rounded bg-[#245C3A] px-2 text-[9px] font-semibold text-white hover:bg-[#1E4A30]">
                          View Product
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(() => {
          const text = newsletter.buttonText;
          const rawUrl = newsletter.buttonUrl || "";
          const defaults = { offers: "/offers", "new-products": "/shop", "fresh-harvest": "/shop", announcements: "/shop", "farmer-spotlight": "/farmers" };
          const url = rawUrl.trim() || defaults[newsletter.campaignType] || "";
          if (!text || !url) return null;
          const isRelative = url.startsWith("/");
          const isHttps = /^https:\/\//i.test(url);
          if (!isRelative && !isHttps) return null;
          return (
            <div className="mt-6">
              {isRelative ? (
                <Link to={url} className="inline-flex h-10 items-center justify-center rounded-lg bg-[#245C3A] px-6 text-xs font-semibold text-white hover:bg-[#1E4A30]">
                  {text}
                </Link>
              ) : (
                <a href={url} className="inline-flex h-10 items-center justify-center rounded-lg bg-[#245C3A] px-6 text-xs font-semibold text-white hover:bg-[#1E4A30]">
                  {text}
                </a>
              )}
            </div>
          );
        })()}
      </motion.section>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="mt-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Campaign Details</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p><span className="font-medium">Type:</span> {newsletter.campaignType}</p>
          <p><span className="font-medium">Published:</span> {newsletter.createdAt ? formatDate(newsletter.createdAt, { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
          <p><span className="font-medium">Status:</span> <span className="text-[#14532D] font-semibold">Delivered</span></p>
        </div>
      </motion.div>

      <div className="mt-6 rounded-lg border border-[#E5E8E6] bg-[#F0F5EE] p-4">
        <p className="text-[10px] text-[#64716B]">
          You received this newsletter because you are subscribed to GreenMart updates. <br />
          Manage your subscription or <Link to={`/${role}/newsletter-preferences`} className="text-[#087449] font-semibold underline">update preferences</Link>.
        </p>
      </div>
    </div>
  );
}
