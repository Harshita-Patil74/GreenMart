import React from "react";
export default function NotificationItem({ n }) { return <div className="p-2 border-b border-border text-sm">{n.title}: {n.message}</div>; }
export function NotificationBell({ count }) { return <div className="relative"><span>🔔</span>{count > 0 && <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] rounded-full px-1">{count}</span>}</div>; }
export function NotificationDropdown({ items }) { return <div className="absolute right-0 top-8 bg-card border border-border rounded-card shadow-card w-72 max-h-80 overflow-y-auto">{items.map((n) => <NotificationItem key={n._id} n={n} />)}</div>; }
