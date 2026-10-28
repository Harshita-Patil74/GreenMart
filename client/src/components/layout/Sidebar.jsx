import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard, ShoppingBag, Package, ShoppingCart, Heart, Truck, User, LogOut,
  Boxes, Bell, Users, Tractor, BarChart3, Settings, Store,
} from "lucide-react";
import Logo from "../common/Logo.jsx";
import { logout } from "../../features/auth/authSlice.js";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const role = user?.role || "customer";
  const isFarmer = role === "farmer";
  const isCustomer = role === "customer";
  const isAdmin = role === "admin";
  const compactNavigation = isFarmer || isCustomer || isAdmin;
  const handleLogout = () => { dispatch(logout()); navigate("/login"); };

  const customerItems = [
    { label: "Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
    { label: "Shop", path: "/shop", icon: ShoppingBag },
    { label: "My Orders", path: "/customer/orders", icon: Package },
    { label: "Cart", path: "/cart", icon: ShoppingCart },
    { label: "Wishlist", path: "/customer/wishlist", icon: Heart },
    { label: "Track Order", path: "/track-order", icon: Truck },
    { label: "Profile", path: "/customer/profile", icon: User },
  ];
  const farmerItems = [
    { label: "Dashboard", path: "/farmer/dashboard", icon: LayoutDashboard },
    { label: "Customer Home", path: "/customer/dashboard", icon: Store },
    { label: "My Products", path: "/farmer/products", icon: Package },
    { label: "Orders", path: "/farmer/orders", icon: ShoppingBag },
    { label: "Inventory", path: "/farmer/inventory", icon: Boxes },
    { label: "Notifications", path: "/farmer/notifications", icon: Bell },
    { label: "Profile", path: "/farmer/profile", icon: User },
  ];
  const adminItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Products", path: "/admin/products", icon: Package },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Farmers", path: "/admin/farmers", icon: Tractor },
    { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
    { label: "Inventory", path: "/admin/inventory", icon: Boxes },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { label: "Reports", path: "/admin/reports", icon: BarChart3 },
    { label: "Settings", path: "/admin/settings", icon: Settings },
    { label: "Customer Home", path: "/customer/dashboard", icon: Store },
    { label: "Farmer Home", path: "/farmer/dashboard", icon: Tractor },
  ];
  const navItems = role === "admin" ? adminItems : role === "farmer" ? farmerItems : customerItems;

  return (
    <aside className={compactNavigation
      ? "fixed bottom-0 left-0 z-40 flex h-[68px] w-full shrink-0 flex-row bg-[#064B35] text-white md:sticky md:top-0 md:h-screen md:w-[176px] md:flex-col"
      : "flex min-h-screen w-[232px] shrink-0 flex-col justify-between bg-[#064B35] text-white"}>
      <div className={compactNavigation ? "h-full w-full md:h-auto md:w-auto" : ""}>
        <div className={compactNavigation ? "hidden px-4 py-5 md:block" : "px-5 py-5"}>
          <Logo dashboard subtitle={false} size={compactNavigation ? "sm" : "md"} />
        </div>
        <nav className={compactNavigation
          ? "flex h-full w-full items-center justify-start gap-0 overflow-x-auto px-1 md:mt-1 md:h-auto md:w-auto md:flex-col md:items-stretch md:justify-start md:gap-0 md:space-y-1 md:overflow-visible md:px-3"
          : "px-3 space-y-0.5 mt-1"}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.label === "Dashboard" && location.pathname.endsWith("/dashboard"));
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 h-[42px] rounded-[10px] text-[13.5px] font-medium ${
                  compactNavigation
                    ? `h-[52px] w-[60px] flex-none flex-col justify-center gap-0.5 px-1 text-center text-[8px] leading-tight md:h-[42px] md:w-auto md:flex-row md:justify-start md:gap-3 md:px-3 md:text-left md:text-[13px] ${isActive ? "bg-[#08764B] text-white" : "text-white/85 hover:bg-white/10"}`
                    : isActive ? "bg-[#08764B] text-white" : "text-white/85 hover:bg-white/10"
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0 md:w-[18px] md:h-[18px]" strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {compactNavigation && (
            <button
              onClick={handleLogout}
              className="flex h-[52px] w-[60px] flex-none flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 text-[8px] leading-tight text-white/85 hover:bg-white/10 md:hidden"
            >
              <LogOut className="h-[17px] w-[17px]" />
              <span>{!user && isCustomer ? "Login" : "Logout"}</span>
            </button>
          )}
        </nav>
      </div>
      <div className={compactNavigation ? "hidden p-3 md:mb-2 md:block" : "p-3 mb-2"}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 h-[42px] rounded-[10px] text-[13.5px] font-medium text-white/85 hover:bg-white/10"
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!user && isCustomer ? "Login" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
