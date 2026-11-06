import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Newspaper,
  Package,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
} from "lucide-react";

const links = [
  { label: "Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
  { label: "Shop", path: "/shop", icon: ShoppingBag },
  { label: "My Orders", path: "/customer/orders", icon: Package },
  { label: "Newsletters", path: "/customer/newsletters", icon: Newspaper },
  { label: "Cart", path: "/cart", icon: ShoppingCart },
  { label: "Wishlist", path: "/customer/wishlist", icon: Heart },
  { label: "Track Order", path: "/track-order", icon: Truck },
  { label: "Profile", path: "/customer/profile", icon: User },
];

function isActive(pathname, path) {
  return path === "/"
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
}

export default function CustomerMobileNavigation({ onLogout }) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Customer quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-8 border-t border-[#064B35] bg-[#064B35] pb-[env(safe-area-inset-bottom)] text-white lg:hidden"
    >
      {links.map(({ label, path, icon: Icon }) => {
        const active = isActive(pathname, path);
        return (
          <Link
            key={path}
            to={path}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-center text-[10px] leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white ${
              active ? "bg-[#08764B] font-semibold text-white" : "text-white/85 hover:bg-white/10"
            }`}
          >
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 max-w-full">{label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onLogout}
        className="flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-center text-[10px] leading-tight text-white/85 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white"
      >
        <LogOut aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.8} />
        <span className="min-w-0 max-w-full">Logout</span>
      </button>
    </nav>
  );
}
