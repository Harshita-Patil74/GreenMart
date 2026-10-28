import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Bell, Check, MessageSquare, PackageCheck, ShoppingBag, Star } from "lucide-react";
import toast from "react-hot-toast";
import notificationApi from "../../api/notificationApi";
import BackButton from "../../components/common/BackButton.jsx";
import { formatDate } from "./farmerUtils";

function notificationStyle(type = "") {
  const value = type.toLowerCase();
  if (value.includes("order") && !value.includes("status")) return { icon: ShoppingBag, color: "text-blue-600", background: "bg-blue-50" };
  if (value.includes("status")) return { icon: PackageCheck, color: "text-blue-600", background: "bg-blue-50" };
  if (value.includes("stock")) return { icon: AlertTriangle, color: "text-amber-600", background: "bg-amber-50" };
  if (value.includes("review")) return { icon: Star, color: "text-emerald-600", background: "bg-emerald-50" };
  if (value.includes("cert")) return { icon: BadgeCheck, color: "text-emerald-600", background: "bg-emerald-50" };
  if (value.includes("message")) return { icon: MessageSquare, color: "text-orange-600", background: "bg-orange-50" };
  return { icon: Bell, color: "text-slate-600", background: "bg-slate-100" };
}

export default function FarmerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await notificationApi.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't load your notifications.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadNotifications(); }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

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

  return (
    <section className="mx-auto max-w-4xl space-y-4 pb-5 text-[13px] text-[#20312E]">
      <BackButton fallback="/farmer/dashboard" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Notifications</h1>
          <p className="mt-1 text-xs text-[#71817D]">Updates about orders, your products, and farm activity.</p>
        </div>
        {unreadCount > 0 && <button type="button" onClick={markAllRead} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#C9DCD4] px-3 text-xs font-medium text-[#087449] hover:bg-white"><Check size={14} /> Mark all read</button>}
      </header>

      <div className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
        {error ? (
          <div role="alert" className="p-8 text-center text-sm text-[#6A7773]">
            <p>{error}</p><button type="button" onClick={loadNotifications} className="mt-3 font-semibold text-[#07814E]">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-xs text-[#778681]">Loading notifications…</div>
        ) : notifications.length ? (
          <ul className="divide-y divide-[#EDF1F0]">
            {notifications.map((notification) => {
              const style = notificationStyle(notification.type);
              const Icon = style.icon;
              return (
                <li key={notification._id}>
                  <div className={`flex items-start gap-3 px-4 py-3.5 ${notification.isRead ? "bg-white" : "bg-[#F6FAF8]"}`}>
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.background} ${style.color}`}><Icon size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <h2 className={`text-xs ${notification.isRead ? "font-medium text-[#475852]" : "font-semibold text-[#253933]"}`}>{notification.title || "Farm update"}</h2>
                        <time className="whitespace-nowrap text-[10px] text-[#8A9692]" dateTime={notification.createdAt}>{formatDate(notification.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#71817D]">{notification.message || "You have a new update."}</p>
                    </div>
                    {!notification.isRead && (
                      <button type="button" aria-label={`Mark ${notification.title || "notification"} as read`} onClick={() => markRead(notification)} className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0A9A60] ring-2 ring-[#DDF3E9] hover:ring-4" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-12 text-center">
            <Bell className="mx-auto h-7 w-7 text-[#A5B3AE]" />
            <p className="mt-2 text-xs font-medium text-[#52615D]">You're all caught up</p>
            <p className="mt-1 text-[11px] text-[#899691]">New updates will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
