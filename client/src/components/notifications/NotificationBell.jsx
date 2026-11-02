import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Bell } from "lucide-react";
import { setUnread } from "../../features/notifications/notificationsSlice.js";
import notificationApi from "../../api/notificationApi";

export default function NotificationItem({ n, onMarkRead }) {
  const handleClick = async () => {
    if (n.isRead) return;
    try {
      await notificationApi.markRead(n._id);
      onMarkRead(n._id);
    } catch (e) {
      // ignore individual mark-read failures in the bell dropdown
    }
  };
  return (
    <div
      onClick={handleClick}
      className={`p-3 border-b border-border text-sm cursor-pointer hover:bg-gray-50 ${n.isRead ? "text-gray-500" : "font-medium text-gray-900"}`}
    >
      <div className="flex justify-between items-baseline gap-2">
        <span className="font-semibold">{n.title}</span>
        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("en-IN")}</span>
      </div>
      <div className="mt-1 text-[11px] text-gray-600">{n.message}</div>
    </div>
  );
}

export function NotificationBell({ count }) {
  const unread = useSelector((s) => s.notifications?.unread ?? 0);
  const actualCount = count != null ? count : unread;
  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {actualCount > 0 && <span className="absolute -top-1 -right-1 bg-[#16A36A] text-white text-[10px] rounded-full px-1">{actualCount}</span>}
    </div>
  );
}

export function NotificationDropdown({ items, onMarkRead, onMarkAllRead }) {
  if (!items.length) {
    return <div className="p-4 text-center text-xs text-gray-500">No notifications</div>;
  }
  return (
    <div className="absolute right-0 top-8 bg-card border border-border rounded-card shadow-card w-80 max-h-96 overflow-y-auto z-50">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-900">Notifications</span>
        {items.some((n) => !n.isRead) && (
          <button onClick={onMarkAllRead} className="text-xs text-primary underline">Mark all as read</button>
        )}
      </div>
      {items.map((n) => (
        <NotificationItem key={n._id} n={n} onMarkRead={onMarkRead} />
      ))}
    </div>
  );
}
