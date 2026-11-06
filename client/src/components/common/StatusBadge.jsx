import React from "react";

// Centralized status -> color mapping used across Farmer and Admin dashboards.
// Keys are matched case-insensitively so backend values display consistently.
// Unknown / unexpected values fall back to a neutral gray badge.
export const STATUS_COLORS = {
  // Stock / availability states
  "in stock": "bg-green-100 text-green-800",
  "low stock": "bg-amber-100 text-amber-800",
  "out of stock": "bg-red-100 text-red-800",

  // Product lifecycle states
  active: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-700",

  // Offer lifecycle states
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-red-100 text-red-800",
  scheduled: "bg-blue-100 text-blue-800",
  upcoming: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-700",

  // Offer type styles
  "percentage discount": "bg-purple-100 text-purple-800",
  "fixed amount discount": "bg-blue-100 text-blue-800",
  "seasonal offer": "bg-teal-100 text-teal-800",
  "farmer special": "bg-purple-100 text-purple-800",
  "limited-time deal": "bg-blue-100 text-blue-800",
  "bundle offer": "bg-teal-100 text-teal-800",
};

const UNKNOWN_STATUS_COLORS = "bg-gray-100 text-gray-700";

export const getStatusColors = (status) => {
  const key = String(status || "").trim().toLowerCase();
  return STATUS_COLORS[key] ?? UNKNOWN_STATUS_COLORS;
};

export default function StatusBadge({ status, className }) {
  const key = String(status || "").trim();
  const colors = getStatusColors(key);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${colors} ${className || ""}`}
    >
      {key || "—"}
    </span>
  );
}
