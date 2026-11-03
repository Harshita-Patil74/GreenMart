import React from "react";

export const ORDER_STATUS_COLORS = {
  "Order Placed": "bg-[#DBEAFE] text-[#1D4ED8]",
  Pending: "bg-[#DBEAFE] text-[#1D4ED8]",
  Packed: "bg-[#EDE9FE] text-[#6D28D9]",
  "Out for Delivery": "bg-[#FFEDD5] text-[#C2410C]",
  Delivered: "bg-[#DCFCE7] text-[#15803D]",
  "Delivery Failed": "bg-[#FEE2E2] text-[#B91C1C]",
  Cancelled: "bg-[#F3F4F6] text-[#4B5563]",
};

const UNKNOWN_STATUS_COLORS = "bg-[#F3F4F6] text-[#4B5563]";

export const getOrderStatusColors = (status) => {
  const key = String(status || "").trim();
  return ORDER_STATUS_COLORS[key] ?? UNKNOWN_STATUS_COLORS;
};

export default function OrderStatusBadge({ status, className }) {
  const key = String(status || "").trim();
  const colors = ORDER_STATUS_COLORS[key] ?? UNKNOWN_STATUS_COLORS;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${colors} ${className || ""}`}
    >
      {key || "—"}
    </span>
  );
}
