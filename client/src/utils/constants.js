export const formatCurrency = (n, unit) => `₹ ${Number(n).toLocaleString("en-IN")}${unit ? " / " + unit : ""}`;
export const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "";
export const haversine = (a,b) => {
  const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};
export const CATEGORIES = ["Vegetables","Fruits","Grains & Pulses","Dairy & Eggs","Spices & Herbs","Eco Friendly","Dry Fruits & Nuts","Seeds & Superfoods","Edible Oils","Honey & Natural Sweeteners","Mushrooms & Specialty Produce","Flours & Flour Products","Others"];

import {
  Sprout, Apple, Wheat, Milk, Leaf, Recycle, Nut, Vegan, Droplet, Droplets,
  Cherry, Package, ChefHat, Coffee, Egg, Fish, Flame, Pizza, Sandwich, Soup,
  Star, TreePine, Wine,
} from "lucide-react";

export const ICON_ALLOWLIST = [
  "Sprout", "Apple", "Wheat", "Milk", "Leaf", "Recycle", "Nut", "Vegan",
  "Droplet", "Droplets", "Cherry", "Package", "ChefHat", "Coffee", "Egg",
  "Fish", "Flame", "Pizza", "Sandwich", "Soup", "Star", "TreePine", "Wine",
];

export const ICON_COMPONENT_MAP = {
  Sprout, Apple, Wheat, Milk, Leaf, Recycle, Nut, Vegan, Droplet, Droplets,
  Cherry, Package, ChefHat, Coffee, Egg, Fish, Flame, Pizza, Sandwich, Soup,
  Star, TreePine, Wine,
};

export const DEFAULT_ICON_KEY = "Package";
export const ICON_COLOR = "#245C3A";

export function isValidIconKey(key) {
  return typeof key === "string" && ICON_ALLOWLIST.includes(key);
}

export function getIconComponent(iconKey) {
  if (!isValidIconKey(iconKey)) return ICON_COMPONENT_MAP[DEFAULT_ICON_KEY];
  return ICON_COMPONENT_MAP[iconKey] || ICON_COMPONENT_MAP[DEFAULT_ICON_KEY];
}

export const CATEGORY_STYLE_MAP = {
  "Vegetables": { icon: "Sprout", color: "#245C3A" },
  "Fruits": { icon: "Apple", color: "#245C3A" },
  "Grains & Pulses": { icon: "Wheat", color: "#245C3A" },
  "Dairy & Eggs": { icon: "Milk", color: "#245C3A" },
  "Spices & Herbs": { icon: "Leaf", color: "#245C3A" },
  "Eco Friendly": { icon: "Recycle", color: "#245C3A" },
  "Dry Fruits & Nuts": { icon: "Nut", color: "#245C3A" },
  "Seeds & Superfoods": { icon: "Vegan", color: "#245C3A" },
  "Edible Oils": { icon: "Droplet", color: "#245C3A" },
  "Honey & Natural Sweeteners": { icon: "Droplets", color: "#245C3A" },
  "Mushrooms & Specialty Produce": { icon: "Cherry", color: "#245C3A" },
  "Flours & Flour Products": { icon: "Wheat", color: "#245C3A" },
  "Others": { icon: "Package", color: "#6B7280" },
};

export function getDefaultIconKey(name) {
  const match = CATEGORY_STYLE_MAP[String(name).trim()];
  return match ? match.icon : DEFAULT_ICON_KEY;
}

export function resolveIconKey(category) {
  if (category && category.icon && isValidIconKey(category.icon)) {
    return category.icon;
  }
  if (category && category.name) {
    return getDefaultIconKey(category.name);
  }
  return DEFAULT_ICON_KEY;
}

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
