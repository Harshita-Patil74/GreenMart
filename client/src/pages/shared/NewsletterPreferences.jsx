import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import newsletterApi from "../../api/newsletterApi";
import BackButton from "../../components/common/BackButton.jsx";
import toast from "react-hot-toast";

export default function NewsletterPreferences() {
  const [pref, setPref] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const fallback = location.pathname.startsWith("/farmer") ? "/farmer/dashboard" : "/customer/dashboard";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await newsletterApi.preferences();
      setPref(data);
    } catch (e) {
      setError(e?.message || "Couldn't load subscription preferences.");
      setPref(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      await newsletterApi.customerSubscribe();
      toast.success("You're subscribed to GreenMart newsletter updates!");
      await load();
    } catch (e) {
      toast.error(e?.message || "Couldn't subscribe to GreenMart updates.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    try {
      await newsletterApi.customerUnsubscribe();
      toast.success("You have successfully unsubscribed from GreenMart updates.");
      await load();
    } catch (e) {
      toast.error(e?.message || "Couldn't unsubscribe from GreenMart updates.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-xs text-[#68756B]">Loading preferences...</div>;
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-xs text-red-700">{error}</p>
      <button onClick={load} className="mt-2 inline-block text-primary text-xs underline">Retry</button>
    </div>
  );

  const isSubscribed = !!pref?.isSubscribed;
  const roleLabel = String(pref?.subscriberType || "guest").charAt(0).toUpperCase() + String(pref?.subscriberType || "guest").slice(1);

  return (
    <div className="space-y-4 pb-12 max-w-2xl mx-auto">
      <BackButton fallback={fallback} />
      <motion.header
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-heading font-bold text-gray-900">Newsletter Preferences</h1>
          <p className="mt-1 text-xs text-gray-500">Manage your GreenMart newsletter subscription.</p>
        </div>
      </motion.header>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E2E6DF] bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Subscription</h2>
            <p className="mt-0.5 text-xs text-gray-500">Subscriber type: <span className="font-medium capitalize">{roleLabel}</span></p>
            <p className="mt-0.5 text-xs text-gray-500">Email: <span className="font-medium break-all">{pref?.email || "—"}</span></p>
            {pref?.subscribedAt && (
              <p className="mt-0.5 text-xs text-gray-500">Subscribed: <span className="font-medium">{new Date(pref.subscribedAt).toLocaleDateString()}</span></p>
            )}
          </div>
          <div className="flex items-end gap-2">
            {isSubscribed ? (
              <button
                disabled={busy}
                onClick={handleUnsubscribe}
                className="h-10 rounded-lg bg-[#245C3A] px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Updating..." : "Unsubscribe"}
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={handleSubscribe}
                className="h-10 rounded-lg bg-[#245C3A] px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Updating..." : isSubscribed === false ? "Subscribe Again" : "Subscribe"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-[10px] text-[#64716B]">
          When subscribed, you\u2019ll receive in-app notifications about new campaigns and can access them in <Link to={location.pathname.startsWith("/farmer") ? "/farmer/newsletters" : "/customer/newsletters"} className="text-[#087449] font-semibold underline">My Newsletters</Link>.
        </p>
      </motion.section>
    </div>
  );
}
