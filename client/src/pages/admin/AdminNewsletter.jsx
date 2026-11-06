import React, { useEffect, useState, useMemo } from "react";
import BackButton from "../../components/common/BackButton.jsx";
import newsletterApi from "../../api/newsletterApi";
import toast from "react-hot-toast";

const TYPES = [
  { value: "offers", label: "Offers & Discounts" },
  { value: "new-products", label: "New Products" },
  { value: "fresh-harvest", label: "Fresh Harvest" },
  { value: "farmer-spotlight", label: "Farmer Spotlight" },
  { value: "announcements", label: "Announcements" },
  { value: "custom", label: "Custom Newsletter" },
];

export default function AdminNewsletter() {
  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    campaignName: "", subject: "", preheader: "", heading: "", content: "", bannerImage: "", buttonText: "Shop Now", buttonUrl: "",
    campaignType: "custom", audienceType: "all",
  });
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState([]);
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [offerSearch, setOfferSearch] = useState("");
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCampaignId, setPendingCampaignId] = useState(null);
  const [viewCampaign, setViewCampaign] = useState(null);
  const [viewRecipients, setViewRecipients] = useState([]);
  const [previewMode, setPreviewMode] = useState("desktop");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, subs, camps, prods, offs] = await Promise.all([
        newsletterApi.stats(), newsletterApi.subscribers(), newsletterApi.campaigns(),
        newsletterApi.products(), newsletterApi.offers(),
      ]);
      setStats(s.data);
      setSubscribers(Array.isArray(subs.data) ? subs.data : []);
      setCampaigns(Array.isArray(camps.data) ? camps.data : []);
      setProducts(Array.isArray(prods.data) ? prods.data : []);
      setOffers(Array.isArray(offs.data) ? offs.data : []);
    } catch (e) {
      setError(e?.message || "Couldn't load newsletter data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

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

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((s) => !subscriberSearch || s.email.toLowerCase().includes(subscriberSearch.toLowerCase()));
  }, [subscribers, subscriberSearch]);

  const selectedProducts = useMemo(() => products.filter((p) => selectedProductIds.includes(p._id)), [products, selectedProductIds]);
  const selectedOffers = useMemo(() => offers.filter((o) => selectedOfferIds.includes(o._id)), [offers, selectedOfferIds]);

  // Auto-generate content when type or selections change
  useEffect(() => {
    let subject = form.subject;
    let content = form.content;
    let heading = form.heading;
    if (form.campaignType === "offers") {
      if (!subject) subject = "Special Organic Offers from GreenMart!";
      if (!heading) heading = "Special Offers";
      if (selectedOffers.length) {
        content = selectedOffers.map((o) => {
          const p = o.product || {};
          const orig = p.price || 0;
          const disc = o.discountType === "Percentage" ? Math.max(0, orig - (orig * o.discountValue) / 100) : Math.max(0, orig - o.discountValue);
          return `${o.title}: ${p.name || "Product"} - ${o.discountType === "Percentage" ? o.discountValue + "% off" : "₹" + o.discountValue + " off"} (₹${orig} â†’ ₹${disc.toFixed(2)})`;
        }).join("\n");
      }
    } else if (form.campaignType === "new-products") {
      if (!subject) subject = "Discover What's New at GreenMart!";
      if (!heading) heading = "New Arrivals";
      if (selectedProducts.length) {
        content = selectedProducts.map((p) => `${p.name} - ₹${p.price} (${p.category})`).join("\n");
      }
    } else if (form.campaignType === "fresh-harvest") {
      if (!subject) subject = "Fresh Harvest Updates from GreenMart!";
      if (!heading) heading = "Fresh Harvest";
      if (selectedProducts.length) {
        content = selectedProducts.map((p) => `${p.name} - ₹${p.price} (${p.category})`).join("\n");
      }
    } else if (form.campaignType === "announcements") {
      if (!subject) subject = "GreenMart Announcement";
      if (!heading) heading = "Announcement";
    } else if (form.campaignType === "custom") {
      if (!subject) subject = "GreenMart Newsletter";
      if (!heading) heading = "Newsletter";
    }
    setForm((f) => ({ ...f, subject: f.subject || subject, heading: f.heading || heading, content: f.content || content }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.campaignType, selectedProducts.length, selectedOffers.length]);

  const toggleProduct = (id) => setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleOffer = (id) => setSelectedOfferIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSubscriber = (id) => setSelectedSubscriberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

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
        audienceType: form.audienceType,
        selectedSubscriberIds: form.audienceType === "selected" ? selectedSubscriberIds : [],
      });
      toast.success("Campaign saved as draft.");
      setForm({ campaignName: "", subject: "", preheader: "", heading: "", content: "", bannerImage: "", buttonText: "Shop Now", buttonUrl: "", campaignType: "custom", audienceType: "all" });
      setSelectedProductIds([]); setSelectedOfferIds([]); setSelectedSubscriberIds([]);
      await load();
    } catch (e) {
      setError(e?.message || "Couldn't create campaign.");
    } finally {
      setSaving(false);
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

  if (loading) return <div className="p-6 text-xs text-gray-500">Loading newsletter management...</div>;

  return (
    <div className="space-y-6 pb-10">
      <BackButton fallback="/admin/dashboard" />
      <header>
        <h1 className="text-xl font-heading font-bold text-gray-900">Newsletter Management</h1>
        <p className="mt-1 text-xs text-gray-500">Manage subscribers and email campaigns.</p>
      </header>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ["Total Subscribers", stats.totalSubscribers],
            ["Active Subscribers", stats.activeSubscribers],
            ["Unsubscribed", stats.unsubscribed],
            ["Campaigns Sent", stats.campaignsSent],
            ["Simulated Deliveries", stats.totalEmailsDelivered],
            ["Failed Campaign Processing", stats.failedEmails],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[10px] text-gray-500">{label}</p>
              <p className="text-lg font-bold text-[#245C3A]">{value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Create Campaign</h2>
        <form onSubmit={createCampaign} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Campaign Type</label>
            <select value={form.campaignType} onChange={(e) => setForm({ ...form, campaignType: e.target.value })} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Campaign name" value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
            <input required placeholder="Email subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
            <input placeholder="Preheader" value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
            <input placeholder="Heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
            <textarea placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="sm:col-span-2 rounded-lg border p-2 text-xs" rows="4" />
            <input placeholder="Banner image URL" value={form.bannerImage} onChange={(e) => setForm({ ...form, bannerImage: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
            <input placeholder="Button text" value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
            <input placeholder="Button URL" value={form.buttonUrl} onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          </div>

          {(form.campaignType === "new-products" || form.campaignType === "fresh-harvest") && (
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-900 mb-2">Select Products ({selectedProductIds.length})</p>
              <div className="flex gap-2 mb-2">
                <input placeholder="Search products" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="h-8 flex-1 rounded border px-2 text-xs" />
                <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="h-8 rounded border px-2 text-xs">
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="max-h-48 overflow-auto space-y-1">
                {filteredProducts.map((p) => (
                  <label key={p._id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={selectedProductIds.includes(p._id)} onChange={() => toggleProduct(p._id)} />
                    <span>{p.name} - ₹{p.price} ({p.category}) {p.stock <= 0 ? "(Out of stock)" : ""}</span>
                  </label>
                ))}
                {filteredProducts.length === 0 && <p className="text-xs text-gray-500">No products found.</p>}
              </div>
            </div>
          )}

          {form.campaignType === "offers" && (
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-900 mb-2">Select Offers ({selectedOfferIds.length})</p>
              <input placeholder="Search offers" value={offerSearch} onChange={(e) => setOfferSearch(e.target.value)} className="mb-2 h-8 w-full rounded border px-2 text-xs" />
              <div className="max-h-48 overflow-auto space-y-1">
                {filteredOffers.map((o) => (
                  <label key={o._id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={selectedOfferIds.includes(o._id)} onChange={() => toggleOffer(o._id)} />
                    <span>{o.title} - {o.discountType === "Percentage" ? o.discountValue + "%" : "₹" + o.discountValue} off</span>
                  </label>
                ))}
                {filteredOffers.length === 0 && <p className="text-xs text-gray-500">No eligible offers found.</p>}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-900 mb-2">Audience</p>
            <div className="flex gap-4 text-xs mb-2">
              <label><input type="radio" checked={form.audienceType === "all"} onChange={() => setForm({ ...form, audienceType: "all" })} /> All active subscribers</label>
              <label><input type="radio" checked={form.audienceType === "selected"} onChange={() => setForm({ ...form, audienceType: "selected" })} /> Selected subscribers</label>
            </div>
            {form.audienceType === "selected" && (
              <div>
                <input placeholder="Search subscribers" value={subscriberSearch} onChange={(e) => setSubscriberSearch(e.target.value)} className="mb-2 h-8 w-full rounded border px-2 text-xs" />
                <div className="flex gap-2 mb-2 text-xs">
                  <button type="button" onClick={() => setSelectedSubscriberIds(filteredSubscribers.map((s) => s._id))} className="rounded border px-2 py-1">Select all</button>
                  <button type="button" onClick={() => setSelectedSubscriberIds([])} className="rounded border px-2 py-1">Deselect all</button>
                </div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {filteredSubscribers.map((s) => (
                    <label key={s._id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={selectedSubscriberIds.includes(s._id)} onChange={() => toggleSubscriber(s._id)} />
                      <span>{s.email} {s.isActive ? "" : "(unsubscribed)"}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-gray-500">Selected: {selectedSubscriberIds.length}</p>
              </div>
            )}
          </div>

          {/* Live preview */}
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-900 mb-2">Live Preview</p>
            <div className="rounded-lg bg-[#FAF8F1] p-3 text-xs">
              <p className="font-bold text-[#245C3A]">{form.heading || form.subject}</p>
              <p className="mt-1 whitespace-pre-wrap">{form.content}</p>
              {selectedProducts.map((p) => (
                <div key={p._id} className="mt-2 flex gap-2 items-center">
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />}
                  <span>{p.name} - ₹{p.price}</span>
                </div>
              ))}
              {selectedOffers.map((o) => (
                <div key={o._id} className="mt-2 text-xs">{o.title} - {o.discountType === "Percentage" ? o.discountValue + "% off" : "₹" + o.discountValue + " off"}</div>
              ))}
              {form.buttonText && <p className="mt-2 text-[#245C3A] font-semibold">{form.buttonText} â†’</p>}
            </div>
          </div>

          <button disabled={saving} className="h-9 rounded-lg bg-[#245C3A] text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Draft"}</button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Campaigns</h2>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">{c.campaignName} <span className="text-[10px] text-gray-500">({c.campaignType})</span></p>
                <p className="text-[10px] text-gray-500">{c.subject} Â· {c.status} Â· {c.recipientCount} recipients</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openView(c._id)} className="rounded border px-2 py-1 text-[10px]">View</button>
                <button onClick={() => sendTest(c._id)} className="rounded border px-2 py-1 text-[10px]">Send Test</button>
                {c.status === "draft" && <button onClick={() => requestSend(c._id)} className="rounded bg-[#245C3A] px-2 py-1 text-[10px] text-white">Send</button>}
              </div>
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-xs text-gray-500">No campaigns yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Subscribers ({subscribers.length})</h2>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-xs">
            <thead><tr><th className="text-left p-2">Email</th><th className="text-left p-2">Status</th></tr></thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s._id} className="border-t border-gray-100">
                  <td className="p-2">{s.email}</td>
                  <td className="p-2">{s.isActive ? "Active" : "Unsubscribed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-5 w-80 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Confirm Send</h3>
            {pendingCampaign && (
              <div className="text-xs text-gray-600 space-y-1">
                <p>Campaign: {pendingCampaign.campaignName}</p>
                <p>Type: {pendingCampaign.campaignType}</p>
                <p>Subject: {pendingCampaign.subject}</p>
                <p>Recipients: {pendingCampaign.audienceType === "selected" ? (pendingCampaign.selectedSubscribers?.length || 0) : (stats?.activeSubscribers || 0)}</p>
                <p>Sending mode: MOCK</p>
              </div>
            )}
            <p className="text-xs text-gray-500">Send this campaign to active subscribers?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setConfirmOpen(false); setPendingCampaignId(null); }} className="rounded border px-3 py-1 text-xs">Cancel</button>
              <button onClick={confirmSend} className="rounded bg-[#245C3A] px-3 py-1 text-xs text-white">Confirm Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
