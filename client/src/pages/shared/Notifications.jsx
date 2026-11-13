import React, { useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { sectionReveal, staggerContainer, staggerItem } from "../../animations/variants.js";
import notificationApi from "../../api/notificationApi";
import BackButton from "../../components/common/BackButton.jsx";
import { fetchNotifications, fetchUnreadCount, markAllRead as markAllReadAction, markRead as markReadAction, removeNotification as removeNotificationAction } from "../../features/notifications/notificationsSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import {
  getNotificationIcon, getNotificationStyle, CUSTOMER_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS,
} from "../../config/notificationConfig.js";
import { Bell } from "lucide-react";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";

export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error, pagination } = useSelector((s) => s.notifications || { items: [], loading: false, error: null, pagination: null });
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(() => {
    dispatch(fetchNotifications({ category, page, limit: PAGE_SIZE }));
    dispatch(fetchUnreadCount());
  }, [dispatch, category, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [category]);

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      dispatch(markReadAction(id));
      dispatch(fetchUnreadCount());
    } catch (e) {
      // handled by toast in component if needed
    }
  };

  const remove = async (id) => {
    try {
      await notificationApi.remove(id);
      dispatch(removeNotificationAction(id));
      dispatch(fetchUnreadCount());
    } catch (e) {
      // handled by toast
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      dispatch(markAllReadAction());
      dispatch(fetchUnreadCount());
    } catch (e) {
      // handled
    }
  };

  const goToNotification = (n) => {
    if (n.orderId) navigate(`/orders/${n.orderId}`);
    if (n.actionUrl) navigate(n.actionUrl);
    if (!n.isRead) markRead(n._id);
  };

  const filtered = items.filter((n) => {
    if (category === "all") return true;
    return String(n.category || "").toLowerCase() === category;
  });

  const total = pagination?.total ?? filtered.length;
  const totalPages = pagination?.pages ?? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const unreadCount = items.filter((n) => !n.isRead).length;

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-10 text-xs text-gray-500">
      Loading notifications…
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <BackButton fallback="/" />
      <motion.header
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Notifications</h1>
          <p className="mt-1 text-xs text-[#71817D]">Updates about your orders and account activity.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAll} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#C9DCD4] px-3 text-xs font-medium text-[#087449] hover:bg-white">
            Mark all read
          </button>
        )}
      </motion.header>

      <motion.nav
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        aria-label="Notification categories"
        className="flex min-w-0 gap-1.5 overflow-x-auto rounded-xl border border-[#E5ECE8] bg-white p-2 scrollbar-hide"
      >
        {CUSTOMER_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Bell;
          const unread = cat === "all" ? unreadCount : filtered.filter((n) => !n.isRead && String(n.category || "").toLowerCase() === cat).length;
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
              {unread > 0 && <span className={`min-w-4 rounded-full px-1 text-center text-[9px] leading-4 ${category === cat ? "bg-white/20 text-white" : "bg-[#EAF6ED] text-[#087449]"}`}>{unread}</span>}
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
        {currentPageItems.length ? (
          <ul className="divide-y divide-[#EDF1F0]" variants={staggerContainer} initial="hidden" animate="visible">
            {currentPageItems.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const style = getNotificationStyle(notification.type);
              return (
                <motion.li
                  key={notification._id}
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                >
                  <div className={`flex items-start gap-3 px-4 py-3.5 ${notification.isRead ? "bg-white" : "bg-[#F6FAF8]"}`}>
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.background} ${style.color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => goToNotification(notification)}>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <h2 className={`text-xs ${notification.isRead ? "font-medium text-[#475852]" : "font-semibold text-[#253933]"}`}>
                          {notification.title || "Order update"}
                        </h2>
                        <time className="whitespace-nowrap text-[10px] text-[#8A9692]" dateTime={notification.createdAt}>
                          {new Date(notification.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        </time>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#71817D]">{notification.message || "You have a new update."}</p>
                      {notification.resourceType === "Product" && notification.resourceId && (
                        <ProductIdentifier productId={notification.resourceId} compact className="mt-1 flex" />
                      )}
                      <span className={`text-[9px] font-semibold uppercase tracking-wider ${notification.isRead ? "text-gray-400" : "text-[#087449]"}`}>
                        {CATEGORY_LABELS[notification.category] || "Update"}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <button type="button" aria-label={`Mark ${notification.title || "notification"} as read`} onClick={(e) => { e.stopPropagation(); markRead(notification._id); }} className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0A9A60] ring-2 ring-[#DDF3E9] hover:ring-4" />
                    )}
                    {notification.category === "newsletter" && (
                      <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); goToNotification(notification); markRead(notification._id); }} className="h-7 min-w-[fit-content] items-center gap-1 rounded-md border border-[#C9DCD4] bg-white px-2 text-[10px] text-[#087449] hover:bg-[#F3FAF5]">
                          View Newsletter
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); remove(notification._id); }} className="h-7 min-w-[fit-content] items-center gap-1 rounded-md border border-[#E5E8E6] bg-white px-2 text-[10px] text-[#64716B] hover:border-red-200 hover:text-red-700">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            className="px-4 py-12 text-center"
          >
            <span className="mx-auto h-7 w-7 text-[#A5B3AE]">🔔</span>
            <p className="mt-2 text-xs font-medium text-[#52615D]">You're all caught up</p>
            <p className="mt-1 text-[11px] text-[#899691]">New updates will appear here.</p>
          </motion.div>
        )}
      </motion.div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 text-xs text-[#475852]">
          <span>Total Notifications: {total}</span>
          <div className="flex items-center gap-1">
            <span className="mr-2">Page {page} of {totalPages}</span>
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
        </div>
      )}
    </div>
  );
}
