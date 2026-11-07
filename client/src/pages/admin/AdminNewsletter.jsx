import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import BackButton from "../../components/common/BackButton.jsx";
import newsletterApi from "../../api/newsletterApi";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sectionReveal } from "../../animations/variants.js";

const TYPES = [
  { value: "offers", label: "Offers & Discounts" },
  { value: "new-products", label: "New Products" },
  { value: "fresh-harvest", label: "Fresh Harvest" },
  { value: "farmer-spotlight", label: "Farmer Spotlight" },
  { value: "announcements", label: "Announcements" },
  { value: "custom", label: "Custom Newsletter" },
];

const PAGE_SIZE = 10;

const card = "rounded-[12px] border border-[#E2E6DF] bg-white shadow-[0_1px_3px_rgba(38,53,43,0.06)]";

export default function AdminNewsletter() {
const [stats, setStats] = useState(null);
const [campaigns, setCampaigns] = useState([]);
const [products, setProducts] = useState([]);
const [offers, setOffers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

  const [form, setForm] = useState({
    campaignName: "", subject: "", preheader: "", heading: "", content: "", bannerImage: "", bannerImageFileId: "", buttonText: "Shop Now", buttonUrl: "",
    campaignType: "custom",
  });
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [offerSearch, setOfferSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCampaignId, setPendingCampaignId] = useState(null);
  const [viewCampaign, setViewCampaign] = useState(null);
  const [viewRecipients, setViewRecipients] = useState([]);
  const [previewMode, setPreviewMode] = useState("desktop");

  // Paid subscription management state
const [subscriptionStats, setSubscriptionStats] = useState(null);
const [subscriptions, setSubscriptions] = useState([]);
const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
const [subscriptionsError, setSubscriptionsError] = useState(null);
const [subSearch, setSubSearch] = useState("");
const [subStatusFilter, setSubStatusFilter] = useState("all");
const [subPage, setSubPage] = useState(1);

const loadSubscriptionStats = async () => {
  setSubscriptionsLoading(true);
  setSubscriptionsError(null);
  try {
    const [statsRes, subsRes] = await Promise.all([
      newsletterApi.adminSubscriptionStats(),
      newsletterApi.adminSubscriptions({ page: subPage, limit: 10, search: subSearch, status: subStatusFilter }),
    ]);
    setSubscriptionStats(statsRes.data);
    setSubscriptions(Array.isArray(subsRes.data?.items) ? subsRes.data.items : []);
  } catch (e) {
    setSubscriptionsError(e?.message || "Couldn't load subscription data.");
    setSubscriptions([]);
  } finally {
    setSubscriptionsLoading(false);
  }
};

const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, camps, prods, offs] = await Promise.all([
        newsletterApi.stats(),
        newsletterApi.campaigns(),
        newsletterApi.products(),
        newsletterApi.offers(),
      ]);
      setStats(s.data);
      setCampaigns(Array.isArray(camps.data) ? camps.data : []);
      setProducts(Array.isArray(prods.data) ? prods.data : []);
      setOffers(Array.isArray(offs.data) ? offs.data : []);
    } catch (e) {
      setError(e?.message || "Couldn't load newsletter data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); loadSubscriptionStats(); }, []);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = !productCategory || p.category === productCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, productCategory]);

  const filteredOffers = useMemo(() => {
    return offers.filter((o) => !offerSearch || (o.title || "").toLowerCase().includes(offerSearch.toLowerCase()));
  }, [offers, offerSearch]);

  const selectedProducts = useMemo(() => products.filter((p) => selectedProductIds.includes(p._id)), [products, selectedProductIds]);
  const selectedOffers = useMemo(() => offers.filter((o) => selectedOfferIds.includes(o._id)), [offers, selectedOfferIds]);

  useEffect(() => {
    let subject = "";
    let content = "";
    let heading = "";
    if (form.campaignType === "offers") {
      subject = "Special Organic Offers from GreenMart!";
      heading = "Special Offers";
      if (selectedOffers.length) {
        content = selectedOffers.map((o) => {
          const p = o.product || {};
          const orig = p.price || 0;
          const disc = o.discountType === "Percentage" ? Math.max(0, orig - (orig * o.discountValue) / 100) : Math.max(0, orig - o.discountValue);
          return `${o.title}: ${p.name || "Product"} - ${o.discountType === "Percentage" ? o.discountValue + "% off" : "₹" + o.discountValue + " off"} (₹${orig} → ₹${disc.toFixed(2)})`;
        }).join("\n");
      }
    } else if (form.campaignType === "new-products") {
      subject = "Discover What's New at GreenMart!";
      heading = "New Arrivals";
      if (selectedProducts.length) {
        content = selectedProducts.map((p) => `${p.name} - ₹${p.price} (${p.category})`).join("\n");
      }
    } else if (form.campaignType === "fresh-harvest") {
      subject = "Fresh Harvest Updates from GreenMart!";
      heading = "Fresh Harvest";
      if (selectedProducts.length) {
        content = selectedProducts.map((p) => `${p.name} - ₹${p.price} (${p.category})`).join("\n");
      }
    } else if (form.campaignType === "announcements") {
      subject = "GreenMart Announcement";
      heading = "Announcement";
    } else if (form.campaignType === "custom") {
      subject = "GreenMart Newsletter";
      heading = "Newsletter";
    }
    setForm((f) => ({
      ...f,
      subject: f.subject || subject,
      heading: f.heading || heading,
      content: f.content || content,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.campaignType, selectedProducts.length, selectedOffers.length]);

  const statusBadge = (status) => {
    switch (status) {
      case "draft": return { label: "Draft", color: "bg-gray-100 text-gray-600 border border-gray-200" };
      case "sending": return { label: "Processing", color: "bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]/40" };
      case "sent": return { label: "Processed", color: "bg-[#EAF2E7] text-[#14532D] border border-[#E2E6DF]" };
      case "failed": return { label: "Failed", color: "bg-[#FBEDE5] text-[#9A3412] border border-[#FBEDE5]" };
      case "cancelled": return { label: "Cancelled", color: "bg-[#FBEDE5] text-[#9A3412] border border-[#FBEDE5]" };
      case "pending": return { label: "Pending", color: "bg-[#FDF3E3] text-[#9A4E00] border border-[#FDE6A7]" };
      default: return { label: status, color: "bg-gray-100 text-gray-600 border border-gray-200" };
    }
  };

  const toggleProduct = (id) => setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleOffer = (id) => setSelectedOfferIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const createCampaign = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await newsletterApi.createCampaign({
        ...form,
        campaignType: form.campaignType,
        selectedProductIds,
        selectedOfferIds,
      });
      toast.success("Campaign saved as draft.");
      setForm({ campaignName: "", subject: "", preheader: "", heading: "", content: "", bannerImage: "", bannerImageFileId: "", buttonText: "Shop Now", buttonUrl: "", campaignType: "custom" });
      setSelectedProductIds([]); setSelectedOfferIds([]);
      await load();
    } catch (e) {
      setError(e?.message || "Couldn't create campaign.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateCampaign = async (id) => {
    try {
      await newsletterApi.duplicateCampaign(id);
      toast.success("Campaign duplicated.");
      await load();
    } catch (e) {
      toast.error(e?.message || "Couldn't duplicate campaign.");
    }
  };

  const cancelCampaign = async (id) => {
    if (!window.confirm("Cancel this campaign?")) return;
    try {
      await newsletterApi.cancelCampaign(id);
      toast.success("Campaign cancelled.");
      await load();
    } catch (e) {
      toast.error(e?.message || "Couldn't cancel campaign.");
    }
  };

  const sendTest = async (id) => {
    const email = window.prompt("Enter test email address");
    if (!email) return;
    try {
      await newsletterApi.sendTest(id, email);
      toast.success("Test processed.");
    } catch (e) {
      toast.error(e?.message || "Couldn't send test.");
    }
  };

  const requestSend = (id) => { setPendingCampaignId(id); setConfirmOpen(true); };
  const confirmSend = async () => {
    if (!pendingCampaignId) return;
    setConfirmOpen(false);
    try {
      const { data } = await newsletterApi.sendCampaign(pendingCampaignId);
      toast.success(`Campaign processed: ${data.accepted} simulated, ${data.failed} failed.`);
      await load();
    } catch (e) {
      toast.error(e?.message || "Couldn't send campaign.");
    } finally {
      setPendingCampaignId(null);
    }
  };

  const openView = async (id) => {
    try {
      const { data } = await newsletterApi.campaign(id);
      setViewCampaign(data);
      const r = await newsletterApi.recipients(id);
      setViewRecipients(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      toast.error(e?.message || "Couldn't load campaign.");
    }
  };

  const pendingCampaign = campaigns.find((c) => c._id === pendingCampaignId);

  if (loading) return <div className="p-6 text-xs text-[#68756B]">Loading newsletter management...</div>;

  return (
    <div className="space-y-4 pb-8">
      <BackButton fallback="/admin/dashboard" />
      <header>
        <h1 className="text-xl font-heading font-bold text-[#26352B]">Newsletter Management</h1>
        <p className="mt-1 text-xs text-[#68756B]">Manage subscribers, create newsletter campaigns, and track campaign activity.</p>
      </header>

      {error && <p role="alert" className="rounded-[8px] bg-[#FBEDE5] px-3 py-2 text-xs text-[#9A3412]">{error}</p>}

        {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
            {[
                ["Total Premium Subscribers", stats.totalSubscribers],
                ["Active Paid Members", stats.activeSubscribers],
                ["Eligible Recipients", stats.eligibleRecipients],
                ["Cancelled Subscriptions", stats.unsubscribed],
                ["Expired Subscriptions", stats.expired],
                ["Pending Subscriptions", stats.pending],
                ["Campaigns Processed", stats.campaignsSent],
            ].map(([label, value]) => (
                <div key={label} className={`${card} p-4`}>
                <p className="text-[10px] font-semibold text-[#68756B]">{label}</p>
                <p className="mt-1 text-xl font-bold text-[#245C3A]">{value ?? 0}</p>
                </div>
            ))}
        </div>
        )}

      <section id="campaign-builder" className="grid gap-4 lg:grid-cols-2">
        <div className={`${card} p-4`}>
          <div className="mb-3">
            <h2 className="text-[15px] font-bold text-[#26352B]">Create Campaign</h2>
          </div>
          <form onSubmit={createCampaign} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">Campaign Name</label>
                <input required placeholder="Campaign name" value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">Campaign Type</label>
                <select value={form.campaignType} onChange={(e) => setForm({ ...form, campaignType: e.target.value })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white">
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">Email Subject</label>
                <input required placeholder="Email subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">Preheader</label>
                <input placeholder="Preheader" value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" />
              </div>
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">Newsletter Heading</label>
                <input placeholder="Heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" />
              </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26352B] mb-1.5">Banner Image</label>
                  <div className="space-y-2">
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast.error("Image must be 5 MB or smaller."); return; }
                      setBannerUploading(true);
                      try {
                        const { data } = await newsletterApi.uploadBanner(file);
                        setForm((current) => ({ ...current, bannerImage: data.url, bannerImageFileId: data.fileId }));
                        toast.success("Banner uploaded.");
                      } catch (err) {
                        toast.error(err?.response?.data?.message || "Banner upload failed.");
                      } finally {
                        setBannerUploading(false);
                        e.target.value = "";
                      }
                    }} className="w-full text-xs" disabled={bannerUploading} />
                    {bannerUploading && <p className="text-[10px] text-gray-500">Uploading...</p>}
                    <input placeholder="Banner image URL (optional)" value={form.bannerImage} onChange={(e) => setForm({ ...form, bannerImage: e.target.value, bannerImageFileId: "" })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" />
                    {form.bannerImage && (
                      <div className="relative">
                        <img src={form.bannerImage} alt="Banner preview" className="h-24 w-full object-cover rounded-[8px] border border-[#E2E6DF]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        <button type="button" onClick={() => setForm((current) => ({ ...current, bannerImage: "", bannerImageFileId: "" }))} className="absolute top-1 right-1 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-red-600">Remove</button>
                      </div>
                    )}
                  </div>
                </div>
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">Newsletter Content</label>
                <textarea placeholder="Newsletter content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full min-h-[96px] px-3.5 py-2 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" rows="4" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">CTA Button Text</label>
                <input placeholder="Call-to-action text" value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352B] mb-1.5">CTA URL</label>
                <input placeholder="Call-to-action URL" value={form.buttonUrl} onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })} className="w-full h-11 px-3.5 text-sm bg-[#FAF8F1] border border-[#E2E6DF] rounded-[8px] focus:outline-none focus:border-[#245C3A] focus:bg-white" />
              </div>
            </div>

            {(form.campaignType === "new-products" || form.campaignType === "fresh-harvest") && (
              <div className={`${card} p-3`}>
                <p className="text-xs font-semibold text-[#26352B] mb-2">Select Products ({selectedProductIds.length})</p>
                <div className="flex gap-2 mb-2">
                  <input placeholder="Search products" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="flex-1 h-9 rounded-[8px] border px-2 text-xs bg-[#FAF8F1] border-[#E2E6DF]" />
                  <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="h-9 rounded-[8px] border px-2 text-xs bg-[#FAF8F1] border-[#E2E6DF]">
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {filteredProducts.map((p) => (
                    <label key={p._id} className="flex items-center gap-3 text-xs cursor-pointer select-none group">
                      <input type="checkbox" checked={selectedProductIds.includes(p._id)} onChange={() => toggleProduct(p._id)} className="shrink-0" />
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="shrink-0 relative h-14 w-14 rounded-[8px] overflow-hidden border border-[#E2E6DF] bg-[#FAF8F1]">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-300 text-[10px]">No image</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate leading-none">{p.name}</p>
                          <p className="mt-0.5 text-[9px] text-gray-500 leading-none">
                            {p.farmer?.name ? `by ${p.farmer.name}` : "Farmer"} · ₹{p.price}/{p.unit}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-xs text-[#68756B]">No products found.</p>}
                </div>
              </div>
            )}

            {form.campaignType === "offers" && (
              <div className={`${card} p-3`}>
                <p className="text-xs font-semibold text-[#26352B] mb-2">Select Offers ({selectedOfferIds.length})</p>
                <input placeholder="Search offers" value={offerSearch} onChange={(e) => setOfferSearch(e.target.value)} className="mb-2 w-full h-9 rounded-[8px] border px-2 text-xs bg-[#FAF8F1] border-[#E2E6DF]" />
                <div className="max-h-40 overflow-auto space-y-1">
                  {filteredOffers.map((o) => {
                    const p = o.product || {};
                    const orig = p.price || 0;
                    const disc = o.discountType === "Percentage" ? Math.max(0, orig - (orig * o.discountValue) / 100) : Math.max(0, orig - o.discountValue);
                    const discountPct = orig > 0 ? Math.round(((orig - disc) / orig) * 100) : 0;
                    const statusColor = o.status === "Active" ? "bg-[#EAF2E7] text-[#14532D]" : o.status === "Pending" ? "bg-[#FDF3E3] text-[#9A4E00]" : "bg-[#FBEDE5] text-[#9A3412]";
                    return (
                      <label key={o._id} className="flex items-center gap-3 text-xs cursor-pointer select-none group">
                        <input type="checkbox" checked={selectedOfferIds.includes(o._id)} onChange={() => toggleOffer(o._id)} className="shrink-0" />
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="shrink-0 relative h-12 w-14 rounded-[8px] overflow-hidden border border-[#E2E6DF] bg-[#FAF8F1]">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-300 text-[10px]">No image</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate leading-none">{o.title}</p>
                            <p className="mt-0.5 text-[9px] text-gray-500 leading-none">
                              {p.farmer?.name ? `by ${p.farmer.name}` : "Farmer"} · {o.type}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${statusColor}`}>{o.status}</span>
                              <span className="text-[9px] font-bold text-[#16803C]">₹{disc.toFixed(2)}</span>
                              <span className="text-[9px] text-gray-400 line-through">₹{orig}</span>
                              <span className={`text-[9px] ${discountPct > 0 ? "text-[#13803D]" : "text-gray-500"} font-bold`}>-${discountPct}%</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                  {filteredOffers.length === 0 && <p className="text-xs text-[#68756B]">No eligible offers found.</p>}
                </div>
              </div>
            )}

            <div className={`${card} p-3`}>
              <p className="text-xs font-semibold text-[#26352B] mb-2">Audience</p>
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={true} disabled /> Active GreenMart Premium Members</label>
              </div>
              <p className="mt-2 text-[10px] text-[#68756B]">Eligible recipients: {stats?.eligibleRecipients ?? 0} active paid Premium members</p>
            </div>

            <div className="flex gap-2">
              <button disabled={saving} className="h-10 rounded-[8px] bg-[#245C3A] px-5 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Draft"}</button>
            </div>
          </form>
        </div>

        <div className={`${card} p-4 flex flex-col`}>
          <div className="mb-3">
            <h2 className="text-[15px] font-bold text-[#26352B]">Live Preview</h2>
          </div>
          <div className="flex-1 min-h-[340px] overflow-hidden rounded-[8px] border border-[#E2E6DF] bg-[#FAF8F1] relative flex flex-col">
            <div className={previewMode === "mobile" ? "max-w-sm mx-auto h-full flex flex-col p-4 sm:p-6" : "h-full flex flex-col p-4 sm:p-6"}>
              <p className="font-bold text-[#245C3A]">GreenMart</p>
              <p className="mt-0.5 text-[10px] text-[#68756B]">Fresh. Organic. Direct from Farmers.</p>
              {form.bannerImage && (
                <img src={form.bannerImage} alt="" className="mt-3 h-24 w-full object-cover rounded-[8px] border border-[#E2E6DF]" />
              )}
              <p className="mt-3 font-semibold text-[#245C3A]">{form.heading || form.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{form.content}</p>
              {(selectedProducts.length || selectedOffers.length) && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <h3 className="text-[9px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Featured</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedProducts.map((p) => (
                      <div key={p._id} className="flex gap-2.5 items-start rounded-lg border border-gray-100 bg-[#FAF8F1] p-2.5">
                        <div className="shrink-0 relative h-12 w-14 rounded-[6px] overflow-hidden border border-[#E2E6DF] bg-white">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300 text-[9px]">No image</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-gray-900 truncate leading-none">{p.name}</p>
                          <p className="mt-0.5 text-[9px] text-gray-500 leading-none">{p.category}</p>
                          <p className="mt-1 text-xs font-bold text-[#16803C]">₹{p.price}/{p.unit}</p>
                        </div>
                      </div>
                    ))}
                    {selectedOffers.map((o) => {
                      const p = o.product || {};
                      const orig = p.price || 0;
                      const disc = o.discountType === "Percentage" ? Math.max(0, orig - (orig * o.discountValue) / 100) : Math.max(0, orig - o.discountValue);
                      const discountPct = orig > 0 ? Math.round(((orig - disc) / orig) * 100) : 0;
                      return (
                        <div key={o._id} className="flex gap-2.5 items-start rounded-lg border border-gray-100 bg-[#FAF8F1] p-2.5">
                          <div className="shrink-0 relative h-12 w-14 rounded-[6px] overflow-hidden border border-[#E2E6DF] bg-white">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300 text-[9px]">No image</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-gray-900 truncate leading-none">{o.title}</p>
                            <p className="mt-0.5 text-[9px] text-gray-500 leading-none">{o.discountType === "Percentage" ? o.discountValue + "% off" : "₹" + o.discountValue + " off"}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-400 line-through">₹{orig}</span>
                              <span className="text-xs font-bold text-[#16803C]">Now ₹{disc.toFixed(2)}</span>
                              <span className={`text-[9px] ${discountPct > 0 ? "text-[#13803D]" : "text-gray-500"} font-bold`}>-${discountPct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {form.buttonText && <p className="mt-5 inline-flex rounded-[8px] bg-[#245C3A] px-3 py-1.5 text-[10px] font-semibold text-white">{form.buttonText}</p>}
              <p className="mt-3 text-[10px] text-[#68756B]">Unsubscribe link included in sent emails.</p>
            </div>
          </div>
        <div className="mt-3 flex gap-2 text-xs">
          <button
            onClick={() => setPreviewMode("desktop")}
            className={previewMode === "desktop" ? "text-[#245C3A] font-semibold" : "text-[#68756B] hover:bg-[#F0F5EE] rounded-[6px] px-2 py-1 transition"}
          >
            Desktop
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={previewMode === "mobile" ? "text-[#245C3A] font-semibold" : "text-[#68756B] hover:bg-[#F0F5EE] rounded-[6px] px-2 py-1 transition"}
          >
            Mobile
          </button>
        </div>
        </div>
      </section>

      <section className={`${card} p-4`}>
        <div className="mb-3">
          <h2 className="text-[15px] font-bold text-[#26352B]">Campaign History</h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="bg-[#F7F6F2] text-[10px] uppercase text-[#68756B]">
                <th className="px-3 py-3">Campaign Name</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Audience</th>
                <th className="px-3 py-3">Recipients</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFEC]">
              {campaigns.map((c) => (
                <tr key={c._id}>
                  <td className="px-3 py-3">{c.campaignName}</td>
                  <td className="px-3 py-3">{c.campaignType}</td>
                  <td className="px-3 py-3">{c.audienceType}</td>
                  <td className="px-3 py-3">{c.recipientCount}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${statusBadge(c.status).color}`}>{statusBadge(c.status).label}</span>
                  </td>
                  <td className="px-3 py-3">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-3 flex gap-1.5">
                    <button onClick={() => openView(c._id)} className="rounded-[6px] border px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-[#F0F5EE]">View</button>
                    <button onClick={() => sendTest(c._id)} className="rounded-[6px] border px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-[#F0F5EE]">Test</button>
                    {c.status === "draft" && (
                      <>
                        <button onClick={() => requestSend(c._id)} className="rounded-[6px] bg-[#245C3A] px-2 py-1 text-[10px] font-semibold text-white">Process</button>
                        <button onClick={() => cancelCampaign(c._id)} className="rounded-[6px] border px-2 py-1 text-[10px] font-semibold text-[#9A3412] hover:bg-[#FBEDE5]">Cancel</button>
                      </>
                    )}
                    <button onClick={() => duplicateCampaign(c._id)} className="rounded-[6px] border px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-[#F0F5EE]">Duplicate</button>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[#68756B]">No campaigns yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`${card} p-5 w-80 space-y-3`}>
            <h3 className="text-sm font-semibold text-[#26352B]">Confirm Send</h3>
            {pendingCampaign && (
              <div className="text-xs text-[#68756B] space-y-1">
                <p>Campaign: {pendingCampaign.campaignName}</p>
                <p>Type: {pendingCampaign.campaignType}</p>
                <p>Audience: Active GreenMart Premium Members</p>
                <p>Recipients: {pendingCampaign.recipientCount || pendingCampaign.selectedSubscribers?.length || 0}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setConfirmOpen(false); setPendingCampaignId(null); }} className="rounded-[6px] border px-3 py-1 text-xs">Cancel</button>
              <button onClick={confirmSend} className="rounded-[6px] bg-[#245C3A] px-3 py-1 text-xs text-white">Confirm Send</button>
            </div>
          </div>
        </div>
      )}

      {viewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[12px] border border-[#E2E6DF] bg-white shadow-[0_4px_12px_rgba(38,53,43,0.05)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#26352B]">Campaign Details</h3>
              <button onClick={() => setViewCampaign(null)} className="rounded-[6px] border px-2 py-1 text-xs">Close</button>
            </div>
            <div className="text-xs space-y-1">
              <p><span className="font-semibold">Name:</span> {viewCampaign.campaignName}</p>
              <p><span className="font-semibold">Type:</span> {viewCampaign.campaignType}</p>
              <p><span className="font-semibold">Subject:</span> {viewCampaign.subject}</p>
              <p><span className="font-semibold">Heading:</span> {viewCampaign.heading}</p>
              <p className="whitespace-pre-wrap"><span className="font-semibold">Content:</span> {viewCampaign.content}</p>
              {viewCampaign.buttonText && <p><span className="font-semibold">CTA:</span> {viewCampaign.buttonText} ({viewCampaign.buttonUrl})</p>}
            </div>
            <div className={previewMode === "mobile" ? "max-w-sm mx-auto" : "w-full"}>
              <div className={`${previewMode === "mobile" ? "max-w-sm mx-auto h-full flex flex-col p-4 sm:p-6" : "h-full flex flex-col p-4 sm:p-6"} rounded-[8px] border border-[#E2E6DF] bg-[#FAF8F1]`}>
                <p className="font-bold text-[#245C3A]">{viewCampaign.heading || viewCampaign.subject}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{viewCampaign.content}</p>
                {(viewCampaign.selectedProducts || []).map((sp, i) => {
                  const snap = sp.snapshot || {};
                  return (
                    <div key={i} className="mt-2 flex gap-2 items-start rounded-lg border border-gray-100 bg-[#FAF8F1] p-2">
                      <div className="shrink-0 relative h-10 w-12 rounded-[6px] overflow-hidden border border-[#E2E6DF] bg-white">
                        {snap.image ? (
                          <img src={snap.image} alt={snap.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300 text-[9px]">No image</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-gray-900 truncate leading-none">{snap.name}</p>
                        <p className="mt-0.5 text-[9px] text-gray-500 leading-none">{snap.category} · ₹{snap.price}/{snap.unit}</p>
                      </div>
                    </div>
                  );
                })}
                {(viewCampaign.selectedOffers || []).map((so, i) => {
                  const snap = so.snapshot || {};
                  const prod = snap.product || {};
                  const orig = prod.price || 0;
                  const disc = snap.discountType === "Percentage" ? Math.max(0, orig - (orig * snap.discountValue) / 100) : Math.max(0, orig - snap.discountValue);
                  return (
                    <div key={i} className="mt-2 flex gap-2 items-start rounded-lg border border-gray-100 bg-[#FAF8F1] p-2">
                      <div className="shrink-0 relative h-10 w-12 rounded-[6px] overflow-hidden border border-[#E2E6DF] bg-white">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300 text-[9px]">No image</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-gray-900 truncate leading-none">{snap.title}</p>
                        <p className="mt-0.5 text-[9px] text-gray-500 leading-none">{snap.discountType === "Percentage" ? snap.discountValue + "% off" : "₹" + snap.discountValue + " off"}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-400 line-through">₹{orig}</span>
                          <span className="text-xs font-bold text-[#16803C]">Now ₹{disc.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {viewCampaign.buttonText && <p className="mt-4 inline-flex rounded-[8px] bg-[#245C3A] px-3 py-1.5 text-[10px] font-semibold text-white">{viewCampaign.buttonText}</p>}
                <p className="mt-3 text-[10px] text-[#68756B]">Unsubscribe link included in sent emails.</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#26352B] mb-2">Recipients ({viewRecipients.length})</h4>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className="text-left p-2 text-[10px] uppercase text-[#68756B]">Subscriber Email</th>
                      <th className="text-left p-2 text-[10px] uppercase text-[#68756B]">Processing Status</th>
                      <th className="text-left p-2 text-[10px] uppercase text-[#68756B]">Processed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEFEC]">
                    {viewRecipients.map((r) => (
                      <tr key={r._id} className="border-t border-[#EFEFEC]">
                        <td className="p-2">{r.email}</td>
                        <td className="p-2">{r.status}</td>
                        <td className="p-2">{r.acceptedAt || r.failedAt || r.deliveredAt ? new Date(r.acceptedAt || r.failedAt || r.deliveredAt).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Subscription Management */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="mt-8 rounded-[12px] border border-[#E2E6DF] bg-white shadow-[0_1px_3px_rgba(38,53,43,0.06)]"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Premium Subscription Management</h2>
              <p className="mt-0.5 text-[10px] text-[#82908B]">All revenue and payment metrics are simulated (mock). No real financial transactions.</p>
            </div>
          </div>

          {subscriptionsLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((key) => (
                <div key={key} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : subscriptionsError ? (
            <div className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-700 mb-4">{subscriptionsError}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
                <div className="bg-[#FAF8F1] rounded-lg p-4">
                  <p className="text-[10px] text-[#68756B]">Total Subscriptions</p>
                  <p className="text-lg font-bold text-gray-900">{subscriptionStats?.totalSubscriptions ?? 0}</p>
                </div>
                <div className="bg-[#EAF2E7] rounded-lg p-4">
                  <p className="text-[10px] text-[#14532D]">Active Paid</p>
                  <p className="text-lg font-bold text-[#16803C]">{subscriptionStats?.activeSubscriptions ?? 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-[10px] text-[#68756B]">Expired</p>
                  <p className="text-lg font-bold text-gray-900">{subscriptionStats?.expiredSubscriptions ?? 0}</p>
                </div>
                <div className="bg-[#FDF3E3] rounded-lg p-4">
                  <p className="text-[10px] text-[#9A4E00]">Pending</p>
                  <p className="text-lg font-bold text-[#B45309]">{subscriptionStats?.pendingPayments ?? 0}</p>
                </div>
                <div className="bg-[#FBEDE5] rounded-lg p-4">
                  <p className="text-[10px] text-[#9A3412]">Cancelled</p>
                  <p className="text-lg font-bold text-[#9A3412]">{subscriptionStats?.cancelledSubscriptions ?? 0}</p>
                </div>
                <div className="bg-[#E0F2FE] rounded-lg p-4">
                  <p className="text-[10px] text-[#1D4ED8]">Simulated Revenue</p>
                  <p className="text-lg font-bold text-[#0369A1]">₹{(subscriptionStats?.simulatedRevenue ?? 0).toLocaleString()}</p>
                </div>
                <div className="bg-[#F0FDF4] rounded-lg p-4">
                  <p className="text-[10px] text-[#14532D]">Eligible Recipients</p>
                  <p className="text-lg font-bold text-[#16803C]">{subscriptionStats?.eligibleRecipients ?? 0}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F7F6F2] text-[10px] uppercase text-[#68756B]">
                      <th className="px-3 py-3 w-[25%]">Customer Name</th>
                      <th className="px-3 py-3 w-[22%]">Email Address</th>
                      <th className="px-3 py-3 w-[12%]">Plan</th>
                      <th className="px-3 py-3 w-[12%]">Amount</th>
                      <th className="px-3 py-3 w-[12%]">Start Date</th>
                      <th className="px-3 py-3 w-[12%]">Expiry Date</th>
                      <th className="px-3 py-3 w-[13%]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEFEC]">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-4 text-center text-[10px] text-gray-500">
                          No subscriptions found.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((s) => {
                        const statusColor = s.status === "active" ? "bg-[#EAF2E7] text-[#14532D]" : s.status === "pending" ? "bg-[#FDF3E3] text-[#9A4E00]" : s.status === "expired" ? "bg-gray-100 text-gray-600" : s.status === "cancelled" ? "bg-[#FBEDE5] text-[#9A3412]" : "bg-[#FBEDE5] text-[#9A3412]";
                        const endDate = s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN") : "—";
                        return (
                          <tr key={s._id} className="border-t border-[#EFEFEC]">
                            <td className="px-3 py-3 whitespace-nowrap">{s.user?.name || "Unknown"}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-600">{s.email}</td>
                            <td className="px-3 py-3 text-[10px]">{s.planName}</td>
                            <td className="px-3 py-3 text-[10px]">₹{s.amount}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-[10px]">{s.startDate ? new Date(s.startDate).toLocaleDateString("en-IN") : "—"}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-[10px]">{endDate}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusColor}`}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {subscriptions.length > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <p className="text-gray-500">Page {subPage}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSubPage(Math.max(1, subPage - 1))}
                        disabled={subPage === 1}
                        className="h-7 w-7 rounded border border-gray-200 text-[10px] disabled:opacity-50"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setSubPage(subPage + 1)}
                        className="h-7 w-7 rounded border border-gray-200 text-[10px]"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.section>
    </div>
  );
}
