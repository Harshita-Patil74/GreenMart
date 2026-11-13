import React, { useEffect, useMemo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import { Bell, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi";
import BackButton from "../../components/common/BackButton.jsx";
import { formatDate, unwrapList } from "./farmerUtils.js";
import {
  getNotificationIcon, getNotificationStyle, FARMER_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, normalizeCategory,
} from "../../config/notificationConfig.js";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";

export default function FarmerNotifications() {
  const navigate = useNavigate();
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

  const goToNotification = async (notification) => {
    await markRead(notification);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.orderNumber || notification.orderId) {
      const orderReference = notification.orderNumber || notification.orderId;
      navigate(`/farmer/orders?search=${encodeURIComponent(orderReference)}`);
    } else if (notification.resourceType === "Product" && notification.resourceId) {
      navigate(`/farmer/products?search=${encodeURIComponent(notification.resourceId)}`);
    }
  };

  return (
    <section className="w-full min-w-0 space-y-4 pb-5 text-[13px] text-[#26352B]">
      <BackButton fallback="/farmer/dashboard" />
      <motion.header
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Notifications</h1>
          <p className="mt-1 text-xs text-[#71817D]">Stay updated about your orders, products, inventory, offers, and farm activities.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#C9DCD4] px-3 text-xs font-medium text-[#245C3A] transition hover:bg-[#EAF2E7] sm:w-auto"><Bell size={14} /> Mark all read <span className="rounded-full bg-[#EAF2E7] px-1.5 py-0.5 text-[10px]">{unreadCount}</span></button>
        )}
      </motion.header>

      <motion.nav
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        aria-label="Notification categories"
        className="flex max-w-full min-w-0 gap-1.5 overflow-x-auto rounded-xl border border-[#E5ECE8] bg-white p-2 scrollbar-hide"
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
                  ? "border-[#245C3A] bg-[#245C3A] text-white"
                  : "border-transparent text-[#475852] hover:border-[#D9E7DE] hover:bg-[#EAF2E7]"
              }`}
            >
              {cat === "all" ? <Bell aria-hidden="true" className="h-3.5 w-3.5" /> : <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
              <span>{CATEGORY_LABELS[cat]}</span>
              {count > 0 && <span className={`min-w-4 rounded-full px-1 text-center text-[9px] leading-4 ${category === cat ? "bg-white/20 text-white" : "bg-[#EAF2E7] text-[#245C3A]"}`}>{count}</span>}
            </motion.button>
          );
        })}
      </motion.nav>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="min-w-0 overflow-hidden rounded-xl border border-[#E7EEEC] bg-white"
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
                  <div className={`flex min-w-0 items-start gap-3 border-l-4 px-3 py-3.5 sm:px-4 ${notification.isRead ? "border-l-transparent bg-white" : "border-l-[#477A4E] bg-[#F5F9F3]"}`}>
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.background} ${style.color}`}><Icon size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <h2 className={`min-w-0 break-words text-xs ${notification.isRead ? "font-medium text-[#475852]" : "font-semibold text-[#253933]"}`}>
                          <button type="button" aria-label={`Open ${notification.title || "notification"}`} onClick={() => goToNotification(notification)} className="text-left hover:text-[#245C3A] focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#477A4E]">{notification.title || "Farm update"}</button>
                        </h2>
                        <time className="shrink-0 whitespace-nowrap text-[10px] text-[#8A9692]" dateTime={notification.createdAt}>{formatDate(notification.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time>
                      </div>
                      <p className="mt-1 break-words text-[11px] leading-relaxed text-[#71817D] [overflow-wrap:anywhere]">{notification.message || "You have a new update."}</p>
                      {notification.orderNumber && !String(notification.message || "").includes(String(notification.orderNumber)) && (
                        <p className="mt-1 text-[10px] font-semibold text-[#477A4E]">Order #{notification.orderNumber}</p>
                      )}
                      {notification.productName && <p className="mt-1 break-words text-[10px] font-medium text-[#477A4E]">{notification.productName}</p>}
                      {notification.resourceType === "Product" && notification.resourceId && (
                        <ProductIdentifier productId={notification.resourceId} compact className="mt-1 flex" />
                      )}
                      <span className={`mt-1 inline-block text-[9px] font-semibold uppercase tracking-wider ${notification.isRead ? "text-gray-400" : "text-[#245C3A]"}`}>
                        {CATEGORY_LABELS[normalizeCategory(notification)] || CATEGORY_LABELS[notification.category] || "Update"}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!notification.isRead && (
                        <button type="button" aria-label={`Mark ${notification.title || "notification"} as read`} onClick={() => markRead(notification)} className="h-2.5 w-2.5 rounded-full bg-[#477A4E] ring-2 ring-[#EAF2E7] hover:ring-4" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => remove(notification, e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E8E6] bg-white text-[#64716B] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${notification.title || "notification"}`}
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <motion.div variants={sectionReveal} initial="hidden" animate="visible" className="px-4 py-12 text-center">
            <Bell className="mx-auto h-7 w-7 text-[#A5B3AE]" />
            <p className="mt-2 text-xs font-medium text-[#52615D]">{category === "all" ? "You're all caught up!" : `No ${({ orders: "order", offers: "offer", products: "product", inventory: "inventory", certifications: "certification", messages: "message", support: "support", account: "account" }[category] || "other")} notifications available.`}</p>
            <p className="mt-1 text-[11px] text-[#899691]">{category === "all" ? "New updates will appear here." : "Choose another category to view more updates."}</p>
          </motion.div>
        )}
      </motion.div>

      {filtered.length > PAGE_SIZE && (
        <motion.div variants={sectionReveal} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-xs text-[#475852]">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} notifications · Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-[#E5ECE8] px-2 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F6FAF8]"
            >
              Prev
            </button>
            <button
              type="button"
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
