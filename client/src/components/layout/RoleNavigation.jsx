import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Boxes,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCircle,
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
  Mail,
} from "lucide-react";

const navigationByRole = {
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
    { label: "Login", path: "/login", icon: LogIn },
    { label: "Register", path: "/register", icon: User },
  ],
};

function isCurrentPath(pathname, search, path) {
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

export default function RoleNavigation({
  role = "guest",
  onNavigate,
  onLogout,
  tone = "dark",
  className = "",
  mobile = false,
  mobileDashboardOnly = false,
}) {
  const location = useLocation();
  const roleItems = navigationByRole[role] || navigationByRole.guest;
  const items = mobile && mobileDashboardOnly ? roleItems.slice(0, 1) : roleItems;
  const activeIndex = items.reduce((currentIndex, item, index) => {
    if (!isCurrentPath(location.pathname, location.search, item.path)) return currentIndex;
    if (currentIndex === -1) return index;
    const itemPathLength = item.path.split("?")[0].replace(/\/+$/, "").length;
    const currentPathLength = items[currentIndex].path.split("?")[0].replace(/\/+$/, "").length;
    return itemPathLength > currentPathLength ? index : currentIndex;
  }, -1);
  const isDark = tone === "dark";
  const linkStyle = isDark
    ? "text-white/85 hover:bg-white/10 focus-visible:outline-white"
    : "text-gray-700 hover:bg-emerald-50 focus-visible:outline-primary";
  const activeStyle = isDark ? "bg-[#08764B] font-semibold text-white" : "bg-emerald-50 font-semibold text-primary";

  return (
    <nav aria-label={`${role === "guest" ? "Guest" : role} navigation`} className={className}>
      {items.map(({ label, path, icon: Icon }, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={`${label}:${path}`}
            to={path}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center justify-start gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              mobile ? "h-[50px]" : "h-11"
            } ${
              active ? activeStyle : linkStyle
            }`}
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <Icon aria-hidden="true" className="h-full w-full" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </Link>
        );
      })}
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-[10px] px-3 text-left text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            mobile ? "h-[50px]" : "h-11"
          } ${linkStyle}`}
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          <span className="min-w-0 flex-1 truncate">Logout</span>
        </button>
      )}
    </nav>
  );
}
