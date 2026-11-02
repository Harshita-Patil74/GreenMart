import React, { useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi";
import BackButton from "../../components/common/BackButton.jsx";
import { fetchNotifications, fetchUnreadCount, markAllRead as markAllReadAction, markRead as markReadAction } from "../../features/notifications/notificationsSlice.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { Link } from "react-router-dom";

export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useSelector((s) => s.notifications || { items: [], loading: false, error: null });

  const load = useCallback(() => {
    dispatch(fetchNotifications());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      dispatch({ type: "notifications/markRead", payload: id });
      dispatch(fetchUnreadCount());
    } catch (e) {
      // handled by toast in component if needed
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

  const goToOrder = (orderId) => {
    if (orderId) navigate(`/orders/${orderId}`);
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-10 text-xs text-gray-500">
      Loading notifications…
    </div>
  );

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-2">
      <BackButton fallback="/" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172A27]">Notifications</h1>
          <p className="mt-1 text-xs text-[#71817D]">Updates about your orders and account activity.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAll} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#C9DCD4] px-3 text-xs font-medium text-[#087449] hover:bg-white">
            Mark all read
          </button>
        )}
      </header>

      <div className="overflow-hidden rounded-lg border border-[#E7EEEC] bg-white shadow-[0_2px_8px_rgba(25,55,47,0.04)]">
        {items.length ? (
          <ul className="divide-y divide-[#EDF1F0]">
            {items.map((notification) => (
              <li key={notification._id}>
                <div className={`flex items-start gap-3 px-4 py-3.5 ${notification.isRead ? "bg-white" : "bg-[#F6FAF8]"}`}>
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <span className="text-[15px]">📦</span>
                  </div>
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => goToOrder(notification.orderId)}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <h2 className={`text-xs ${notification.isRead ? "font-medium text-[#475852]" : "font-semibold text-[#253933]"}`}>
                        {notification.title || "Order update"}
                      </h2>
                      <time className="whitespace-nowrap text-[10px] text-[#8A9692]" dateTime={notification.createdAt}>
                        {new Date(notification.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </time>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#71817D]">{notification.message || "You have a new update."}</p>
                  </div>
                  {!notification.isRead && (
                    <button type="button" aria-label={`Mark ${notification.title || "notification"} as read`} onClick={(e) => { e.stopPropagation(); markRead(notification._id); }} className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0A9A60] ring-2 ring-[#DDF3E9] hover:ring-4" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto h-7 w-7 text-[#A5B3AE]">🔔</span>
            <p className="mt-2 text-xs font-medium text-[#52615D]">You're all caught up</p>
            <p className="mt-1 text-[11px] text-[#899691]">New updates will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
