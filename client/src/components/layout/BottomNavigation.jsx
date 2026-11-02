import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, Store, Package, ShoppingCart, Heart, Truck, User, Users, Tractor, Boxes, BarChart3, Tag, MessageCircle } from "lucide-react";

const bottomNavByRole = {
  customer: [
    { label: "Home", path: "/", icon: Store },
    { label: "Shop", path: "/shop", icon: Store },
    { label: "Offers", path: "/shop?offers=true", icon: Tag },
    { label: "About", path: "/about", icon: MessageCircle },
    { label: "Farmers", path: "/farmers", icon: Tractor },
    { label: "Contact", path: "/contact", icon: MessageCircle },
  ],
  farmer: [
    { label: "Dashboard", path: "/farmer/dashboard", icon: LayoutDashboard },
    { label: "Customer Home", path: "/customer/dashboard", icon: Store },
    { label: "My Products", path: "/farmer/products", icon: Package },
    { label: "Orders", path: "/farmer/orders", icon: ShoppingCart },
    { label: "Inventory", path: "/farmer/inventory-management", icon: Boxes },
    { label: "Notifications", path: "/farmer/notifications", icon: User },
    { label: "Profile", path: "/farmer/profile", icon: User },
    { label: "Logout", path: "/logout", icon: LogOut, isAction: true },
  ],
  admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Products", path: "/admin/products", icon: Boxes },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Farmers", path: "/admin/farmers", icon: Tractor },
    { label: "Orders", path: "/admin/orders", icon: ShoppingCart },
    { label: "Inventory", path: "/admin/inventory", icon: Boxes },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { label: "Logout", path: "/logout", icon: LogOut, isAction: true },
  ],
};

function isActive(pathname, path) {
  return path === "/"
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
}

export default function BottomNavigation({ role = "customer", color = "green" }) {
  const { pathname } = useLocation();
  const items = bottomNavByRole[role] || bottomNavByRole.customer;

  const bgColor = color === "green" ? "bg-[#064B35] border-t border-[#064B35]" : "bg-white border-t border-gray-200";
  const textColor = color === "green" ? "text-white" : "text-gray-700";
  const activeBg = color === "green" ? "bg-[#08764B]" : "bg-gray-50";
  const activeText = color === "green" ? "text-white" : "text-primary";
  const hoverBg = color === "green" ? "hover:bg-white/10" : "hover:bg-gray-100";
  const iconColor = color === "green" ? "text-white/85" : "text-gray-600";

  return (
    <nav
      aria-label="Bottom navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 grid-cols-8 ${bgColor} pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden`}
    >
      {items.map(({ label, path, icon: Icon, isAction }) => {
        const active = isActive(pathname, path);
        const isLogout = isAction && label === "Logout";
        return (
          <Link
            key={path}
            to={path}
            aria-current={active ? "page" : undefined}
            title={label}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white ${
              active
                ? `${activeBg} font-semibold ${activeText}`
                : isLogout
                ? `${textColor} ${hoverBg}`
                : `${textColor} ${hoverBg}`
            }`}
          >
            <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${active ? activeText : iconColor}`} strokeWidth={1.6} />
            <span className={`text-[8px] leading-[1.1] ${active ? "font-bold" : "font-medium"} ${active ? activeText : textColor}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
