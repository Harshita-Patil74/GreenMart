export const toId = (value) => {
  if (!value) return "";
  return String(typeof value === "object" ? value._id || value.id || "" : value);
};

export const getOwnedItems = (order, farmerId) =>
  (order?.items || []).filter((item) => toId(item.farmer) === toId(farmerId));

export const getOrderAmount = (order, farmerId) =>
  getOwnedItems(order, farmerId).reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
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
  const value = String(status || "").toLowerCase();
  if (value.includes("cancel")) return "border-red-200 bg-red-50 text-red-700";
  if (value.includes("deliver")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value.includes("ship") || value.includes("out for")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (value.includes("pack")) return "border-violet-200 bg-violet-50 text-violet-700";
  if (value === "inactive") return "border-slate-200 bg-slate-50 text-slate-600";
  if (value.includes("active") || value.includes("in stock")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value.includes("out of stock")) return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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
