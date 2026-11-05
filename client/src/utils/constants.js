export const formatCurrency = (n, unit) => `₹ ${Number(n).toLocaleString("en-IN")}${unit ? " / " + unit : ""}`;
export const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "";
export const haversine = (a,b) => {
  const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};
export const CATEGORIES = ["Vegetables","Fruits","Grains & Pulses","Dairy & Eggs","Spices & Herbs","Eco Friendly","Others"];

export const CATEGORY_STYLE_MAP = {
  "Vegetables": { icon: "Leaf", color: "#2E8B57" },
  "Fruits": { icon: "Apple", color: "#E76F51" },
  "Grains & Pulses": { icon: "Wheat", color: "#D4A017" },
  "Dairy & Eggs": { icon: "Truck", color: "#4A90C2" },
  "Spices & Herbs": { icon: "Leaf", color: "#D97732" },
  "Eco Friendly": { icon: "Recycle", color: "#269B83" },
  "Others": { icon: "Package", color: "#6B7280" },
};

export function getCategoryStyle(name) {
  return CATEGORY_STYLE_MAP[name] || { icon: "Package", color: "#6B7280" };
}

export const STATUS_COLORS = {
  "Order Placed": "bg-[#DBEAFE] text-[#1D4ED8]",
  "Pending": "bg-[#DBEAFE] text-[#1D4ED8]",
  "Packed": "bg-[#EDE9FE] text-[#6D28D9]",
  "Out for Delivery": "bg-[#FFEDD5] text-[#C2410C]",
  "Delivered": "bg-[#DCFCE7] text-[#15803D]",
  "Delivery Failed": "bg-[#FEE2E2] text-[#B91C1C]",
  "Cancelled": "bg-[#F3F4F6] text-[#4B5563]",
  "In Transit": "bg-[#DBEAFE] text-[#1D4ED8]",
  "Shipped": "bg-[#FFEDD5] text-[#C2410C]",
  "Processing": "bg-[#EDE9FE] text-[#6D28D9]",
  "Active": "bg-[#DCFCE7] text-[#15803D]",
  "Low Stock": "bg-[#FEE2E2] text-[#B91C1C]",
  "Reorder": "bg-[#FFEDD5] text-[#C2410C]",
};
