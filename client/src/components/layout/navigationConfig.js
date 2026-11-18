import {
  BarChart3,
  Bell,
  Boxes,
  Heart,
  LayoutDashboard,
  Mail,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Tractor,
  Truck,
  User,
  Users,
  MessageCircle,
} from "lucide-react";

// Single source of truth for role-based navigation used by the dashboard sidebar
// (RoleNavigation) and the mobile slide-in drawer (MobileNavigationDrawer).
// Keeps desktop and mobile role-based menus consistent and prevents duplicate
// navigation implementations.
export const navigationByRole = {
  customer: [
    { label: "Customer Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
    { label: "Shop", path: "/shop", icon: ShoppingBag },
    { label: "Offers", path: "/customer/offers", icon: Tag },
    { label: "My Newsletters", path: "/customer/newsletters", icon: Mail },
    { label: "My Orders", path: "/customer/orders", icon: Package },
    { label: "Cart", path: "/cart", icon: ShoppingCart },
    { label: "Wishlist", path: "/customer/wishlist", icon: Heart },
    { label: "Track Order", path: "/track-order", icon: Truck },
    { label: "Notifications", path: "/notifications", icon: Bell },
    { label: "Profile", path: "/customer/profile", icon: User },
  ],
  farmer: [
    { label: "Farmer Dashboard", path: "/farmer/dashboard", icon: LayoutDashboard },
    { label: "Customer Home", path: "/customer/dashboard", icon: Store },
    { label: "My Offers", path: "/farmer/offers", icon: Tag },
    { label: "My Products", path: "/farmer/products", icon: Package },
    { label: "Add Product", path: "/farmer/products/new", icon: Package },
    { label: "Orders", path: "/farmer/orders", icon: ShoppingBag },
    { label: "Inventory", path: "/farmer/inventory-management", icon: Boxes },
    { label: "Notifications", path: "/farmer/notifications", icon: Bell },
    { label: "Profile", path: "/farmer/profile", icon: User },
  ],
  admin: [
    { label: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Notifications", path: "/admin/notifications", icon: Bell },
    { label: "Products", path: "/admin/products", icon: Package },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Farmers", path: "/admin/farmers", icon: Tractor },
    { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
    { label: "Inventory", path: "/admin/inventory", icon: Boxes },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { label: "Reports", path: "/admin/reports", icon: BarChart3 },
    { label: "Newsletter", path: "/admin/newsletter", icon: Mail },
    { label: "Offers Management", path: "/admin/offers", icon: Tag },
    { label: "Settings", path: "/admin/settings", icon: Settings },
    { label: "Customer Home", path: "/customer/dashboard", icon: Store },
    { label: "Farmer Home", path: "/farmer/dashboard", icon: Tractor },
  ],
  guest: [
    { label: "Home", path: "/", icon: Store },
    { label: "Shop", path: "/shop", icon: ShoppingBag },
    { label: "Offers", path: "/shop?offers=true", icon: Tag },
    { label: "Farmers", path: "/farmers", icon: Tractor },
    { label: "About", path: "/about", icon: Store },
    { label: "Contact", path: "/contact", icon: MessageCircle },
  ],
};

export const roleLabels = {
  customer: "Customer",
  farmer: "Farmer",
  admin: "Administrator",
  guest: "Guest",
};

export function isCurrentPath(pathname, search, path) {
  const [targetPath, targetSearch] = path.split("?");
  const isOffersFilter = new URLSearchParams(search).get("offers") === "true";
  if (targetSearch && !isOffersFilter) return false;
  if (targetPath === "/shop" && !targetSearch && isOffersFilter) return false;
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const normalizedTargetPath = targetPath.replace(/\/+$/, "") || "/";
  return normalizedTargetPath === "/"
    ? normalizedPathname === "/"
    : normalizedPathname === normalizedTargetPath || normalizedPathname.startsWith(`${normalizedTargetPath}/`);
}
