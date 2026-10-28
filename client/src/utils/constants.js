export const formatCurrency = (n, unit) => `₹ ${Number(n).toLocaleString("en-IN")}${unit ? " / " + unit : ""}`;
export const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "";
export const haversine = (a,b) => {
  const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};
export const CATEGORIES = ["Vegetables","Fruits","Grains & Pulses","Dairy & Eggs","Spices & Herbs","Eco Friendly","Others"];
export const STATUS_COLORS = {
  "Delivered": "bg-green-100 text-green-700",
  "In Transit": "bg-blue-100 text-blue-700",
  "Shipped": "bg-blue-100 text-blue-700",
  "Pending": "bg-orange-100 text-orange-700",
  "Processing": "bg-amber-100 text-amber-700",
  "In Progress": "bg-amber-100 text-amber-700",
  "Active": "bg-green-100 text-green-700",
  "Low Stock": "bg-red-100 text-red-700",
  "Reorder": "bg-orange-100 text-orange-700",
};
