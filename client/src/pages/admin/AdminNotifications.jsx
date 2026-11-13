import React, { useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import notificationApi from "../../api/notificationApi";
import BackButton from "../../components/common/BackButton.jsx";
import { fetchNotifications, fetchUnreadCount, markAllRead as markAllReadAction, markRead as markReadAction, removeNotification as removeNotificationAction } from "../../features/notifications/notificationsSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { Bell, Package, Users, Boxes, AlertCircle, FileText, ShieldAlert, BadgePercent, Link as LinkIcon, Trash2, Check, Wallet } from "lucide-react";
import Pagination from "../../components/common/Pagination.jsx";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";

const CATEGORY_ICONS = {
  orders: Package,
  farmers: Users,
  products: Boxes,
  inventory: AlertCircle,
  offers: BadgePercent,
  support: FileText,
  reviews: FileText,
  security: ShieldAlert,
  subscription_payments: Wallet,
};

const CATEGORY_LABELS = {
  orders: "Orders",
  farmers: "Farmers",
  products: "Products",
  inventory: "Inventory",
  offers: "Offers",
  support: "Support",
  reviews: "Reviews",
  security: "Security",
  subscription_payments: "Subscription Payments",
};

const ALL_CATEGORIES = ["all", "orders", "farmers", "products", "inventory", "offers", "support", "reviews", "security", "subscription_payments"];

function categoryKey(category) {
  return String(category || "").trim().toLowerCase();
}

function categoryLabel(category) {
  const key = categoryKey(category);
  return CATEGORY_LABELS[key] || (key ? key[0].toUpperCase() + key.slice(1) : "General");
}

function routeForNotification(n) {
  const type = n.type || "";
  const resourceId = n.resourceId || n.orderId;
  switch (type) {
    case "newOrderAdmin":
    case "orderStatusAdmin":
      return `/admin/orders`;
    case "newFarmerAdmin":
    case "farmerVerifiedAdmin":
    case "farmerRejectedAdmin":
    case "farmerStatusAdmin":
      return `/admin/farmers`;
    case "newProductAdmin":
    case "productDeletedAdmin":
      return `/admin/products`;
    case "stockAlert":
      return `/admin/inventory`;
    case "newOfferAdmin":
    case "offerApproved":
    case "offerRejected":
    case "offerDeactivated":
      return "/admin/offers";
    case "newContactAdmin":
      return `/admin/orders`;
    case "newsletter_subscription_payment_success":
    case "newsletter_subscription_payment_failed":
    case "newsletter_subscription_expired":
      return "/admin/notifications?category=subscription_payments";
    case "newReviewAdmin":
      return `/admin/products`;
    default:
      return null;
  }
}

export default function AdminNotifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useSelector((s) => s.notifications || { items: [], loading: false, error: null });
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(() => {
    dispatch(fetchNotifications());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markRead(id);
      dispatch(markReadAction(id));
      dispatch(fetchUnreadCount());
    } catch (error) {
      toast.error(error?.message || "Couldn't mark this notification as read.");
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      dispatch(markAllReadAction());
      dispatch(fetchUnreadCount());
      toast.success("All notifications marked as read.");
    } catch (error) {
      toast.error(error?.message || "Couldn't mark notifications as read.");
    }
  };

  const remove = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.remove(id);
      dispatch(removeNotificationAction(id));
      dispatch(fetchUnreadCount());
      toast.success("Notification deleted.");
    } catch (error) {
      toast.error(error?.message || "Couldn't delete this notification.");
    }
  };

  const goToNotification = (n) => {
    const path = routeForNotification(n);
    if (path) navigate(path);
    if (!n.isRead) {
      markRead(n._id);
    }
  };

  const filtered = items.filter((n) => {
    if (category === "all") return true;
    return categoryKey(n.category) === category;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const unreadCount = items.filter((n) => !n.isRead).length;
  const unreadByCategory = items.reduce((counts, notification) => {
    if (!notification.isRead) {
      const key = categoryKey(notification.category);
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, {});
  const todayCount = items.filter((n) => {
    const d = new Date(n.createdAt);
    const today = new Date();
    return !Number.isNaN(d.getTime()) && d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-4 pb-8">
      <BackButton fallback="/admin/dashboard" />
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Notifications</h1>
          <p className="mt-1 text-xs text-[#71817D]">Updates about orders, farmers, products and platform activity.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAll} className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-[#C9DCD4] bg-white px-3 text-xs font-medium text-[#087449] hover:bg-[#F3FAF5]">
            <Check aria-hidden="true" className="h-3.5 w-3.5" /> Mark All Read
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border border-[#E5ECE8] bg-white p-3 sm:p-4">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[#8A9692] sm:text-[10px]">Total Notifications</div>
          <div className="mt-1 text-lg font-semibold text-[#172A27]">{items.length}</div>
        </div>
        <div className="rounded-xl border border-[#E5ECE8] bg-white p-3 sm:p-4">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[#8A9692] sm:text-[10px]">Unread Notifications</div>
          <div className="mt-1 text-lg font-semibold text-[#087449]">{unreadCount}</div>
        </div>
        <div className="col-span-2 rounded-xl border border-[#E5ECE8] bg-white p-3 sm:col-span-1 sm:p-4">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[#8A9692] sm:text-[10px]">Today</div>
          <div className="mt-1 text-lg font-semibold text-[#172A27]">{todayCount}</div>
        </div>
      </div>

      <nav aria-label="Notification categories" className="flex min-w-0 gap-1.5 overflow-x-auto rounded-xl border border-[#E5ECE8] bg-white p-2 scrollbar-hide">
        {ALL_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Bell;
          const unread = cat === "all" ? unreadCount : unreadByCategory[cat] || 0;
          return (
            <button
              key={cat}
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
              <span>{cat === "all" ? "All" : CATEGORY_LABELS[cat]}</span>
              {unread > 0 && <span className={`min-w-4 rounded-full px-1 text-center text-[9px] leading-4 ${category === cat ? "bg-white/20 text-white" : "bg-[#EAF6ED] text-[#087449]"}`}>{unread}</span>}
            </button>
          );
        })}
      </nav>

      <section aria-label="Notification list" className="min-w-0 overflow-hidden rounded-xl border border-[#E7EEEC] bg-white">
        {error ? (
          <div className="p-5"><ErrorState message={error} onRetry={load} /></div>
        ) : loading ? (
          <div aria-live="polite" className="p-10 text-center text-xs text-[#778681]">Loading notifications…</div>
        ) : filtered.length ? (
          <ul className="divide-y divide-[#EDF1F0]">
            {currentPageItems.map((notification) => {
              const key = categoryKey(notification.category);
              const Icon = CATEGORY_ICONS[key] || Bell;
              const path = routeForNotification(notification);
              return (
                <li key={notification._id} className={notification.isRead ? "bg-white" : "bg-[#F6FAF8]"}>
                  <article className="flex min-w-0 items-start gap-3 px-3 py-3.5 sm:px-4">
                    <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F2EF] text-[#087449]">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {!notification.isRead && <span aria-label="Unread" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#16803C]" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <button
                          type="button"
                          onClick={() => goToNotification(notification)}
                          className={`min-w-0 break-words text-left text-xs ${notification.isRead ? "font-medium text-[#475852]" : "font-semibold text-[#253933]"}`}
                        >
                          {notification.title || "Update"}
                        </button>
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium ${notification.isRead ? "bg-[#EEF1EF] text-[#64716B]" : "bg-[#EAF6ED] text-[#087449]"}`}>
                          {categoryLabel(notification.category)}
                        </span>
                        <span className={`text-[9px] font-medium ${notification.isRead ? "text-[#899691]" : "text-[#16803C]"}`}>
                          {notification.isRead ? "Read" : "Unread"}
                        </span>
                        <time className="text-[10px] text-[#8A9692]" dateTime={notification.createdAt}>
                          {new Date(notification.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        </time>
                        {path && (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); goToNotification(notification); }}
                            aria-label="Open related item"
                            className="min-w-[fit-content] flex items-center gap-1 rounded-md border border-[#E5E8E6] bg-white px-2 py-1 text-[10px] text-[#087449] hover:bg-[#F3FAF5]"
                          >
                            <LinkIcon aria-hidden="true" className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 break-words text-[11px] leading-relaxed text-[#71817D]">{notification.message || "You have a new update."}</p>
                      {notification.resourceType === "Product" && notification.resourceId && (
                        <ProductIdentifier productId={notification.resourceId} compact className="mt-1 flex" />
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {!notification.isRead && (
                          <button
                            type="button"
                            onClick={(event) => markRead(notification._id, event)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#C9DCD4] bg-white px-2 text-[10px] text-[#087449] hover:bg-[#F3FAF5]"
                            aria-label={`Mark ${notification.title || "notification"} as read`}
                          >
                            <Check aria-hidden="true" className="h-3 w-3" /> Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(event) => remove(notification._id, event)}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E5E8E6] bg-white px-2 text-[10px] text-[#64716B] hover:border-red-200 hover:text-red-700"
                          aria-label={`Delete ${notification.title || "notification"}`}
                        >
                          <Trash2 aria-hidden="true" className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-12 text-center">
            <Bell aria-hidden="true" className="mx-auto h-7 w-7 text-[#A5B3AE]" />
            <p className="mt-2 text-xs font-medium text-[#52615D]">{items.length ? "No notifications in this category" : "You're all caught up"}</p>
            <p className="mt-1 text-[11px] text-[#899691]">{items.length ? "Choose another category to view more notifications." : "New updates will appear here."}</p>
          </div>
        )}
      </section>

      {filtered.length > pageSize && (
        <Pagination page={page} pageSize={pageSize} totalRecords={filtered.length} onChange={(nextPage, nextSize) => { setPage(nextPage); if (nextSize) setPageSize(nextSize); }} />
      )}
    </div>
  );
}
