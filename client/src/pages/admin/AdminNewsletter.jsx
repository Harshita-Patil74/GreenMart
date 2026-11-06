import React, { useEffect, useState } from "react";
import BackButton from "../../components/common/BackButton.jsx";
import newsletterApi from "../../api/newsletterApi";
import toast from "react-hot-toast";

export default function AdminNewsletter() {
  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ campaignName: "", subject: "", preheader: "", heading: "", content: "", bannerImage: "", buttonText: "Shop Now", buttonUrl: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, subs, camps] = await Promise.all([newsletterApi.stats(), newsletterApi.subscribers(), newsletterApi.campaigns()]);
      setStats(s.data);
      setSubscribers(Array.isArray(subs.data) ? subs.data : []);
      setCampaigns(Array.isArray(camps.data) ? camps.data : []);
    } catch (e) {
      setError(e?.message || "Couldn't load newsletter data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createCampaign = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await newsletterApi.createCampaign(form);
      setForm({ campaignName: "", subject: "", preheader: "", heading: "", content: "", bannerImage: "", buttonText: "Shop Now", buttonUrl: "" });
      toast.success("Campaign saved as draft.");
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
      toast.success("Test email sent.");
    } catch (e) {
      toast.error(e?.message || "Couldn't send test email.");
    }
  };

  const sendCampaign = async (id) => {
    if (!window.confirm("Send this campaign to all active subscribers?")) return;
    try {
      const { data } = await newsletterApi.sendCampaign(id);
      toast.success(`Campaign processed: ${data.accepted} accepted, ${data.failed} failed.`);
      await load();
    } catch (e) {
      toast.error(e?.message || "Couldn't send campaign.");
    }
  };

  if (loading) return <div className="p-6 text-xs text-gray-500">Loading newsletter management...</div>;
  if (error && !stats) return <div className="p-6 text-xs text-red-700">{error} <button onClick={load} className="underline">Retry</button></div>;

  return (
    <div className="space-y-6 pb-10">
      <BackButton fallback="/admin/dashboard" />
      <header>
        <h1 className="text-xl font-heading font-bold text-gray-900">Newsletter Management</h1>
        <p className="mt-1 text-xs text-gray-500">Manage subscribers and email campaigns.</p>
        {stats?.mode === "mock" && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Mock Email Mode: Campaigns are simulated for demonstration. No actual emails are sent.</p>}
      </header>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ["Total Subscribers", stats.totalSubscribers],
            ["Active Subscribers", stats.activeSubscribers],
            ["Unsubscribed", stats.unsubscribed],
            ["Campaigns Sent", stats.campaignsSent],
            ["Emails Delivered", stats.totalEmailsDelivered],
            ["Failed Emails", stats.failedEmails],
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
        <form onSubmit={createCampaign} className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Campaign name" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          <input required placeholder="Email subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          <input placeholder="Preheader" value={form.preheader} onChange={e => setForm({ ...form, preheader: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          <input placeholder="Heading" value={form.heading} onChange={e => setForm({ ...form, heading: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          <textarea placeholder="Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="sm:col-span-2 rounded-lg border p-2 text-xs" rows="4" />
          <input placeholder="Banner image URL" value={form.bannerImage} onChange={e => setForm({ ...form, bannerImage: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          <input placeholder="Button text" value={form.buttonText} onChange={e => setForm({ ...form, buttonText: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          <input placeholder="Button URL" value={form.buttonUrl} onChange={e => setForm({ ...form, buttonUrl: e.target.value })} className="h-9 rounded-lg border px-3 text-xs" />
          <button disabled={saving} className="sm:col-span-2 h-9 rounded-lg bg-[#245C3A] text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Draft"}</button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Campaigns</h2>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">{c.campaignName}</p>
                <p className="text-[10px] text-gray-500">{c.subject} · {c.status}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => sendTest(c._id)} className="rounded border px-2 py-1 text-[10px]">Send Test</button>
                {c.status === "draft" && <button onClick={() => sendCampaign(c._id)} className="rounded bg-[#245C3A] px-2 py-1 text-[10px] text-white">Send</button>}
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
    </div>
  );
}
EOF