export const formatCurrency = (n, unit) => `₹ ${Number(n).toLocaleString("en-IN")}${unit ? " / " + unit : ""}`;
export const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "";
export const haversine = (a,b) => {
  const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};
export const CATEGORIES = ["Vegetables","Fruits","Grains & Pulses","Dairy & Eggs","Spices & Herbs","Eco Friendly","Others"];
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
