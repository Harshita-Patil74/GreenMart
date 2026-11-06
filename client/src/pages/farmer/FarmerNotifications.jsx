import React, { useEffect, useMemo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";
import notificationApi from "../../api/notificationApi";
import BackButton from "../../components/common/BackButton.jsx";
import { formatDate, unwrapList } from "./farmerUtils.js";
import {
  getNotificationIcon, getNotificationStyle, FARMER_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, normalizeCategory,
} from "../../config/notificationConfig.js";

export default function FarmerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // No pagination params: backend returns the complete plain array for the
      // authenticated farmer, which keeps per-category counts and unread counts
      // accurate without fetching partial pages.
      const { data } = await notificationApi.list();
      const items = unwrapList(data);
      setNotifications(Array.isArray(items) ? items : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't load your notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const normalized = useMemo(() => notifications.map((n) => ({
    ...n,
    category: normalizeCategory(n) || (n.category || ""),
  })), [notifications]);

  const filtered = useMemo(() => {
    if (category === "all") return normalized;
    return normalized.filter((n) => String(n.category || "").toLowerCase() === category);
  }, [normalized, category]);

  useEffect(() => { setPage(1); }, [category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);
  const categoryCounts = useMemo(() => {
    const counts = {};
    FARMER_CATEGORIES.forEach((cat) => {
      counts[cat] = cat === "all" ? notifications.length : normalized.filter((n) => String(n.category || "").toLowerCase() === cat).length;
    });
    return counts;
  }, [normalized, notifications.length]);
  const categoryUnreadCounts = useMemo(() => {
    const counts = {};
    FARMER_CATEGORIES.forEach((cat) => {
      counts[cat] = cat === "all" ? unreadCount : normalized.filter((n) => !n.isRead && String(n.category || "").toLowerCase() === cat).length;
    });
    return counts;
  }, [normalized, unreadCount]);

  const markRead = async (notification) => {
    if (notification.isRead) return;
    try {
      await notificationApi.markRead(notification._id);
      setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't mark this notification as read.");
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      toast.success("All notifications marked as read.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't mark notifications as read.");
    }
  };

  const remove = async (notification, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.remove(notification._id);
      setNotifications((current) => current.filter((item) => item._id !== notification._id));
      toast.success("Notification deleted.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Couldn't delete this notification.");
    }
  };

  const goToOrder = (notification) => {
    if (notification.orderId) {
      // Navigation to order details is handled by the consumer/router; marking
      // read happens here.
    }
    markRead(notification);
  };

  return (
    <section className="mx-auto max-w-4xl space-y-4 pb-5 text-[13px] text-[#20312E]">
      <BackButton fallback="/farmer/dashboard" />
      <motion.header
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Notifications</h1>
          <p className="mt-1 text-xs text-[#71817D]">Updates about orders, your products, and farm activity.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#C9DCD4] px-3 text-xs font-medium text-[#087449] hover:bg-white"><Bell size={14} /> Mark all read</button>
        )}
      </motion.header>

      <motion.nav
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        aria-label="Notification categories"
        className="flex min-w-0 gap-1.5 overflow-x-auto rounded-xl border border-[#E5ECE8] bg-white p-2 scrollbar-hide"
      >
        {FARMER_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Bell;
          const count = categoryCounts[cat] || 0;
          const unread = categoryUnreadCounts[cat] || 0;
          return (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              type="button"
              aria-pressed={category === cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition ${
                category === cat
                  ? "border-[#087449] bg-[#087449] text-white"
                  : "border-transparent text-[#475852] hover:border-[#D9E7DE] hover:bg-[#F6FAF8]"
              }`}
            >
              {cat === "all" ? <Bell aria-hidden="true" className="h-3.5 w-3.5" /> : <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
              <span>{CATEGORY_LABELS[cat]}</span>
              {count > 0 && <span className={`min-w-4 rounded-full px-1 text-center text-[9px] leading-4 ${category === cat ? "bg-white/20 text-white" : "bg-[#EAF6ED] text-[#087449]"}`}>{count}</span>}
            </motion.button>
          );
        })}
      </motion.nav>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]"
      >
        {error ? (
          <div role="alert" className="p-8 text-center text-sm text-[#6A7773]">
            <p>{error}</p><button type="button" onClick={loadNotifications} className="mt-3 font-semibold text-[#07814E]">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-xs text-[#778681]">Loading notifications…</div>
        ) : currentPageItems.length ? (
          <ul className="divide-y divide-[#EDF1F0]" variants={staggerContainer} initial="hidden" animate="visible">
            {currentPageItems.map((notification) => {
              const style = getNotificationStyle(notification.type);
              const Icon = getNotificationIcon(notification.type);
              return (
                <motion.li
                  key={notification._id}
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                >
                  <div className={`flex items-start gap-3 px-4 py-3.5 ${notification.isRead ? "bg-white" : "bg-[#F6FAF8]"}`}>
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.background} ${style.color}`}><Icon size={15} /></span>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => goToOrder(notification)}>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <h2 className={`text-xs ${notification.isRead ? "font-medium text-[#475852]" : "font-semibold text-[#253933]"}`}>{notification.title || "Farm update"}</h2>
                        <time className="whitespace-nowrap text-[10px] text-[#8A9692]" dateTime={notification.createdAt}>{formatDate(notification.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#71817D]">{notification.message || "You have a new update."}</p>
                      <span className={`text-[9px] font-semibold uppercase tracking-wider ${notification.isRead ? "text-gray-400" : "text-[#087449]"}`}>
                        {CATEGORY_LABELS[normalizeCategory(notification)] || CATEGORY_LABELS[notification.category] || "Update"}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <button type="button" aria-label={`Mark ${notification.title || "notification"} as read`} onClick={() => markRead(notification)} className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0A9A60] ring-2 ring-[#DDF3E9] hover:ring-4" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => remove(notification, e)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E5E8E6] bg-white px-2 text-[10px] text-[#64716B] hover:border-red-200 hover:text-red-700"
                      aria-label={`Delete ${notification.title || "notification"}`}
                    >
                      <span className="h-3 w-3">🗑️</span>
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <motion.div variants={sectionReveal} initial="hidden" animate="visible" className="px-4 py-12 text-center">
            <Bell className="mx-auto h-7 w-7 text-[#A5B3AE]" />
            <p className="mt-2 text-xs font-medium text-[#52615D]">You're all caught up</p>
            <p className="mt-1 text-[11px] text-[#899691]">New updates will appear here.</p>
          </motion.div>
        )}
      </motion.div>

      {filtered.length > PAGE_SIZE && (
        <motion.div variants={sectionReveal} initial="hidden" animate="visible" className="flex items-center justify-between px-4 py-3 text-xs text-[#475852]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-[#E5ECE8] px-2 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6FAF8]"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-[#E5ECE8] px-2 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6FAF8]"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}
    </section>
  );
}
