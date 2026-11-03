export const toId = (value) => {
  if (!value) return "";
  return String(typeof value === "object" ? value._id || value.id || "" : value);
};

export const getOwnedItems = (order, farmerId) =>
  (order?.items || []).filter((item) => toId(item.farmer) === toId(farmerId));

export const getOrderAmount = (order, farmerId) =>
  getOwnedItems(order, farmerId).reduce(
    (total, item) => total + Number(
      item.offerSnapshot?.finalLineTotal ?? Number(item.price || 0) * Number(item.quantity || 0)
    ),
    0
  );

export const getOrderStatus = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "order placed" || value === "pending") return "Pending";
  if (value === "out for delivery" || value === "shipped") return "Shipped";
  if (value === "packed" || value === "delivered" || value === "cancelled") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return status || "Pending";
};

export const getStatusClasses = (status) => {
  const key = String(status || "").trim();
  const colorMap = {
    "Order Placed": "border-blue-200 bg-[#DBEAFE] text-[#1D4ED8]",
    Pending: "border-blue-200 bg-[#DBEAFE] text-[#1D4ED8]",
    Packed: "border-purple-200 bg-[#EDE9FE] text-[#6D28D9]",
    "Out for Delivery": "border-orange-200 bg-[#FFEDD5] text-[#C2410C]",
    Shipped: "border-orange-200 bg-[#FFEDD5] text-[#C2410C]",
    Delivered: "border-green-200 bg-[#DCFCE7] text-[#15803D]",
    "Delivery Failed": "border-red-200 bg-[#FEE2E2] text-[#B91C1C]",
    Cancelled: "border-gray-200 bg-[#F3F4F6] text-[#4B5563]",
  };
  return colorMap[key] ?? "border-gray-200 bg-[#F3F4F6] text-[#4B5563]";
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

export const formatDate = (date, options = { day: "numeric", month: "short", year: "numeric" }) => {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-IN", options);
};

export const unwrapList = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
