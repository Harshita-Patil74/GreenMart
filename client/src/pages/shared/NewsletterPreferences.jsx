import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { sectionReveal } from "../../animations/variants.js";
import newsletterApi from "../../api/newsletterApi";
import BackButton from "../../components/common/BackButton.jsx";
import toast from "react-hot-toast";
import { CreditCard, Clock, ShieldCheck, Ticket } from "lucide-react";
import { formatCurrency, formatDate } from "../../pages/farmer/farmerUtils.js";

export default function NewsletterPreferences() {
  const [pref, setPref] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
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
      const [prefRes, subRes, payRes] = await Promise.all([
        newsletterApi.preferences(),
        newsletterApi.subscriptionMe(),
        newsletterApi.subscriptionPayments(),
      ]);
      setPref(prefRes.data);
      setSubscription(subRes.data);
      setPayments(Array.isArray(payRes.data?.payments) ? payRes.data.payments : []);
    } catch (e) {
      setError(e?.message || "Couldn't load subscription preferences.");
      setPref(null);
      setSubscription(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFreeSubscribe = async () => {
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

  const handleFreeUnsubscribe = async () => {
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
  const isPremium = subscription?.subscribed === true;
  const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;

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
          <p className="mt-1 text-xs text-gray-500">Manage your GreenMart newsletter subscription and premium membership.</p>
        </div>
      </motion.header>

      {/* Free Newsletter Preferences */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E2E6DF] bg-white p-6 shadow-sm mb-6"
      >
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Newsletter Notifications</h2>
        <p className="mt-0.5 text-xs text-gray-500 mb-4">Controls whether you receive campaign notifications. Separate from paid premium membership.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <h3 className="text-xs font-semibold text-gray-900">Free Newsletter</h3>
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
                onClick={handleFreeUnsubscribe}
                className="h-10 rounded-lg bg-[#245C3A] px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Updating..." : "Unsubscribe"}
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={handleFreeSubscribe}
                className="h-10 rounded-lg bg-[#245C3A] px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Updating..." : isSubscribed === false ? "Subscribe Again" : "Subscribe"}
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-[10px] text-[#64716B]">
          When subscribed, you&rsquo;ll receive in-app notifications about new campaigns and can access them in <Link to={location.pathname.startsWith("/farmer") ? "/farmer/newsletters" : "/customer/newsletters"} className="text-[#087449] font-semibold underline">My Newsletters</Link>.
        </p>
      </motion.section>

      {/* Paid Premium Subscription */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-[#E2E6DF] bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-gray-900 mb-3">GreenMart Premium Membership</h2>
        <p className="mt-0.5 text-xs text-gray-500 mb-4">Paid monthly subscription — ₹199/month (mock payment demonstration). Controls access to exclusive subscriber offers.</p>

        {isPremium ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-[#16803C]" />
              <h3 className="text-xs font-bold text-[#14532D]">Premium Active</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF2E7] text-[#14532D]">
                {daysRemaining} days remaining
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="border border-gray-100 rounded-lg p-3">
                <p className="text-[10px] text-gray-500">Start Date</p>
                <p className="text-xs font-semibold text-gray-900">{subscription.startDate ? formatDate(new Date(subscription.startDate)) : "—"}</p>
              </div>
              <div className="border border-gray-100 rounded-lg p-3">
                <p className="text-[10px] text-gray-500">Expiry Date</p>
                <p className="text-xs font-semibold text-gray-900">{endDate ? formatDate(endDate) : "—"}</p>
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 mb-4">
              <p className="text-[10px] text-gray-500">Amount Paid</p>
              <p className="text-xs font-bold text-[#245C3A]">₹{subscription.amount || 199} {subscription.currency || "INR"}</p>
            </div>
            <div className="flex gap-2">
              <Link to="/customer/newsletters" className="flex-1 h-9 rounded-lg bg-[#245C3A] flex items-center justify-center text-[10px] font-semibold text-white hover:bg-[#1E4A30]">
                View My Newsletters
              </Link>
              <Link to="/customer/offers" className="flex-1 h-9 rounded-lg border border-[#DDE8DF] flex items-center justify-center text-[10px] font-semibold text-[#245C3A] hover:bg-[#F0F5EE]">
                Explore Exclusive Offers
              </Link>
            </div>
          </>
        ) : subscription?.status === "expired" ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-[#9A3412]" />
              <h3 className="text-xs font-bold text-[#9A3412]">Membership Expired</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-4">Your GreenMart Premium membership has expired. Renew to regain access to exclusive subscriber offers.</p>
            <button
              onClick={() => navigate("/customer/subscription-checkout")}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Subscribe / Renew — ₹199/month
            </button>
          </>
        ) : subscription?.status === "payment_failed" ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="h-3.5 w-3.5 text-[#9A3412]" />
              <h3 className="text-xs font-bold text-[#9A3412]">Payment Failed</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-4">Your mock payment did not complete. Your membership remains inactive.</p>
            <button
              onClick={() => navigate("/customer/subscription-checkout")}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Subscribe / Renew — ₹199/month
            </button>
          </>
        ) : subscription?.status === "pending" ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#F59E0B] text-[#F59E0B] animate-spin" />
              <h3 className="text-xs font-bold text-[#9A4E00]">Payment Pending</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-4">Your mock payment is awaiting confirmation.</p>
            <button
              onClick={() => navigate("/customer/subscription-checkout")}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Complete Payment — ₹199/month
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-3.5 w-3.5 text-gray-500" />
              <h3 className="text-xs font-bold text-gray-900">Not Subscribed</h3>
            </div>
            <p className="text-[10px] text-gray-600 mb-4">
              Subscribe to GreenMart Premium for ₹199/month to unlock exclusive subscriber offers and campaign notifications.
            </p>
            <button
              onClick={() => navigate("/customer/subscription-checkout")}
              className="w-full h-9 rounded-lg bg-[#245C3A] text-[10px] font-semibold text-white hover:bg-[#1E4A30]"
            >
              Subscribe Now — ₹199/month
            </button>
            <p className="mt-2 text-[10px] text-[#82908B]">Mock payment demonstration — no real money will be charged.</p>
          </>
        )}

        {subscription?.status === "active" && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-900 mb-3">Payment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="bg-[#F7F6F2] text-[9px] uppercase text-[#68756B]">
                    <th className="px-3 py-2">Transaction ID</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEFEC]">
                  {payments.length === 0 ? (
                    <tr><td colSpan="4" className="p-3 text-center text-[10px] text-gray-500">No payment records.</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.transactionId}>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[9px]">{p.transactionId}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(p.amount)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold ${p.status === "successful" ? "bg-[#EAF2E7] text-[#14532D]" : "bg-[#FBEDE5] text-[#9A3412]"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}
